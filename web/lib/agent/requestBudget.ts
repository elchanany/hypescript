// תקציב גוף-הבקשה ל-/api/agent.
//
// למה: ההיסטוריה נשלחת *במלואה* בכל תור. שיחה ארוכה עם פלטי-כלים גדולים (או
// פריימים שצולמו) מנפחת את הגוף עד שהפלטפורמה עונה 413 —
// FUNCTION_PAYLOAD_TOO_LARGE. ברגע שזה קרה גם "נסה שוב" נכשל, כי הוא שולח
// בדיוק את אותה היסטוריה: השיחה מתה בלי דרך חזרה. זה הבאג שדווח כ-
// "request entity too large".
//
// המענה הוא תקציב שנאכף *לפני* השליחה: מקצצים את ההיסטוריה הישנה עד שהגוף
// נכנס, ומספרים למודל בטקסט שקוצץ — במקום להישלח ולקבל שגיאה סתומה.

import type { ChatMessage } from "./types";

/** מגבלת גוף הבקשה של Vercel Serverless היא 4.5MB. משאירים מרווח בטיחות. */
export const REQUEST_BODY_LIMIT_BYTES = 4.5 * 1024 * 1024;
export const REQUEST_BODY_BUDGET_BYTES = Math.floor(REQUEST_BODY_LIMIT_BYTES * 0.8);

export const TRUNCATION_NOTE =
  "[חלק מההיסטוריה המוקדמת של השיחה קוצץ כדי שהבקשה לא תחרוג ממגבלת הגודל. אם חסר לך הקשר — בקש מהמשתמש לחזור עליו.]";

/** גודל הודעה בבתים כפי שתישלח ב-JSON (UTF-8). */
export function messageBytes(message: ChatMessage): number {
  try {
    return new TextEncoder().encode(JSON.stringify(message)).length;
  } catch {
    return 0;
  }
}

export function historyBytes(messages: ChatMessage[]): number {
  return messages.reduce((sum, m) => sum + messageBytes(m), 0);
}

/**
 * מקצץ הודעות ישנות עד שההיסטוריה נכנסת לתקציב.
 *
 * כללים:
 * - הודעות מערכת נשמרות תמיד (הן ההנחיות, לא התוכן).
 * - מקצצים מהישן לחדש; ההודעות האחרונות הן ההקשר החשוב.
 * - `keepRecent` הודעות אחרונות אף פעם לא מקוצצות, גם אם הן לבדן חורגות —
 *   עדיף לשלוח ולקבל שגיאה מהספק מאשר לשלוח בקשה חסרת-משמעות.
 * - כשקוצצים בפועל, נדחפת הודעת-מערכת אחת שמסבירה למודל שהיה קיצוץ.
 *
 * זיווג assistant.tool_calls <-> tool אינו נשמר כאן בכוונה: הקורא מריץ
 * repairToolMessages על התוצאה, שהוא כבר המנגנון היחיד בקוד שאחראי לזה.
 */
export function fitHistoryToBudget(
  messages: ChatMessage[],
  budgetBytes = REQUEST_BODY_BUDGET_BYTES,
  keepRecent = 6,
): { messages: ChatMessage[]; droppedCount: number; bytes: number } {
  const total = historyBytes(messages);
  if (total <= budgetBytes) return { messages, droppedCount: 0, bytes: total };

  const protectedFrom = Math.max(0, messages.length - keepRecent);
  const kept: ChatMessage[] = [];
  let dropped = 0;
  let bytes = 0;

  // תחילה סוכמים את מה שחייב להישאר (system + הזנב האחרון).
  const mustKeep = messages.map((m, i) => m.role === "system" || i >= protectedFrom);
  messages.forEach((m, i) => { if (mustKeep[i]) bytes += messageBytes(m); });

  // ואז מוסיפים מהחדש לישן כל עוד נכנס.
  const optionalKeep = new Array<boolean>(messages.length).fill(false);
  for (let i = protectedFrom - 1; i >= 0; i--) {
    if (mustKeep[i]) continue;
    const size = messageBytes(messages[i]);
    if (bytes + size > budgetBytes) { dropped++; continue; }
    bytes += size;
    optionalKeep[i] = true;
  }

  messages.forEach((m, i) => { if (mustKeep[i] || optionalKeep[i]) kept.push(m); });
  if (dropped > 0) {
    const firstNonSystem = kept.findIndex((m) => m.role !== "system");
    const note: ChatMessage = { role: "system", content: TRUNCATION_NOTE };
    kept.splice(firstNonSystem < 0 ? kept.length : firstNonSystem, 0, note);
    bytes += messageBytes(note);
  }
  return { messages: kept, droppedCount: dropped, bytes };
}
