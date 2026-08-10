// OpenAI GPT Image — עזרי שרת טהורים (ניתנים לבדיקה בלי רשת).
// המפתח נשאר ב-env בלבד; כאן רק אימות/בניית בקשה/פענוח תשובה וניסוח שגיאות בעברית.

export const OPENAI_IMAGE_MODELS = ["gpt-image-1"] as const;
export const OPENAI_IMAGE_SIZES = ["1024x1024", "1536x1024", "1024x1536"] as const;
export const OPENAI_IMAGE_QUALITIES = ["auto", "low", "medium", "high"] as const;
export const OPENAI_IMAGE_BACKGROUNDS = ["auto", "opaque", "transparent"] as const;

export const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-1";
export const DEFAULT_OPENAI_IMAGE_SIZE = "1024x1024";
export const DEFAULT_OPENAI_IMAGE_QUALITY = "auto";
export const DEFAULT_OPENAI_IMAGE_BACKGROUND = "auto";
export const MAX_IMAGE_PROMPT_CHARS = 4000;

export const OPENAI_IMAGES_BASE = "https://api.openai.com/v1";

export interface OpenAIImageRequest {
  prompt: string;
  model: string;
  size: string;
  quality: string;
  background: string;
}

export type ParseImageResult =
  | { ok: true; value: OpenAIImageRequest }
  | { ok: false; error: string };

const includes = <T extends readonly string[]>(list: T, value: string): boolean =>
  (list as readonly string[]).includes(value);

/** אימות/נורמליזציה של בקשת תמונה — פונקציה טהורה, בלי גישה ל-env/רשת. */
export function parseImageRequest(body: unknown): ParseImageResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "גוף הבקשה אינו תקין." };
  }
  const b = body as Record<string, unknown>;

  const prompt = typeof b.prompt === "string" ? b.prompt.trim() : "";
  if (!prompt) return { ok: false, error: "חסר prompt לתיאור התמונה." };
  if (prompt.length > MAX_IMAGE_PROMPT_CHARS) {
    return {
      ok: false,
      error: `התיאור ארוך מדי (${prompt.length} תווים; מקסימום ${MAX_IMAGE_PROMPT_CHARS} לבקשה אחת).`,
    };
  }

  const model = typeof b.model === "string" && b.model.trim() ? b.model.trim() : DEFAULT_OPENAI_IMAGE_MODEL;
  if (!includes(OPENAI_IMAGE_MODELS, model)) {
    return { ok: false, error: `מודל תמונה לא נתמך: ${model}.` };
  }

  const size = typeof b.size === "string" && b.size.trim() ? b.size.trim() : DEFAULT_OPENAI_IMAGE_SIZE;
  if (!includes(OPENAI_IMAGE_SIZES, size)) {
    return { ok: false, error: `גודל לא נתמך: ${size}.` };
  }

  const quality = typeof b.quality === "string" && b.quality.trim() ? b.quality.trim() : DEFAULT_OPENAI_IMAGE_QUALITY;
  if (!includes(OPENAI_IMAGE_QUALITIES, quality)) {
    return { ok: false, error: `איכות לא נתמכת: ${quality}.` };
  }

  const background = typeof b.background === "string" && b.background.trim() ? b.background.trim() : DEFAULT_OPENAI_IMAGE_BACKGROUND;
  if (!includes(OPENAI_IMAGE_BACKGROUNDS, background)) {
    return { ok: false, error: `רקע לא נתמך: ${background}.` };
  }

  return { ok: true, value: { prompt, model, size, quality, background } };
}

/**
 * גוף הבקשה הרשמי ל-`POST /v1/images/generations`.
 * מודלי GPT Image (gpt-image-1) אינם תומכים ב-`response_format` — הם מחזירים
 * תמיד `b64_json`; `output_format="png"` מבקש פורמט PNG (ברירת המחדל של המודל).
 */
export function buildImagePayload(req: OpenAIImageRequest): Record<string, unknown> {
  return {
    model: req.model,
    prompt: req.prompt,
    n: 1,
    size: req.size,
    quality: req.quality,
    background: req.background,
    output_format: "png",
  };
}

/** מסיר מפתחות/סודות מהטקסט לפני החזרה ללקוח — לעולם לא מחזירים/מדפיסים מפתח. */
export function redactSecrets(text: string): string {
  return text.replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-***");
}

/** הודעות שגיאה בעברית לפי סטטוס HTTP — מנוקות מסודות. */
export function openaiImageErrorHe(status: number, body: string): string {
  const snippet = redactSecrets(body.slice(0, 300));
  switch (status) {
    case 401:
      return "מפתח OpenAI חסר, שגוי או שפג תוקפו. בדוק OPENAI_API_KEY ב-Vercel או ב-web/.env.local.";
    case 403:
      return "אין הרשאה ל-OpenAI Images עם המפתח הנוכחי.";
    case 429:
      return "חריגה ממכסה/קצב של OpenAI Images — נסה שוב בעוד רגע.";
    case 400:
      return `בקשת התמונה נדחתה: ${snippet}`;
    default:
      if (status >= 500) return `תקלה זמנית ב-OpenAI Images (${status}).`;
      return `שגיאת OpenAI Images (${status}): ${snippet}`;
  }
}

/**
 * מפענח את התמונה הראשונה מ-`data[0].b64_json` (מודלי GPT Image מחזירים תמיד
 * b64_json, ללא `response_format`). null אם אין תמונה תקינה.
 * הפלט הוא תמיד PNG — כך גם ה-Content-Type של התשובה.
 */
export function decodeFirstImage(data: unknown): { bytes: Uint8Array<ArrayBuffer>; mime: "image/png" } | null {
  const item = Array.isArray((data as { data?: unknown })?.data) ? (data as { data: unknown[] }).data[0] : null;
  if (!item || typeof item !== "object") return null;
  const b64 = typeof (item as { b64_json?: unknown }).b64_json === "string" ? (item as { b64_json: string }).b64_json : "";
  if (!b64) return null;
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { bytes, mime: "image/png" };
  } catch {
    return null;
  }
}