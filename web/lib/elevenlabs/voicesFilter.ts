/**
 * סינון ודירוג קולות ElevenLabs לקריינות עברית / קמפיין.
 *
 * חשוב: אין חובה ל-labels.language=he.
 * עם eleven_v3 + language_code=he כמעט כל קול מולטילינגואלי מדבר עברית.
 * חיפוש "hebrew" בלבד לעיתים מחזיר ריק — זו לא הוכחה שאין קריינות עברית.
 */

export interface VoiceRow {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  labels?: Record<string, unknown>;
  high_quality_base_model_ids?: string[];
  preview_url?: string | null;
}

export interface VoiceFilterOpts {
  /** he / hebrew / ivrit — סינון רך לפי תוויות, לא חובה */
  language?: string | null;
  /** העדף קולות גבריים */
  gender?: "male" | "female" | "neutral" | null;
  /** העדף קולות בוגרים / בריטון לקמפיין */
  preferCampaign?: boolean;
  /** רק קולות עם תמיכת eleven_v3 ב-HQ אם קיים */
  preferV3?: boolean;
}

function labelBlob(v: VoiceRow): string {
  const labels = v.labels && typeof v.labels === "object" ? v.labels : {};
  return [
    v.name,
    v.description || "",
    v.category || "",
    ...Object.entries(labels).map(([k, val]) => `${k}=${val}`),
  ].join(" ").toLowerCase();
}

function languageMatches(v: VoiceRow, want: string): boolean {
  const w = want.trim().toLowerCase();
  if (!w) return true;
  const aliases = w === "he" || w === "hebrew" || w === "עברית" || w === "ivrit"
    ? ["he", "hebrew", "עברית", "israeli", "israel"]
    : [w];
  const blob = labelBlob(v);
  const lang = String((v.labels as Record<string, unknown> | undefined)?.language || "").toLowerCase();
  const accent = String((v.labels as Record<string, unknown> | undefined)?.accent || "").toLowerCase();
  return aliases.some((a) => lang.includes(a) || accent.includes(a) || blob.includes(a));
}

function genderMatches(v: VoiceRow, gender: NonNullable<VoiceFilterOpts["gender"]>): boolean {
  const g = String((v.labels as Record<string, unknown> | undefined)?.gender || "").toLowerCase();
  const blob = labelBlob(v);
  if (gender === "male") return g.includes("male") || /\b(male|man|deep|baritone|bass)\b/.test(blob);
  if (gender === "female") return g.includes("female") || /\b(female|woman|alto|soprano)\b/.test(blob);
  return true;
}

/** ניקוד לקמפיין פוליטי רציני: בריטון, בוגר, narrative — לא hyped/cute. */
export function campaignVoiceScore(v: VoiceRow): number {
  const blob = labelBlob(v);
  let score = 0;
  if (/\b(narrat|story|document|authorit|mature|deep|resonant|warm|calm|classy|professional|baritone|bass|husky)\b/.test(blob)) score += 3;
  if (/\b(middle.?aged|older|mature)\b/.test(blob)) score += 2;
  if (/\b(male|man)\b/.test(blob)) score += 1;
  if (/\b(hebrew|israeli|עברית)\b/.test(blob)) score += 4;
  if (/\b(hyped|cute|sassy|playful|quirky|cartoon|anime|child|young.?adult energetic)\b/.test(blob)) score -= 4;
  if (/\b(whisper|soft|gentle)\b/.test(blob) && !/\b(narrat|document)\b/.test(blob)) score -= 1;
  const hq = v.high_quality_base_model_ids || [];
  if (hq.some((id) => String(id).includes("eleven_v3") || String(id).includes("v3"))) score += 2;
  return score;
}

/**
 * מסנן ומדרג קולות. אם language=he ולא נמצאה התאמת תווית —
 * מחזיר את כל הקולות מדורגים (כי v3+he עובד בלי תווית עברית).
 */
export function filterAndRankVoices(voices: VoiceRow[], opts: VoiceFilterOpts = {}): {
  voices: VoiceRow[];
  noteHe: string;
} {
  const list = Array.isArray(voices) ? [...voices] : [];
  let noteHe = "";

  let filtered = list;
  if (opts.language) {
    const langHits = list.filter((v) => languageMatches(v, opts.language!));
    if (langHits.length) {
      filtered = langHits;
      noteHe = `סוננו ${langHits.length} קולות עם תווית/תיאור שפה תואם (${opts.language}).`;
    } else {
      noteHe =
        `לא נמצאו קולות עם תווית שפה "${opts.language}" — זה נורמלי. ` +
        `עם eleven_v3 ו-language_code=he אפשר להשתמש בכל קול מולטילינגואלי. מוצגים כל הקולות מדורגים.`;
    }
  }

  if (opts.gender) {
    const genderHits = filtered.filter((v) => genderMatches(v, opts.gender!));
    if (genderHits.length) filtered = genderHits;
    else noteHe += (noteHe ? " " : "") + `לא נמצאה התאמת מגדר מדויקת ל-${opts.gender}; נשארה הרשימה הקודמת.`;
  }

  if (opts.preferV3) {
    const v3 = filtered.filter((v) =>
      (v.high_quality_base_model_ids || []).some((id) => String(id).includes("v3")),
    );
    if (v3.length) filtered = v3;
  }

  const scored = filtered
    .map((v) => ({ v, score: opts.preferCampaign ? campaignVoiceScore(v) : 0 }))
    .sort((a, b) => b.score - a.score || a.v.name.localeCompare(b.v.name));

  return { voices: scored.map((s) => s.v), noteHe };
}

/** חיפושי ברירת מחדל מומלצים כשהסוכן מחפש קריין ישראלי לקמפיין. */
export const HEBREW_CAMPAIGN_VOICE_SEARCHES = [
  "hebrew",
  "israeli",
  "narrative",
  "deep",
  "mature",
  "documentary",
] as const;
