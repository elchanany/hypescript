// כותרות שיחה אוטומטיות (בסגנון ChatGPT): קריאת LLM זולה אחת, אחרי ההודעה
// הראשונה בשיחה בלבד — לא בכל הודעה. ה-orchestration (פעם אחת, לא לדרוס שם
// ידני) יושב ב-chatStore.ts (titleGenerated); כאן רק הפרומפט, הניקוי וקריאת
// ה-API עצמם, כדי שאפשר יהיה לבדוק אותם בלי fetch אמיתי או React.

import { ChatMessage, Provider } from "./types";

const MAX_INPUT_CHARS = 500;
const MAX_TITLE_CHARS = 40;

export function titlePrompt(message: string): ChatMessage[] | null {
  const text = String(message || "").trim().slice(0, MAX_INPUT_CHARS);
  if (!text) return null;
  return [
    {
      role: "system",
      content:
        "אתה מייצר כותרות קצרות לשיחות בתוך עורך וידאו בעברית. החזר כותרת אחת בעברית, עד 5 מילים, " +
        "בלי מרכאות, בלי נקודה בסוף ובלי הסברים — רק הכותרת עצמה, שמסכמת את בקשת המשתמש.",
    },
    { role: "user", content: text },
  ];
}

export function cleanGeneratedTitle(raw: string | null | undefined): string {
  const t = String(raw || "")
    .trim()
    .replace(/^```[\s\S]*?\n?|```$/g, "")
    .replace(/^["'“”׳״]+|["'“”׳״]+$/g, "")
    .replace(/[.]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "";
  return t.length > MAX_TITLE_CHARS ? t.slice(0, MAX_TITLE_CHARS - 1) + "…" : t;
}

/**
 * האם מגיע הזמן ליצור כותרת אוטומטית: רק אחרי ההודעה הראשונה של המשתמש
 * בשיחה (userMessageCountBeforeSend === 0, כלומר לפני שההודעה הזו נדחפה),
 * ורק אם עדיין לא נוצרה כותרת (לא ע"י LLM ולא ע"י שינוי-שם ידני).
 */
export function shouldGenerateTitle(titleGenerated: boolean | undefined, userMessageCountBeforeSend: number): boolean {
  return !titleGenerated && userMessageCountBeforeSend === 0;
}

/** קורא לשרת ליצירת כותרת. נכשל בשקט (מחזיר "") — הכותרת ההיוריסטית הקיימת נשארת. */
export async function requestConversationTitle(
  message: string,
  opts?: { provider?: Provider },
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  try {
    const res = await fetchImpl("/api/agent/title", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, ...(opts?.provider ? { provider: opts.provider } : {}) }),
    });
    if (!res.ok) return "";
    const data = await res.json();
    return cleanGeneratedTitle(data?.title);
  } catch {
    return "";
  }
}
