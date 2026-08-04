// לולאת הסוכן (צד-לקוח): שולחת שיחה+כלים ל-/api/agent, מבצעת את קריאות הכלים
// (במקביל — כך "בזמן שהתמלול רץ אפשר לעשות עוד"), ומחזירה תוצאות ל-LLM עד שסיים.
// כל כלי רץ עם timeout + AbortSignal — לא נתקע לנצח.

import { AgentMode, ChatMessage, Provider, ToolCall } from "./types";
import { AgentContext, MODE_PROMPTS, SYSTEM_PROMPT, TOOL_BY_NAME, TOOL_SCHEMAS } from "./tools";
import { repairToolMessages } from "./normalize";
import {
  LLM_CALL_TIMEOUT_MS,
  toolTimeoutMs,
  withTimeoutSignal,
} from "./timeout";

export interface AgentEvents {
  onAssistant: (text: string) => void;
  onToolStart: (call: ToolCall, meta?: { serviceLabel?: string }) => void;
  onToolStatus: (id: string, status: string, serviceLabel?: string) => void;
  onToolEnd: (id: string, ok: boolean, summary: string) => void;
  onError: (msg: string) => void;
  onDone: () => void;
}

const MAX_ITERS = 40;

/** כלים שאסור להריץ בלולאה — אחרי N קריאות בחלון האחרון נחסמים עם רמז לכלי המוני. */
const LOOP_GUARDS: Record<string, { limit: number; hint: string }> = {
  delete_clip: {
    limit: 3,
    hint: "נחסם: יותר מדי delete_clip. השתמש ב-delete_clips (indices/from_index+to_index) או keep_source_range או clear_clips.",
  },
  edit_subtitle: {
    limit: 4,
    hint: "נחסם: יותר מדי edit_subtitle. נקה עם clear_subtitles והרץ generate_subtitles(script=טקסט נקי) מחדש.",
  },
  delete_subtitle: {
    limit: 3,
    hint: "נחסם: יותר מדי מחיקות כתוביות בודדות. השתמש ב-clear_subtitles.",
  },
  list_clips: {
    limit: 4,
    hint: "נחסם: list_clips חוזר על עצמו. תכנן פעם אחת ובצע — אל תבדוק אחרי כל שינוי קטן.",
  },
  get_transcript: {
    limit: 3,
    hint: "נחסם: כבר קראת תמלול כמה פעמים. המשך לעריכה (keep_by_script / generate_subtitles).",
  },
};

const WINDOW = 12;

function isChunkLoadError(msg: string): boolean {
  return /Loading chunk\s+[\w.-]+\s+failed|ChunkLoadError|error loading dynamically imported module/i.test(msg);
}

function formatToolError(msg: string): string {
  if (isChunkLoadError(msg)) {
    return "שגיאת טעינה (גרסה חדשה בדפדפן / chunk). בקש מהמשתמש לרענן Ctrl+Shift+R — אל תנסה שוב בלי רענון.";
  }
  if (/Failed to fetch|NetworkError|network/i.test(msg)) {
    return `שגיאת רשת: ${msg}. אם זה חוזר — רענון דף או בדיקת חיבור.`;
  }
  if (/נתקע|timeout|נעצר אחרי/i.test(msg)) {
    return msg.startsWith("שגיאה:") ? msg : `שגיאה: ${msg}`;
  }
  return `שגיאה: ${msg}`;
}

function formatLlmError(status: number, body: string): string {
  const lower = body.toLowerCase();
  if (status === 503 || /service.?unavailable|too busy|overloaded/i.test(lower)) {
    return "הספק עמוס (503). נסה שוב בעוד רגע, או החלף מודל/ספק בהגדרות הצ'אט.";
  }
  if (status === 429 || /rate.?limit/i.test(lower)) {
    return "חריגת קצב (429). המתן מעט ונסה שוב.";
  }
  return body.slice(0, 200) || `שגיאת סוכן (HTTP ${status})`;
}

