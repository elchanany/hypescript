// לולאת הסוכן (צד-לקוח): שולחת שיחה+כלים ל-/api/agent, מבצעת את קריאות הכלים
// (במקביל — כך "בזמן שהתמלול רץ אפשר לעשות עוד"), ומחזירה תוצאות ל-LLM עד שסיים.

import { AgentMode, AgentUsage, ChatMessage, Provider, ToolCall } from "./types";
import {
  AgentContext, MODE_PROMPTS, PLAN_TOOL_NAMES, PLAN_TOOL_SCHEMAS, SYSTEM_PROMPT, TOOL_BY_NAME, TOOL_SCHEMAS,
  type ToolArtifact, type ToolRunResult,
} from "./tools";
import { repairToolMessages } from "./normalize";
import { fitHistoryToBudget } from "./requestBudget";
import type { EditorSnapshot } from "@/hooks/useEditor";

export interface AgentEvents {
  onAssistant: (text: string, mode: AgentMode, meta?: { provider: Provider; model?: string; providerMode?: "managed" | "byok" }) => void;
  onToolStart: (call: ToolCall, provider: Provider) => void;
  onToolStatus: (id: string, status: string) => void;
  onToolEnd: (id: string, ok: boolean, summary: string) => void;
  onError: (msg: string) => void;
  onDone: () => void;
  onUsage?: (usage: AgentUsage, provider: Provider, model?: string) => void;
  onCheckpoint?: (call: ToolCall, snapshot: EditorSnapshot) => void;
  onArtifact?: (artifact: ToolArtifact, call: ToolCall) => void;
  /**
   * המודל ניסה להריץ כלי שהמצב הנוכחי חוסם (Ask: הכל, Plan: כל מה שאינו
   * קריאה-בלבד). ה-runtime כבר חסם את הקריאה בפועל — זה רק ל-UI, כדי להציג
   * כפתור מעבר-מצב במקום להשאיר את המשתמש עם שגיאת כלי סתומה.
   */
  onModeBlocked?: (call: ToolCall, mode: AgentMode) => void;
}

export function normalizeToolResult(result: ToolRunResult): { text: string; artifacts: ToolArtifact[] } {
  if (typeof result === "string") return { text: result, artifacts: [] };
  const artifacts = (result.artifacts || []).filter((artifact) =>
    artifact?.blob instanceof Blob && !!artifact.name && !!artifact.kind,
  );
  return { text: String(result.text || ""), artifacts };
}

const MAX_ITERS = 40;
const CALL_TIMEOUT_MS = 120000;
const MUTATING_TOOLS = new Set([
  "keep_by_script", "remove_segments", "add_clip", "split_clip", "trim_clip", "move_clip",
  "delete_clip", "delete_clips", "clear_clips", "keep_source_range", "remove_silence",
  "set_clip_enabled", "set_clip_volume", "set_clip_opacity", "set_clip_color", "add_video_track", "remove_video_track",
  "rename_track", "set_track_locked", "set_track_muted", "set_track_height", "reorder_track",
  "move_clip_to_track", "generate_subtitles", "edit_subtitle", "delete_subtitle",
  "clear_subtitles", "retime_subtitle", "import_srt", "add_text_overlay", "update_overlay",
"add_image_overlay", "delete_overlay", "generate_narration", "use_brand_asset", "generate_image",
]);

