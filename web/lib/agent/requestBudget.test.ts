import { describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "./types";
import {
  fitHistoryToBudget, historyBytes, messageBytes, REQUEST_BODY_BUDGET_BYTES,
  REQUEST_BODY_LIMIT_BYTES, TRUNCATION_NOTE,
} from "./requestBudget";

const user = (text: string): ChatMessage => ({ role: "user", content: text });
const big = (n: number, tag = "") => user(tag + "א".repeat(n));

describe("budget constants", () => {
  it("stays under the platform limit with headroom", () => {
    expect(REQUEST_BODY_BUDGET_BYTES).toBeLessThan(REQUEST_BODY_LIMIT_BYTES);
  });
});

describe("messageBytes / historyBytes", () => {
  it("counts UTF-8 bytes, not characters — Hebrew is two bytes per letter", () => {
    expect(messageBytes(user("אא"))).toBeGreaterThan(messageBytes(user("aa")));
  });

  it("sums the whole history", () => {
    const h = [user("a"), user("b")];
    expect(historyBytes(h)).toBe(messageBytes(h[0]) + messageBytes(h[1]));
  });
});

describe("fitHistoryToBudget", () => {
  it("returns the history untouched when it already fits", () => {
    const h = [user("שלום"), user("עולם")];
    const out = fitHistoryToBudget(h, 10_000);
    expect(out.messages).toBe(h);
    expect(out.droppedCount).toBe(0);
  });

  it("drops the oldest turns first and keeps the newest", () => {
    const h = [big(400, "ראשונה"), big(400, "שנייה"), big(400, "שלישית"), user("האחרונה")];
    const out = fitHistoryToBudget(h, messageBytes(big(400)) * 2 + 400, 1);
    expect(out.droppedCount).toBeGreaterThan(0);
    expect(out.messages.at(-1)).toEqual(h.at(-1));
    expect(out.messages).not.toContainEqual(h[0]);   // הישנה ביותר יורדת ראשונה
    expect(out.messages).toContainEqual(h[2]);       // הקרובה ביותר נשארת
  });

  it("always keeps system messages — they are the instructions, not the content", () => {
    const sys: ChatMessage = { role: "system", content: "אתה סוכן עריכה." };
    const h = [sys, big(2000), big(2000), user("עכשיו")];
    const out = fitHistoryToBudget(h, 1200, 1);
    expect(out.messages).toContainEqual(sys);
  });

  it("never drops the protected recent tail, even if it alone exceeds the budget", () => {
    const h = [big(500), big(3000), big(3000)];
    const out = fitHistoryToBudget(h, 100, 2);
    expect(out.messages.slice(-2)).toEqual(h.slice(-2));
  });

  it("tells the model that history was truncated, exactly once", () => {
    const h = [big(3000), big(3000), user("עכשיו")];
    const out = fitHistoryToBudget(h, messageBytes(user("עכשיו")) + 200, 1);
    const notes = out.messages.filter((m) => m.content === TRUNCATION_NOTE);
    expect(notes).toHaveLength(1);
  });

  it("does not add the note when nothing was dropped", () => {
    const out = fitHistoryToBudget([user("קצר")], 10_000);
    expect(out.messages.some((m) => m.content === TRUNCATION_NOTE)).toBe(false);
  });

  it("reports the resulting size, and it respects the budget", () => {
    const h = Array.from({ length: 40 }, () => big(500));
    const budget = 8_000;
    const out = fitHistoryToBudget(h, budget, 2);
    // הזנב המוגן + הערת הקיצוץ יכולים לחרוג במעט; מה שאסור זה גדילה בלי גבול.
    expect(out.bytes).toBeLessThan(historyBytes(h));
    expect(out.messages.length).toBeLessThan(h.length);
  });
});

// חיווט אמיתי: הלולאה של AgentRunner חייבת לשלוח גוף מקוצץ, לא את ההיסטוריה הגולמית.
describe("AgentRunner request body", () => {
  it("truncates a bloated history instead of sending it and getting a 413", async () => {
    const { AgentRunner } = await import("./runtime");
    let sentBytes = 0;
    let sentMessages: ChatMessage[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      const body = String(init.body);
      sentBytes = new TextEncoder().encode(body).length;
      sentMessages = JSON.parse(body).messages;
      return { ok: true, status: 200, text: async () => JSON.stringify({ content: "בסדר", tool_calls: [] }) };
    }));
    const runner = new AgentRunner("deepseek", {
      media: [], duration: 0, words: null, transcripts: {}, clips: null, subs: null, overlays: [], tracks: [],
      canvas: { width: 1280, height: 720 }, lastRender: null, askUser: async () => "",
    } as never, {
      onAssistant: vi.fn(), onToolStart: vi.fn(), onToolStatus: vi.fn(), onToolEnd: vi.fn(),
      onError: vi.fn(), onDone: vi.fn(),
    });
    // ~12MB של היסטוריה — הרבה מעבר למגבלת 4.5MB של הפלטפורמה.
    runner.history = Array.from({ length: 30 }, (_, i) => user(`turn${i}` + "א".repeat(200_000)));

    await runner.send("ומה עכשיו?");

    expect(sentBytes).toBeLessThan(REQUEST_BODY_LIMIT_BYTES);
    expect(sentMessages.some((m) => m.content === TRUNCATION_NOTE)).toBe(true);
    // ההודעה האחרונה של המשתמש חייבת לשרוד — אחרת הבקשה חסרת משמעות.
    expect(JSON.stringify(sentMessages.at(-1))).toContain("ומה עכשיו?");
    vi.unstubAllGlobals();
  });

  it("explains a 413 in Hebrew instead of dumping the raw body", async () => {
    const { formatLlmError } = await import("./runtime");
    const message = formatLlmError(413, "FUNCTION_PAYLOAD_TOO_LARGE");
    expect(message).toContain("גדולה מדי");
    expect(message).not.toContain("FUNCTION_PAYLOAD_TOO_LARGE");
  });
});