export class AgentRunner {
  history: ChatMessage[] = [];
  // מצב הסוכן. ask/plan אינם מקבלים כלים -> אינם יכולים לשנות את הפרויקט.
  mode: AgentMode = "act";
  private stopped = false;
  private running = false;
  private currentAbort: AbortController | null = null;
  /** Controllers for in-flight tools — stop() aborts them all. */
  private toolAborts = new Set<AbortController>();
  private injected: string[] = [];
  /** היסטוריית שמות כלים אחרונים לאכיפת אנטי-לופ */
  private recentTools: string[] = [];

  // הזרקת הודעת משתמש תוך כדי ריצה — הסוכן יקרא אותה בתחילת האיטרציה הבאה.
  injectMessage(text: string) {
    this.injected.push(text);
  }

  constructor(
    public provider: Provider,
    private ctx: AgentContext,
    private events: AgentEvents,
  ) {}

  get isRunning() {
    return this.running;
  }

  stop() {
    this.stopped = true;
    this.currentAbort?.abort();
    for (const c of this.toolAborts) c.abort();
    this.toolAborts.clear();
  }

  private guardLoop(name: string): string | null {
    const guard = LOOP_GUARDS[name];
    if (!guard) return null;
    const window = this.recentTools.slice(-WINDOW);
    const count = window.filter((n) => n === name).length;
    if (count + 1 > guard.limit) return guard.hint;
    return null;
  }

  private noteTool(name: string) {
    this.recentTools.push(name);
    if (this.recentTools.length > 40) this.recentTools.splice(0, this.recentTools.length - 40);
  }

