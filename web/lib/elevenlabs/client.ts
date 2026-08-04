/** עזרי שרת ל-ElevenLabs — המפתח נשאר ב-env בלבד, לא נחשף ללקוח. */

import { ELEVENLABS_API_BASE } from "./constants";

export function elevenLabsApiKey(): string | null {
  const key = (process.env.ELEVENLABS_API_KEY || "").trim();
  return key || null;
}

export function elevenLabsConfigured(): boolean {
  return !!elevenLabsApiKey();
}

/** הודעות שגיאה בעברית לפי סטטוס HTTP */
export function elevenLabsErrorHe(status: number, body: string): string {
  const snippet = body.slice(0, 300);
  switch (status) {
    case 401:
      return `מפתח ElevenLabs חסר, שגוי או שפג תוקפו. בדוק ELEVENLABS_API_KEY. (${snippet})`;
    case 403:
      return `אין הרשאה ל-ElevenLabs (חסרה הרשאה במפתח או IP חסום). (${snippet})`;
    case 413:
      return `קובץ גדול מדי ל-ElevenLabs. (${snippet})`;
    case 422:
      return `פרמטרים לא תקינים בבקשה ל-ElevenLabs. (${snippet})`;
    case 429:
      return `חריגה ממכסה/קצב של ElevenLabs — נסה שוב בעוד רגע. (${snippet})`;
    default:
      if (status >= 500) return `תקלה זמנית ב-ElevenLabs (${status}). (${snippet})`;
      return `שגיאת ElevenLabs (${status}): ${snippet}`;
  }
}

export async function elevenLabsFetch(
  path: string,
  init: RequestInit & { apiKey?: string } = {},
): Promise<Response> {
  const apiKey = init.apiKey || elevenLabsApiKey();
  if (!apiKey) {
    throw new Error("חסר ELEVENLABS_API_KEY. הגדר אותו ב-Vercel או ב-web/.env.local.");
  }
  const headers = new Headers(init.headers || {});
  headers.set("xi-api-key", apiKey);
  // אל תדרוס Content-Type של FormData
  const { apiKey: _drop, ...rest } = init;
  return fetch(`${ELEVENLABS_API_BASE}${path}`, { ...rest, headers });
}
