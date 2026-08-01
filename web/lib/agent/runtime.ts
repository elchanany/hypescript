// לולאת הסוכן (צד-לקוח): שולחת שיחה+כלים ל-/api/agent, מבצעת את קריאות הכלים
// (במקביל — כך "בזמן שהתמלול רץ אפשר לעשות עוד"), ומחזירה תוצאות ל-LLM עד שסיים.

import { ChatMessage, Provider, ToolCall } from "./types";
import { AgentContext, SYSTEM_PROMPT, TOOL_BY_NAME, TOOL_SCHEMAS } from "./tools";

export interface AgentEvents {
  onAssistant: (text: string) => void;
  onToolStart: (call: ToolCall) => void;
  onToolStatus: (id: string, status: string) => void;
  onToolEnd: (id: string, ok: boolean, summary: string) => void;
  onError: (msg: string) => void;
  onDone: () => void;
}

const MAX_ITERS = 40;
const CALL_TIMEOUT_MS = 120000;

export class AgentRunner {
  history: ChatMessage[] = [];
  private stopped = false;
  private running = false;
  private currentAbort: AbortController | null = null;

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

  async send(userText: string): Promise<void> {
    this.history.push({ role: "user", content: userText });
    this.stopped = false;
    this.running = true;
    try {
      for (let iter = 0; iter < MAX_ITERS; iter++) {
        if (this.stopped) {
          this.events.onAssistant("⏹ המשימה נעצרה.");
          break;
        }
        const media = this.ctx.media || [];
        const mediaNote = media.length
          ? "מדיה זמינה כרגע:\n" + media.map((m, i) => `${i + 1}. ${m.name} (${m.kind}, ${m.duration.toFixed(1)}s)`).join("\n")
          : "עדיין לא נטענה מדיה.";
        const ctrl = new AbortController();
        this.currentAbort = ctrl;
        const to = setTimeout(() => ctrl.abort(), CALL_TIMEOUT_MS);
        let data: any;
        try {
          const resp = await fetch("/api/agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: ctrl.signal,
            body: JSON.stringify({
              provider: this.provider,
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "system", content: mediaNote },
                ...this.history,
              ],
              tools: TOOL_SCHEMAS,
            }),
          });
          data = await resp.json();
          if (!resp.ok) { this.events.onError(data.error || "שגיאת סוכן."); break; }
        } catch (e: any) {
          if (this.stopped) { this.events.onAssistant("⏹ נעצר."); break; }
          this.events.onError(e?.name === "AbortError" ? "הסוכן נתקע (timeout על קריאת ה-LLM). נסה שוב." : (e?.message || "שגיאת רשת."));
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

        // ביצוע קריאות הכלים במקביל
        const results = await Promise.all(
          toolCalls.map(async (tc) => {
            const meta = TOOL_BY_NAME[tc.name];
            this.events.onToolStart(tc);
            if (!meta) {
              this.events.onToolEnd(tc.id, false, `כלי לא ידוע: ${tc.name}`);
              return { tool_call_id: tc.id, name: tc.name, content: `כלי לא ידוע: ${tc.name}` };
            }
            try {
              const out = await meta.run(tc.arguments, this.ctx, (s) => this.events.onToolStatus(tc.id, s));
              this.events.onToolEnd(tc.id, true, out);
              return { tool_call_id: tc.id, name: tc.name, content: out };
            } catch (e: any) {
              const msg = e?.message || String(e);
              this.events.onToolEnd(tc.id, false, msg);
              return { tool_call_id: tc.id, name: tc.name, content: `שגיאה: ${msg}` };
            }
          }),
        );
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