  async send(userText: string): Promise<void> {
    this.history.push({ role: "user", content: userText });
    this.stopped = false;
    this.running = true;
    this.recentTools = [];
    try {
      for (let iter = 0; iter < MAX_ITERS; iter++) {
        if (this.stopped) {
          this.events.onAssistant("⏹ המשימה נעצרה.");
          break;
        }
        if (this.injected.length) {
          for (const m of this.injected.splice(0)) this.history.push({ role: "user", content: m });
        }
        this.history = repairToolMessages(this.history);
        const media = this.ctx.media || [];
        const mediaNote = media.length
          ? "מדיה זמינה כרגע:\n" + media.map((m, i) => `${i + 1}. ${m.name} (${m.kind}, ${m.duration.toFixed(1)}s)`).join("\n")
          : "עדיין לא נטענה מדיה.";
        const ctrl = new AbortController();
        this.currentAbort = ctrl;
        const to = setTimeout(() => ctrl.abort(), LLM_CALL_TIMEOUT_MS);
        const toolsForMode = this.mode === "act" ? TOOL_SCHEMAS : [];
        let data: any;
        try {
          const resp = await fetch("/api/agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: ctrl.signal,
            body: JSON.stringify({
              provider: this.provider,
              messages: [
                { role: "system", content: SYSTEM_PROMPT + MODE_PROMPTS[this.mode] },
                { role: "system", content: mediaNote },
                ...this.history,
              ],
              tools: toolsForMode,
            }),
          });
          const raw = await resp.text();
          try { data = JSON.parse(raw); }
          catch {
            const hint = raw.slice(0, 160).replace(/\s+/g, " ");
            if (resp.status === 503 || /too busy|service_unavailable/i.test(hint)) {
              this.events.onError("הספק עמוס (503). נסה שוב בעוד רגע או החלף מודל/ספק.");
            } else {
              this.events.onError(resp.ok
                ? `תשובת הסוכן אינה JSON תקין: ${hint || "(ריק)"}`
                : formatLlmError(resp.status, hint || "ללא פירוט"));
            }
            break;
          }
          if (!resp.ok) {
            this.events.onError(formatLlmError(resp.status, data.error || data.message || JSON.stringify(data).slice(0, 200)));
            break;
          }
        } catch (e: any) {
          if (this.stopped) { this.events.onAssistant("⏹ נעצר."); break; }
          const msg = e?.message || "שגיאת רשת.";
          if (e?.name === "AbortError") {
            this.events.onError(
              `הסוכן נתקע (timeout ${LLM_CALL_TIMEOUT_MS / 1000}s על קריאת ה-LLM לספק). נסה שוב או החלף ספק.`,
            );
          } else if (isChunkLoadError(msg)) {
            this.events.onError("שגיאת טעינה (chunk). רענן את הדף ב-Ctrl+Shift+R ואז שלח שוב.");
          } else if (/Failed to fetch/i.test(msg)) {
            this.events.onError("Failed to fetch — בעיית רשת או שהספק לא זמין. נסה שוב או רענן.");
          } else {
            this.events.onError(msg);
          }
          break;
        } finally { clearTimeout(to); this.currentAbort = null; }
        if (this.stopped) { this.events.onAssistant("⏹ נעצר."); break; }
        const content: string | null = data.content;
        const toolCalls: ToolCall[] = data.tool_calls || [];

        if (content) this.events.onAssistant(content);

        if (!toolCalls.length) {
          this.history.push({ role: "assistant", content });
          break;
        }

        this.history.push({ role: "assistant", content: content ?? null, tool_calls: toolCalls });

        const results = await Promise.all(
          toolCalls.map(async (tc) => {
            const meta = TOOL_BY_NAME[tc.name];
            this.events.onToolStart(tc, meta?.defaultService ? { serviceLabel: meta.defaultService } : undefined);
            if (!meta) {
              this.events.onToolEnd(tc.id, false, `כלי לא ידוע: ${tc.name}`);
              return { tool_call_id: tc.id, name: tc.name, content: `כלי לא ידוע: ${tc.name}` };
            }
            const blocked = this.guardLoop(tc.name);
            if (blocked) {
              this.noteTool(tc.name);
              this.events.onToolEnd(tc.id, false, blocked);
              return { tool_call_id: tc.id, name: tc.name, content: blocked };
            }
            this.noteTool(tc.name);

            const toolCtrl = new AbortController();
            this.toolAborts.add(toolCtrl);
            let lastPhase = "התחלה";
            const report = (status: string, serviceLabel?: string) => {
              lastPhase = status;
              this.events.onToolStatus(tc.id, status, serviceLabel);
            };

            const limit = toolTimeoutMs(tc.name);
            try {
              const out = await withTimeoutSignal(
                meta.run(tc.arguments, this.ctx, report, toolCtrl.signal),
                limit,
                meta.label || tc.name,
                toolCtrl.signal,
                () => lastPhase,
              );
              if (isChunkLoadError(out)) {
                const formatted = formatToolError(out);
                this.events.onToolEnd(tc.id, false, formatted);
                return { tool_call_id: tc.id, name: tc.name, content: formatted };
              }
              this.events.onToolEnd(tc.id, true, out);
              return { tool_call_id: tc.id, name: tc.name, content: out };
            } catch (e: any) {
              const msg = formatToolError(e?.message || String(e));
              this.events.onToolEnd(tc.id, false, msg);
              return { tool_call_id: tc.id, name: tc.name, content: msg };
            } finally {
              this.toolAborts.delete(toolCtrl);
            }
          }),
        );
        for (const r of results) {
          this.history.push({ role: "tool", tool_call_id: r.tool_call_id, name: r.name, content: r.content });
        }
        const imgs = this.ctx.pendingImages;
        if (imgs && imgs.length) {
          this.history.push({
            role: "user",
            content: [
              { type: "text", text: "הנה הפריימים שצולמו לבדיקה:" },
              ...imgs.map((u) => ({ type: "image_url" as const, image_url: { url: u } })),
            ],
          });
          imgs.length = 0;
        }
      }
    } finally {
      this.running = false;
      for (const c of this.toolAborts) c.abort();
      this.toolAborts.clear();
      this.events.onDone();
    }
  }
}
