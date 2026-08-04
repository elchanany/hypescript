// לולאת הסוכן (צד-לקוח): שולחת שיחה+כלים ל-/api/agent, מבצעת את קריאות הכלים
// ברצף (סנכרון חי לטיימליין + בלי מרוצי EDL), ומחזירה תוצאות ל-LLM עד שסיים.

import { AgentMode, ChatMessage, Provider, ToolCall } from "./types";
import { AgentContext, MODE_PROMPTS, SYSTEM_PROMPT, TOOL_BY_NAME, TOOL_SCHEMAS } from "./tools";
import { repairToolMessages } from "./normalize";

export interface AgentEvents {
  onAssistant: (text: string) => void;
  onToolStart: (call: ToolCall, provider: Provider) => void;
  onToolStatus: (id: string, status: string) => void;
  onToolEnd: (id: string, ok: boolean, summary: string) => void;
  onError: (msg: string) => void;
  onDone: () => void;
}

const MAX_ITERS = 40;
const CALL_TIMEOUT_MS = 120000;

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
    this.currentAbort?.abort(); // מבטל מיד את קריאת ה-LLM התלויה
  }

  private guardLoop(name: string): string | null {
    const guard = LOOP_GUARDS[name];
    if (!guard) return null;
    const window = this.recentTools.slice(-WINDOW);
    const count = window.filter((n) => n === name).length;
    // count כולל את הקריאה הנוכחית שעוד לא נדחפה — בודקים לפני דחיפה
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
        // הודעות שהמשתמש הזריק תוך כדי ריצה — נכנסות לשיחה לפני הפנייה הבאה.
        if (this.injected.length) {
          for (const m of this.injected.splice(0)) this.history.push({ role: "user", content: m });
        }
        // תיקון היסטוריה (כולל שמורה/שנקטעה) לפני כל פנייה: כל tool_call חייב
        // tool result תואם, אחרת הספק מחזיר 400. idempotent.
        this.history = repairToolMessages(this.history);
        const media = this.ctx.media || [];
        const mediaNote = media.length
          ? "מדיה זמינה כרגע:\n" + media.map((m, i) => `${i + 1}. ${m.name} (${m.kind}, ${m.duration.toFixed(1)}s)`).join("\n")
          : "עדיין לא נטענה מדיה.";
        const ctrl = new AbortController();
        this.currentAbort = ctrl;
        const to = setTimeout(() => ctrl.abort(), CALL_TIMEOUT_MS);
        // אכיפת מצב: ב-ask/plan לא מעבירים כלים כלל, לכן אין אפשרות לשנות את הפרויקט.
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
            this.events.onError("הסוכן נתקע (timeout על קריאת ה-LLM). נסה שוב.");
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
          break; // אין קריאות כלים -> הסוכן סיים
        }

        this.history.push({ role: "assistant", content: content ?? null, tool_calls: toolCalls });

        // ביצוע קריאות הכלים ברצף — כדי ששינויי EDL יופיעו מיד ובסדר על הטיימליין
        // (מקביליות שוברת סנכרון חי ויוצרת מרוצי כתיבה על ctx)
        const results: { tool_call_id: string; name: string; content: string }[] = [];
        for (const tc of toolCalls) {
          const meta = TOOL_BY_NAME[tc.name];
          this.events.onToolStart(tc, this.provider);
          if (!meta) {
            this.events.onToolEnd(tc.id, false, `כלי לא ידוע: ${tc.name}`);
            results.push({ tool_call_id: tc.id, name: tc.name, content: `כלי לא ידוע: ${tc.name}` });
            continue;
          }
          const blocked = this.guardLoop(tc.name);
          if (blocked) {
            this.noteTool(tc.name);
            this.events.onToolEnd(tc.id, false, blocked);
            results.push({ tool_call_id: tc.id, name: tc.name, content: blocked });
            continue;
          }
          this.noteTool(tc.name);
          try {
            const out = await meta.run(tc.arguments, this.ctx, (s) => this.events.onToolStatus(tc.id, s));
            if (isChunkLoadError(out)) {
              const formatted = formatToolError(out);
              this.events.onToolEnd(tc.id, false, formatted);
              results.push({ tool_call_id: tc.id, name: tc.name, content: formatted });
            } else {
              this.events.onToolEnd(tc.id, true, out);
              results.push({ tool_call_id: tc.id, name: tc.name, content: out });
            }
          } catch (e: any) {
            const msg = formatToolError(e?.message || String(e));
            this.events.onToolEnd(tc.id, false, msg);
            results.push({ tool_call_id: tc.id, name: tc.name, content: msg });
          }
          if (this.stopped) break;
        }
        for (const r of results) {
          this.history.push({ role: "tool", tool_call_id: r.tool_call_id, name: r.name, content: r.content });
        }
        // פריימים שצולמו -> הודעת-תמונה לתור הבא (הסוכן "יראה" בספק תומך-ראייה).
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
      this.events.onDone();
    }
  }
}