/** כלים שאסור להריץ בלולאה — אחרי N קריאות בחלון האחרון נחסמים עם רמז לכלי המוני. */
export const LOOP_GUARDS: Record<string, { limit: number; hint: string }> = {
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
  list_overlays: {
    limit: 2,
    hint: "נחסם: כבר אימתת שכבות פעמיים. אל תיכנס ללופ בדיקה; סיים או דווח על הבעיה.",
  },
  add_image_overlay: {
    limit: 2,
    hint: "נחסם: אין להוסיף שוב ושוב את אותה שכבה. השתמש ב-update_overlay פעם אחת לפי overlay_id או עצור.",
  },
  update_overlay: {
    limit: 3,
    hint: "נחסם: יותר מדי עדכוני שכבה. עצור ודווח במקום להזיז שכבות בלולאה.",
  },
  delete_overlay: {
    limit: 2,
    hint: "נחסם: יותר מדי מחיקות שכבה. אל תבנה מחדש קומפוזיציה קיימת.",
  },
  capture_frame: {
    limit: 2,
    hint: "נחסם: כבר צולמו שני פריימים. אל תרנדר שוב בלי שינוי מהותי.",
  },
  render_video: {
    limit: 1,
    hint: "נחסם: ניסיון הייצוא כבר בוצע. דווח על הכשל; אל תרנדר בלולאה.",
  },
};

const WINDOW = 12;

function isChunkLoadError(msg: string): boolean {
  return /Loading chunk\s+[\w.-]+\s+failed|ChunkLoadError|error loading dynamically imported module/i.test(msg);
}

export function formatToolError(msg: string): string {
  if (isChunkLoadError(msg)) {
    return "שגיאת טעינה (גרסה חדשה בדפדפן / chunk). בקש מהמשתמש לרענן Ctrl+Shift+R — אל תנסה שוב בלי רענון.";
  }
  if (/מנוע הייצוא המקומי|FFmpeg/i.test(msg)) return `שגיאת ייצוא: ${msg}`;
  if (/Failed to fetch|NetworkError|network/i.test(msg)) {
    return `שגיאת רשת: ${msg}. אם זה חוזר — רענון דף או בדיקת חיבור.`;
  }
  return `שגיאה: ${msg}`;
}

export function agentLoopGuard(recent: string[], name: string): string | null {
  const guard = LOOP_GUARDS[name];
  if (!guard) return null;
  const window = recent.slice(-WINDOW);
  const count = window.filter((item) => item === name).length;
  return count + 1 > guard.limit ? guard.hint : null;
}

/**
 * אכיפת מצב ברמת ה-runtime (לא רק הנחיה למודל): Ask לא מריץ שום כלי, Plan
 * מריץ רק כלי-קריאה/בדיקה. גם אם ה-fetch יצא עם TOOL_SCHEMAS מלא (למשל
 * המצב הוחלף תוך כדי בקשה תלויה) — זו הבדיקה שבאמת מונעת הרצה.
 */
export function modeAllowsTool(mode: AgentMode, name: string): boolean {
  if (mode === "act") return true;
  if (mode === "plan") return PLAN_TOOL_NAMES.has(name);
  return false; // ask: שום כלי, גם לא קריאה-בלבד — ייעוץ בלבד.
}

const MODE_LABELS: Record<AgentMode, string> = { ask: "שאל", plan: "תכנן", act: "בצע" };

/** ההודעה שחוזרת ל-LLM (כתוצאת-כלי) וגם מוצגת למשתמש כשקריאה נחסמת לפי מצב. */
export function formatModeBlock(mode: AgentMode, toolName: string): string {
  if (mode === "ask") {
    return `נחסם: מצב "${MODE_LABELS.ask}" הוא ייעוץ בלבד ואינו מריץ כלים (כולל ${toolName}). אפשר להסביר ולהמליץ בטקסט; לביצוע בפועל המשתמש צריך לעבור למצב "${MODE_LABELS.plan}" או "${MODE_LABELS.act}".`;
  }
  return `נחסם: מצב "${MODE_LABELS.plan}" מריץ רק כלי קריאה/בדיקה — ${toolName} משנה את הפרויקט. הצע תוכנית וחכה לאישור; לביצוע בפועל המשתמש צריך לעבור למצב "${MODE_LABELS.act}".`;
}

