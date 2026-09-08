/**
 * כיוון ביצוע לקריינות ElevenLabs v3 — תגיות אודיו (audio tags) בתוך הטקסט.
 * מפרט: https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices
 *
 * עקרונות:
 * - תגיות בסוגריים מרובעים (למשל [sighs], [whispers]) — לא נאמרות כמילים.
 * - עברית דורשת model eleven_v3 + language_code=he (multilingual_v2 גרוע לעברית).
 * - אל תגזים: תגית אחת לרעיון, לא בכל מילה.
 * - אל תחקה פוליטיקאי אמיתי; בחר קול מקורי נייטרלי/סמכותי.
 */

/** תגיות מומלצות לקמפיין/תיעודי רציני (מאופק, לא מם). */
export const CAMPAIGN_DIRECTION_TAGS = [
  "quiet",
  "controlled",
  "disappointed",
  "firm",
  "sighs",
  "exhales",
  "sarcastic",
  "curious",
  "whispers",
] as const;

export type CampaignDirectionTag = (typeof CAMPAIGN_DIRECTION_TAGS)[number];

/** פריסטים רגשיים → תגית + הגדרות קול מומלצות ל-v3. */
export const NARRATION_EMOTION_PRESETS = {
  /** ביקורת מאופקת — ברירת מחדל לקמפיין פוליטי רציני */
  restrained_critical: {
    tag: "controlled" as const,
    stability: 0.35,
    style: 0.4,
    hintHe: "רגוע, סמכותי, מעט מאוכזב — בלי צעקות",
  },
  disappointed: {
    tag: "disappointed" as const,
    stability: 0.3,
    style: 0.45,
    hintHe: "מאוכזב בשקט",
  },
  firm: {
    tag: "firm" as const,
    stability: 0.4,
    style: 0.35,
    hintHe: "נחרץ אבל לא צועק",
  },
  quiet: {
    tag: "quiet" as const,
    stability: 0.45,
    style: 0.25,
    hintHe: "שקט, כמעט לוחש — לשיא או למשפט סיום",
  },
  decisive: {
    tag: "firm" as const,
    stability: 0.4,
    style: 0.5,
    hintHe: "מסכם בביטחון",
  },
} as const;

export type NarrationEmotion = keyof typeof NARRATION_EMOTION_PRESETS;

const TAG_RE = /^\s*\[[^\]]+\]\s*/;

/** האם הטקסט כבר מתחיל בתגית כיוון. */
export function hasLeadingDirectionTag(text: string): boolean {
  return TAG_RE.test(String(text || ""));
}

/**
 * מזריק תגית כיוון לתחילת הטקסט אם חסרה.
 * לא משנה את המילים עצמן — רק מוסיף [tag] לפניהן.
 */
export function applyDirectionTag(text: string, tag: string): string {
  const body = String(text || "").trim();
  if (!body) return "";
  const clean = String(tag || "").trim().replace(/^\[|\]$/g, "");
  if (!clean) return body;
  if (hasLeadingDirectionTag(body)) return body;
  return `[${clean}] ${body}`;
}

/**
 * בונה טקסט קריינות מוכן ל-eleven_v3 לפי פריסט רגש או תגית מפורשת.
 * emotion גובר על tag אם שניהם ניתנו? לא — tag מפורש גובר.
 */
export function buildDirectedNarrationText(
  text: string,
  opts: { emotion?: string | null; direction_tag?: string | null } = {},
): { text: string; stability?: number; style?: number; applied: string | null } {
  const body = String(text || "").trim();
  if (!body) return { text: "", applied: null };

  const explicit = opts.direction_tag ? String(opts.direction_tag).trim().replace(/^\[|\]$/g, "") : "";
  if (explicit) {
    return { text: applyDirectionTag(body, explicit), applied: explicit };
  }

  const emotionKey = String(opts.emotion || "").trim() as NarrationEmotion;
  const preset = emotionKey && emotionKey in NARRATION_EMOTION_PRESETS
    ? NARRATION_EMOTION_PRESETS[emotionKey]
    : null;
  if (!preset) return { text: body, applied: null };

  return {
    text: applyDirectionTag(body, preset.tag),
    stability: preset.stability,
    style: preset.style,
    applied: preset.tag,
  };
}

/** פיצול קריינות ארוכה לקטעים קצרים לעריכה — לפי שורות או משפטים. */
export function splitNarrationBeats(text: string, maxChars = 90): string[] {
  const raw = String(text || "").trim();
  if (!raw) return [];
  const byLine = raw.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const parts = byLine.length > 1 ? byLine : raw.split(/(?<=[.!?…।۔])\s+/).map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    if (part.length <= maxChars) {
      out.push(part);
      continue;
    }
    // שבירה לפי פסיקים / מקפים אם ארוך מדי
    const chunks = part.split(/(?<=[,;–—])\s+/);
    let buf = "";
    for (const c of chunks) {
      if (!buf) buf = c;
      else if ((buf + " " + c).length <= maxChars) buf = `${buf} ${c}`;
      else {
        out.push(buf);
        buf = c;
      }
    }
    if (buf) out.push(buf);
  }
  return out.length ? out : [raw];
}
