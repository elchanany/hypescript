// זיכרון קצר-טווח בין שיחות: כשנפתחת שיחה חדשה, הסוכן מקבל 2-3 משפטים על
// מה קרה ב-5 השיחות הקודמות באותו פרויקט, כדי שהמשתמש לא יצטרך לחזור על
// הקשר שכבר נתן. דרישת יעילות קריטית מהבעלים: קריאת LLM אחת בלבד — cache-ed
// ב-ChatStoreV2.memorySummary ומחושבת מחדש רק כשה-fingerprint של המקורות משתנה.

import type { ChatItem, Conversation, MemorySummaryCache } from "./chatStore";
import { ChatMessage, Provider } from "./types";

const MAX_SOURCE_CONVERSATIONS = 5;
const MAX_ITEM_CHARS = 220;
const MAX_SUMMARY_CHARS = 600;

export interface MemorySource {
  title: string;
  text: string;
}

/** עד 5 השיחות האחרונות (לפי updatedAt) עם לפחות הודעת משתמש אחת, לא כולל השיחה הפעילה. */
export function pickMemorySourceConversations(conversations: Conversation[], excludeId: string): Conversation[] {
  return [...conversations]
    .filter((c) => c.id !== excludeId && (c.items || []).some((it) => it.kind === "user"))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_SOURCE_CONVERSATIONS);
}

function firstUserText(c: Conversation): string {
  const u = (c.items || []).find((it) => it.kind === "user") as Extract<ChatItem, { kind: "user" }> | undefined;
  return (u?.text || "").trim();
}

export function summarySourceFromConversation(c: Conversation): MemorySource {
  return { title: c.title || "שיחה", text: firstUserText(c).slice(0, MAX_ITEM_CHARS) };
}

/** טביעת-אצבע זולה של תוכן המקורות — לזיהוי "השיחות האלה השתנו" בלי לאחסן את כל התוכן. */
export function memorySourceFingerprint(sources: Conversation[]): string {
  return sources.map((c) => `${c.id}:${c.updatedAt}:${(c.items || []).length}`).join("|");
}

/** true אם אין cache תקף לחתימת המקורות הנוכחית — ואז (ורק אז) שווה לקרוא ל-LLM. */
export function memorySummaryNeedsRefresh(cache: MemorySummaryCache | undefined, sources: Conversation[]): boolean {
  if (!sources.length) return false; // אין שיחות קודמות בעלות תוכן — אין מה לסכם
  if (!cache) return true;
  return cache.fingerprint !== memorySourceFingerprint(sources);
}

export function buildMemorySummaryCache(text: string, sources: Conversation[]): MemorySummaryCache {
  return {
    text,
    sourceIds: sources.map((c) => c.id),
    fingerprint: memorySourceFingerprint(sources),
    generatedAt: Date.now(),
  };
}

export function memorySummaryPrompt(sources: MemorySource[]): ChatMessage[] | null {
  const clean = sources.filter((s) => s.text.trim());
  if (!clean.length) return null;
  const transcript = clean.map((s, i) => `${i + 1}. ${s.title}: ${s.text.replace(/\s+/g, " ")}`).join("\n");
  return [
    {
      role: "system",
      content:
        "אתה מסכם זיכרון-קצר לסוכן עריכת וידאו בעברית. סכם ב-2-3 משפטים בעברית מה המשתמש רצה/עשה בשיחות " +
        "הקודמות באותו פרויקט, כדי שסוכן שמתחיל שיחה חדשה יבין את ההקשר בלי לקרוא הכל. טקסט חופשי בלבד — " +
        "בלי כותרות, בלי רשימות, בלי Markdown.",
    },
    { role: "user", content: `שיחות קודמות בפרויקט:\n${transcript}` },
  ];
}

export function cleanMemorySummaryText(raw: string | null | undefined): string {
  return String(raw || "").trim().replace(/\s+/g, " ").slice(0, MAX_SUMMARY_CHARS);
}

/** קורא לשרת לסיכום. נכשל בשקט (מחזיר "") — אין זיכרון קצר לשיחה החדשה, לא חוסם כלום. */
export async function requestMemorySummary(
  sources: MemorySource[],
  opts?: { provider?: Provider },
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  try {
    const res = await fetchImpl("/api/agent/summary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sources, ...(opts?.provider ? { provider: opts.provider } : {}) }),
    });
    if (!res.ok) return "";
    const data = await res.json();
    return cleanMemorySummaryText(data?.summary);
  } catch {
    return "";
  }
}

export interface MemorySummaryRefreshDeps {
  conversations: Conversation[];
  activeId: string;
  cache?: MemorySummaryCache;
  /** מבצע את קריאת ה-LLM בפועל (מוזרק לבדיקות — לא נקרא כלל אם ה-cache תקף). */
  request: (sources: MemorySource[]) => Promise<string>;
}

/**
 * ה-orchestration המלא: בוחר מקורות, בודק cache, וקורא ל-LLM רק אם צריך.
 * מחזיר null כשאין שינוי (אין קריאה חדשה, אין עדכון) — כך ש-Chat.tsx יכול
 * להריץ את זה בכל פתיחת שיחה חדשה בלי לדאוג מכפילות.
 */
export async function refreshMemorySummary(deps: MemorySummaryRefreshDeps): Promise<MemorySummaryCache | null> {
  const sources = pickMemorySourceConversations(deps.conversations, deps.activeId);
  if (!memorySummaryNeedsRefresh(deps.cache, sources)) return null;
  const text = cleanMemorySummaryText(await deps.request(sources.map(summarySourceFromConversation)));
  if (!text) return null;
  return buildMemorySummaryCache(text, sources);
}