export function formatLlmError(status: number, body: string): string {
  const lower = body.toLowerCase();
  if (status === 503 || /service.?unavailable|too busy|overloaded/i.test(lower)) {
    return "הספק עמוס (503). נסה שוב בעוד רגע, או החלף מודל/ספק בהגדרות הצ'אט.";
  }
  if (status === 429 || /rate.?limit/i.test(lower)) {
    return "חריגת קצב (429). המתן מעט ונסה שוב.";
  }
  // 413 = הבקשה גדולה מדי. השיחה מקוצצת אוטומטית לפני השליחה, אז אם זה בכל
  // זאת קרה — ההודעה האחרונה עצמה גדולה מדי. "נסה שוב" ישלח בדיוק את אותו
  // גוף וייכשל שוב, ולכן אסור להציג פה "נסה שוב" בלי הסבר.
  if (status === 413 || /payload too large|entity too large|too_large/i.test(lower)) {
    return "הבקשה גדולה מדי לשליחה. פתח שיחה חדשה (ההקשר יישמר בזיכרון הקצר), או קצר את ההודעה ואת מספר הפריימים שצירפת.";
  }
  return body.slice(0, 200) || `שגיאת סוכן (HTTP ${status})`;
}

/** כמה הודעות-פריים נשמרות בהיסטוריה. ישנות מהן מוחלפות בטקסט. */
export const MAX_IMAGE_MESSAGES = 2;

export const DROPPED_IMAGES_NOTE =
  "[פריימים קודמים הוסרו מההקשר כדי לא לנפח את הבקשה. צלם שוב אם צריך לראות אותם.]";

/**
 * משאיר רק את הודעות-הפריים האחרונות ומחליף את הישנות בטקסט.
 *
 * ההיסטוריה נשלחת במלואה בכל תור, אז כל פריים שנשאר בה משלם על עצמו שוב ושוב
 * עד שגוף הבקשה חוצה את מגבלת הפלטפורמה. ברגע שזה קורה גם ניסיון חוזר נכשל,
 * כי הוא שולח בדיוק את אותה היסטוריה — וזו שיחה שמתה בלי דרך חזרה.
 */
export function pruneImageMessages(history: ChatMessage[], keep = MAX_IMAGE_MESSAGES): ChatMessage[] {
  let seen = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const message = history[i];
    if (!Array.isArray(message.content)) continue;
    if (!message.content.some((part) => part?.type === "image_url")) continue;
    seen++;
    if (seen <= keep) continue;
    history[i] = { ...message, content: DROPPED_IMAGES_NOTE };
  }
  return history;
}

export class AgentRunner {
  history: ChatMessage[] = [];
  // מצב הסוכן. ask לא מקבל כלים כלל; plan מקבל רק כלי-קריאה (PLAN_TOOL_SCHEMAS);
  // שניהם אינם יכולים לשנות את הפרויקט — modeAllowsTool אוכף זאת גם אם הבקשה יצאה במצב אחר.
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
    // count אינו כולל את הקריאה הנוכחית, שעדיין לא נדחפה.
    return agentLoopGuard(this.recentTools, name);
  }

  private dropStaleImages() {
    pruneImageMessages(this.history);
  }

  private noteTool(name: string) {
    this.recentTools.push(name);
    if (this.recentTools.length > 40) this.recentTools.splice(0, this.recentTools.length - 40);
  }

  private async executeTool(tc: ToolCall, enforceLoopGuard = true) {
    const meta = TOOL_BY_NAME[tc.name];
    this.events.onToolStart(tc, this.provider);
    if (!meta) {
      const content = `כלי לא ידוע: ${tc.name}`;
      this.events.onToolEnd(tc.id, false, content);
      return { tool_call_id: tc.id, name: tc.name, content };
    }
    // חסימה אמיתית ברמת ה-runtime — לא רק הנחיה למודל. בודקים לפני checkpoint/
    // loop-guard כדי שקריאה חסומה לא תיצור checkpoint על מוטציה שלא קרתה.
    if (!modeAllowsTool(this.mode, tc.name)) {
      const content = formatModeBlock(this.mode, tc.name);
      this.noteTool(tc.name);
      this.events.onToolEnd(tc.id, false, content);
      this.events.onModeBlocked?.(tc, this.mode);
      return { tool_call_id: tc.id, name: tc.name, content };
    }
    if (MUTATING_TOOLS.has(tc.name)) {
      const snapshot = this.ctx.editorApi?.getSnapshot?.();
      if (snapshot) this.events.onCheckpoint?.(tc, {
        clips: snapshot.clips?.map((c) => ({ ...c })) || snapshot.clips,
        subs: snapshot.subs?.map((s) => ({ ...s })) || snapshot.subs,
        tracks: snapshot.tracks.map((t) => ({ ...t })),
        overlays: snapshot.overlays.map((o) => ({ ...o, transform: { ...o.transform } })),
      });
    }
    const blocked = enforceLoopGuard ? this.guardLoop(tc.name) : null;
    if (blocked) {
      this.noteTool(tc.name);
      this.events.onToolEnd(tc.id, false, blocked);
      return { tool_call_id: tc.id, name: tc.name, content: blocked };
    }
    this.noteTool(tc.name);
    try {
      const raw = await meta.run(tc.arguments, this.ctx, (s) => this.events.onToolStatus(tc.id, s));
      const out = normalizeToolResult(raw);
      if (isChunkLoadError(out.text)) {
        const formatted = formatToolError(out.text);
        this.events.onToolEnd(tc.id, false, formatted);
        return { tool_call_id: tc.id, name: tc.name, content: formatted };
      }
      const emitted = new Set<Blob>();
      for (const artifact of out.artifacts) {
        if (emitted.has(artifact.blob)) continue;
        emitted.add(artifact.blob);
        this.events.onArtifact?.(artifact, tc);
      }
      this.events.onToolEnd(tc.id, true, out.text);
      return { tool_call_id: tc.id, name: tc.name, content: out.text };
    } catch (e: any) {
      const msg = formatToolError(e?.message || String(e));
      this.events.onToolEnd(tc.id, false, msg);
      return { tool_call_id: tc.id, name: tc.name, content: msg };
    }
  }

  /** Retry אמיתי של אותה קריאת כלי, עם אותם arguments, ושמירת פרוטוקול history תקין. */
  async retryTool(name: string, args: Record<string, any>): Promise<void> {
    if (this.running) throw new Error("הסוכן עדיין פועל");
    const call: ToolCall = { id: `retry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, name, arguments: { ...args } };
    this.running = true;
    this.stopped = false;
    try {
      this.history.push({ role: "assistant", content: null, tool_calls: [call] });
      const result = await this.executeTool(call, false);
      this.history.push({ role: "tool", tool_call_id: result.tool_call_id, name: result.name, content: result.content });
    } finally {
      this.running = false;
      this.events.onDone();
    }
  }

  async send(userText: string): Promise<void> {
    this.history.push({ role: "user", content: userText });
    this.stopped = false;
    this.running = true;
    this.recentTools = [];
    try {
      for (let iter = 0; iter < MAX_ITERS; iter++) {
        if (this.stopped) {
          this.events.onAssistant("⏹ נעצר על ידי המשתמש.", this.mode);
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
          ? "מדיה זמינה כרגע:\n" + media.map((m, i) => `${i + 1}. ${m.name} (${m.kind}, ${m.duration.toFixed(1)}s, id=${m.id}, mention=@media:${m.id})`).join("\n")
          : "עדיין לא נטענה מדיה.";
        // זיכרון קצר מ-cache (עד 5 שיחות קודמות באותו פרויקט) — קיים רק כשיש
        // מה לזכור; לא לצטט מילה-במילה, רק הקשר כדי לא לחזור על שאלות שכבר נענו.
        const memory = String(this.ctx.memorySummary || "").trim();
        const ctrl = new AbortController();
        this.currentAbort = ctrl;
        const to = setTimeout(() => ctrl.abort(), CALL_TIMEOUT_MS);
        // אכיפת מצב שלב 1: ask לא מקבל כלים כלל, plan מקבל רק PLAN_TOOL_SCHEMAS (קריאה/בדיקה).
        // שלב 2 (אכיפה אמיתית) הוא modeAllowsTool בתוך executeTool — גם אם הבקשה הזו יצאה
        // בזמן שהמצב היה אחר (למשל המשתמש עבר ל-ask תוך כדי שיחה שכבר בדרך).
        const toolsForMode = this.mode === "act" ? TOOL_SCHEMAS : this.mode === "plan" ? PLAN_TOOL_SCHEMAS : [];
        let data: any;
        try {
          const resp = await fetch("/api/agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: ctrl.signal,
            body: JSON.stringify({
              provider: this.provider,
              // ההיסטוריה נשלחת במלואה בכל תור, ולכן היא מקוצצת לתקציב *לפני*
              // השליחה. בלי זה שיחה ארוכה מגיעה ל-413 ואז גם ניסיון חוזר נכשל,
              // כי הוא שולח בדיוק את אותו גוף (B-22).
              messages: repairToolMessages(fitHistoryToBudget([
                { role: "system", content: SYSTEM_PROMPT + MODE_PROMPTS[this.mode] },
                ...(memory ? [{ role: "system" as const, content: `זיכרון קצר משיחות קודמות באותו פרויקט: ${memory}` }] : []),
                { role: "system", content: mediaNote },
                ...this.history,
              ]).messages),
              tools: toolsForMode,
            }),
          });
          const raw = await resp.text();
          try { data = JSON.parse(raw); }
          catch {
            const hint = raw.slice(0, 160).replace(/\s+/g, " ");
            if (resp.status === 503 || /too busy|service_unavailable/i.test(hint)) {
              this.events.onError("שירות העריכה החכם עמוס. נסה שוב בעוד רגע.");
            } else {
              this.events.onError(resp.ok
                ? `תשובת הסוכן אינה JSON תקין: ${hint || "(ריק)"}`
                : formatLlmError(resp.status, hint || "ללא פירוט"));
            }
            break;
          }
          if (data.providerMode === "byok" && data.usage) this.events.onUsage?.(data.usage, this.provider, data.model);
          if (!resp.ok) {
            this.events.onError(formatLlmError(resp.status, data.error || data.message || JSON.stringify(data).slice(0, 200)));
            break;
          }
        } catch (e: any) {
          if (this.stopped) { this.events.onAssistant("⏹ נעצר על ידי המשתמש.", this.mode); break; }
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
        if (this.stopped) { this.events.onAssistant("⏹ נעצר על ידי המשתמש.", this.mode); break; }
        const content: string | null = data.content;
        const toolCalls: ToolCall[] = data.tool_calls || [];

        if (content) this.events.onAssistant(content, this.mode, {
          provider: this.provider,
          model: data.providerMode === "byok" ? data.model : undefined,
          providerMode: data.providerMode,
        });

        if (!toolCalls.length) {
          this.history.push({ role: "assistant", content });
          break; // אין קריאות כלים -> הסוכן סיים
        }

        this.history.push({ role: "assistant", content: content ?? null, tool_calls: toolCalls });

        // כלים שמשנים state — בסדר סידרתי (מונע race על clips/tracks).
        // כלים לקריאה בלבד יכולים לרוץ במקביל.
        const results = toolCalls.some((tc) => MUTATING_TOOLS.has(tc.name))
          ? await (async () => {
              const out = [];
              for (const tc of toolCalls) out.push(await this.executeTool(tc));
              return out;
            })()
          : await Promise.all(toolCalls.map((tc) => this.executeTool(tc)));
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
          this.dropStaleImages();
        }
      }
    } finally {
      this.running = false;
      this.events.onDone();
    }
  }
}
