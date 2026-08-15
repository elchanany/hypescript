// מה הפרויקט *הוא*, לפני ששואלים את המשתמש שאלה אחת.
//
// עד כה הסוכן התחיל מ"מה לחתוך". זה נכון לשיעור עם סקריפט ושגוי לכל שאר
// המקרים: תיקיית תמונות של דירת שותפים, מצגת משפחתית, פודקאסט של שעתיים,
// שורט מתוך הרצאה ארוכה. לכל אחד מהם *מוצר* אחר — יחס מסך אחר, קצב אחר,
// סגנון כתוביות אחר, ומוזיקה אחרת.
//
// כאן מפיקים אותות דטרמיניסטיים מהמדיה עצמה. הם עונים על רוב השאלות בלי
// לשאול, וכך נשאר לשאול רק את מה שבאמת לא ניתן להסיק. משתמש שנשאל שלוש
// שאלות עונה; משתמש שנשאל עשר בורח.

import type { MediaAsset } from "@/lib/editor/model";

export type MediaShape =
  | "empty"
  | "photos_only"
  | "single_short_video"
  | "single_long_video"
  | "multi_video"
  | "audio_only"
  | "mixed";

export type Aspect = "portrait" | "landscape" | "square" | "mixed" | "unknown";

export interface ProjectSignals {
  imageCount: number;
  videoCount: number;
  audioCount: number;
  totalVideoSec: number;
  longestVideoSec: number;
  totalAudioSec: number;
  shape: MediaShape;
  aspect: Aspect;
  /** קיים תמלול לפחות למקור אחד. */
  hasTranscript: boolean;
  /** המשתמש סיפק טקסט שצריך להישאר. */
  hasScript: boolean;
  /** כבר יש ציר ערוך. */
  hasTimeline: boolean;
  timelineSec: number;
}

export interface SignalInput {
  media: MediaAsset[];
  /** יחס מסך לכל מקור, כשידוע (רוחב/גובה). */
  aspectByAsset?: Record<string, number>;
  hasTranscript?: boolean;
  hasScript?: boolean;
  timelineSec?: number;
}

/** מעל זה נחשב "תוכן ארוך" — פודקאסט, הרצאה, שיחה. */
export const LONG_FORM_SEC = 12 * 60;
/** מתחת לזה זה כבר קליפ קצר. */
export const SHORT_FORM_SEC = 90;

function classifyAspect(ratios: number[]): Aspect {
  if (!ratios.length) return "unknown";
  const kind = (r: number): Exclude<Aspect, "mixed" | "unknown"> =>
    r < 0.9 ? "portrait" : r > 1.15 ? "landscape" : "square";
  const kinds = new Set(ratios.map(kind));
  if (kinds.size > 1) return "mixed";
  return [...kinds][0];
}

export function collectSignals(input: SignalInput): ProjectSignals {
  const media = input.media || [];
  const images = media.filter((m) => m.kind === "image");
  const videos = media.filter((m) => m.kind === "video");
  const audios = media.filter((m) => m.kind === "audio");
  const totalVideoSec = videos.reduce((s, v) => s + (v.duration || 0), 0);
  const longestVideoSec = videos.reduce((s, v) => Math.max(s, v.duration || 0), 0);
  const totalAudioSec = audios.reduce((s, a) => s + (a.duration || 0), 0);

  let shape: MediaShape = "empty";
  if (!media.length) shape = "empty";
  else if (videos.length === 0 && images.length > 0 && audios.length === 0) shape = "photos_only";
  else if (videos.length === 0 && audios.length > 0 && images.length === 0) shape = "audio_only";
  else if (videos.length === 1 && images.length === 0) {
    shape = longestVideoSec >= LONG_FORM_SEC ? "single_long_video" : "single_short_video";
  } else if (videos.length > 1 && images.length === 0) shape = "multi_video";
  else shape = "mixed";

  const ratios = Object.values(input.aspectByAsset || {}).filter((r) => Number.isFinite(r) && r > 0);
  return {
    imageCount: images.length,
    videoCount: videos.length,
    audioCount: audios.length,
    totalVideoSec,
    longestVideoSec,
    totalAudioSec,
    shape,
    aspect: classifyAspect(ratios),
    hasTranscript: !!input.hasTranscript,
    hasScript: !!input.hasScript,
    hasTimeline: (input.timelineSec ?? 0) > 0,
    timelineSec: input.timelineSec ?? 0,
  };
}

// ─── יעדים ────────────────────────────────────────────────────────────────

export type GoalId =
  | "photo_promo"        // תמונות → מודעה/פוסט (דירת שותפים, מוצר, אירוע)
  | "family_slideshow"   // תמונות → מצגת משפחתית עם שיר
  | "lecture_cut"        // שיעור/הרצאה: להשאיר בדיוק טקסט מסוים
  | "podcast_edit"       // תוכן ארוך: לנקות ולקצר
  | "shorts_from_long"   // לחלץ שורטים מתוכן ארוך
  | "social_promo"       // קליפ קצר לרשתות מחומר קיים
  | "business_deck"      // מצגת עסקית מונפשת
  | "unknown";

export type CaptionStyleId = "karaoke" | "phrase" | "lecture" | "minimal" | "none";

export interface GoalRecipe {
  aspect: "portrait" | "landscape" | "square";
  /** משך יעד בשניות; null = לפי החומר. */
  targetSec: number | null;
  pacing: "staccato" | "tight" | "natural" | "broadcast";
  captions: CaptionStyleId;
  /** קטגוריות מעברים מועדפות מקטלוג המעברים. */
  transitions: string[];
  music: "upbeat" | "warm" | "cinematic" | "calm" | "none";
  narration: boolean;
  /** צעדים מומלצים, בסדר — הבסיס להצעה של הסוכן. */
  steps: string[];
}

export interface Goal {
  id: GoalId;
  labelHe: string;
  /** משפט אחד שמתאר מה יוצא בסוף. */
  outcomeHe: string;
  recipe: GoalRecipe;
}

export const GOALS: Record<GoalId, Goal> = {
  photo_promo: {
    id: "photo_promo",
    labelHe: "פוסט מתמונות",
    outcomeHe: "סרטון קצר וקצבי מהתמונות, עם כתוביות ומוזיקה — מוכן לפייסבוק או אינסטגרם.",
    recipe: {
      aspect: "portrait", targetSec: 35, pacing: "tight", captions: "karaoke",
      transitions: ["slide", "dissolve", "motion"], music: "upbeat", narration: true,
      steps: ["describe_images", "order_images", "write_script", "generate_narration", "add_music", "captions", "transitions", "export"],
    },
  },
  family_slideshow: {
    id: "family_slideshow",
    labelHe: "מצגת משפחתית",
    outcomeHe: "מצגת נעימה עם מעברים רכים ושיר ברקע — להקרנה באירוע משפחתי.",
    recipe: {
      aspect: "landscape", targetSec: null, pacing: "broadcast", captions: "minimal",
      transitions: ["dissolve", "shape", "cover"], music: "warm", narration: false,
      steps: ["describe_images", "order_images", "pick_music", "transitions", "titles", "export"],
    },
  },
  lecture_cut: {
    id: "lecture_cut",
    labelHe: "עריכת שיעור לפי טקסט",
    outcomeHe: "בדיוק הקטעים שביקשת, בלי נשימות ושתיקות, עם כתוביות מסונכרנות.",
    recipe: {
      aspect: "landscape", targetSec: null, pacing: "broadcast", captions: "lecture",
      transitions: ["dissolve"], music: "none", narration: false,
      steps: ["transcribe", "keep_by_script", "captions", "audit", "export"],
    },
  },
  podcast_edit: {
    id: "podcast_edit",
    labelHe: "עריכת תוכן ארוך",
    outcomeHe: "הגרסה הנקייה — בלי מהססים, שתיקות וקטעים מיותרים.",
    recipe: {
      aspect: "landscape", targetSec: null, pacing: "natural", captions: "phrase",
      transitions: ["dissolve"], music: "none", narration: false,
      steps: ["transcribe", "review_topics", "remove_silence", "captions", "audit", "export"],
    },
  },
  shorts_from_long: {
    id: "shorts_from_long",
    labelHe: "שורטים מתוכן ארוך",
    outcomeHe: "כמה קטעים קצרים וחזקים מתוך ההקלטה הארוכה, מוכנים לטיקטוק/רילס.",
    recipe: {
      aspect: "portrait", targetSec: 45, pacing: "staccato", captions: "karaoke",
      transitions: ["motion", "dissolve"], music: "upbeat", narration: false,
      steps: ["transcribe", "find_highlights", "keep_by_script", "reframe_vertical", "captions", "export"],
    },
  },
  social_promo: {
    id: "social_promo",
    labelHe: "קליפ לרשתות",
    outcomeHe: "קליפ קצר ומהודק עם כתוביות בולטות ומוזיקה.",
    recipe: {
      aspect: "portrait", targetSec: 40, pacing: "tight", captions: "karaoke",
      transitions: ["motion", "slide"], music: "upbeat", narration: false,
      steps: ["transcribe", "pick_segment", "keep_by_script", "captions", "add_music", "export"],
    },
  },
  business_deck: {
    id: "business_deck",
    labelHe: "מצגת עסקית",
    outcomeHe: "מצגת מונפשת ומדויקת עם כותרות נקיות וקריינות.",
    recipe: {
      aspect: "landscape", targetSec: null, pacing: "natural", captions: "minimal",
      transitions: ["slide", "wipe"], music: "calm", narration: true,
      steps: ["describe_images", "write_script", "generate_narration", "titles", "transitions", "export"],
    },
  },
  unknown: {
    id: "unknown",
    labelHe: "עוד לא ברור",
    outcomeHe: "צריך לשאול את המשתמש מה המטרה לפני שממליצים על משהו.",
    recipe: {
      aspect: "landscape", targetSec: null, pacing: "natural", captions: "phrase",
      transitions: ["dissolve"], music: "none", narration: false,
      steps: ["ask_user"],
    },
  },
};

export interface GoalScore {
  goal: GoalId;
  score: number;
  /** למה — מוצג למשתמש, כדי שההצעה לא תיראה שרירותית. */
  reasonsHe: string[];
}

/** רמזים טקסטואליים. מפתח = מילה בהודעת המשתמש, ערך = יעדים שהיא מחזקת. */
const TEXT_HINTS: Array<{ words: string[]; goals: GoalId[]; weight: number; reasonHe: string }> = [
  { words: ["טיקטוק", "tiktok", "רילס", "reels", "שורט", "shorts", "סטורי"], goals: ["shorts_from_long", "social_promo"], weight: 3, reasonHe: "הוזכרה פלטפורמת וידאו קצר" },
  { words: ["פייסבוק", "facebook", "אינסטגרם", "instagram", "פוסט", "מודעה"], goals: ["photo_promo", "social_promo"], weight: 2.5, reasonHe: "הוזכר פוסט ברשת חברתית" },
  // "מצגת" לבדה גנרית מדי — היא מופיעה גם במצגת עסקית. רק הקשר משפחתי מפורש.
  { words: ["משפחה", "משפחתי", "אמא", "אבא", "סבתא", "סבא", "חתונה", "בר מצווה", "בת מצווה", "יומולדת", "ילדים"], goals: ["family_slideshow"], weight: 3, reasonHe: "הוזכר אירוע משפחתי" },
  { words: ["שיעור", "הרצאה", "רב", "דרשה", "שיחה", "כולל"], goals: ["lecture_cut"], weight: 3, reasonHe: "הוזכר שיעור או הרצאה" },
  { words: ["פודקאסט", "podcast", "ראיון", "פרק"], goals: ["podcast_edit", "shorts_from_long"], weight: 3, reasonHe: "הוזכר פודקאסט או ראיון" },
  { words: ["עסקי", "מצגת עסקית", "לקוחות", "משקיעים", "פיץ", "מכירות"], goals: ["business_deck"], weight: 3, reasonHe: "הוזכר הקשר עסקי" },
  { words: ["שותף", "שותפה", "דירה", "חדר", "להשכרה"], goals: ["photo_promo"], weight: 3, reasonHe: "הוזכרה מודעת דירה/שותפים" },
  { words: ["קריינות", "הקראה", "voiceover"], goals: ["photo_promo", "business_deck"], weight: 1.5, reasonHe: "התבקשה קריינות" },
  { words: ["שיר", "מוזיקה", "מנגינה"], goals: ["family_slideshow", "photo_promo"], weight: 1, reasonHe: "התבקשה מוזיקה" },
];

/**
 * מדרג יעדים לפי המדיה + הטקסט. מחזיר רשימה ממוינת, תמיד עם סיבות.
 * ההסתמכות היא קודם על המדיה (עובדה) ורק אחר כך על הטקסט (רמז).
 */
export function scoreGoals(signals: ProjectSignals, userText = ""): GoalScore[] {
  const scores = new Map<GoalId, { score: number; reasons: string[] }>();
  const add = (goal: GoalId, amount: number, reasonHe: string) => {
    const slot = scores.get(goal) || { score: 0, reasons: [] };
    slot.score += amount;
    if (reasonHe && !slot.reasons.includes(reasonHe)) slot.reasons.push(reasonHe);
    scores.set(goal, slot);
  };

  switch (signals.shape) {
    case "photos_only": {
      const many = signals.imageCount >= 4;
      add("photo_promo", many ? 4 : 2.5, `${signals.imageCount} תמונות ואין וידאו`);
      add("family_slideshow", many ? 3.5 : 2, `${signals.imageCount} תמונות ואין וידאו`);
      add("business_deck", 1.5, "אוסף תמונות יכול להיות גם מצגת");
      break;
    }
    case "single_long_video":
      add("podcast_edit", 4, `וידאו ארוך (${Math.round(signals.longestVideoSec / 60)} דק')`);
      add("shorts_from_long", 3.5, "מתוכן ארוך אפשר לחלץ קטעים קצרים");
      add("lecture_cut", 2, "ייתכן שיעור ארוך");
      break;
    case "single_short_video":
      add("lecture_cut", signals.hasScript ? 4.5 : 2.5,
        signals.hasScript ? "יש טקסט מוגדר שצריך להישאר" : `וידאו יחיד (${Math.round(signals.longestVideoSec)} שנ')`);
      add("social_promo", signals.longestVideoSec <= SHORT_FORM_SEC ? 3 : 2, "וידאו קצר מתאים לרשתות");
      break;
    case "multi_video":
      add("social_promo", 3, `${signals.videoCount} סרטונים להרכבה`);
      add("family_slideshow", 1.5, "אפשר להרכיב מהם רצף");
      break;
    case "audio_only":
      add("podcast_edit", 4, "אודיו בלבד");
      add("shorts_from_long", 2, "אפשר לחלץ קטעים");
      break;
    case "mixed":
      add("photo_promo", 2, "תערובת תמונות ווידאו");
      add("social_promo", 2, "תערובת מדיה");
      add("business_deck", 1.5, "תערובת מדיה");
      break;
    default:
      break;
  }

  if (signals.hasScript) add("lecture_cut", 2, "סופק טקסט מדויק לשמירה");
  if (signals.aspect === "portrait") {
    add("shorts_from_long", 1.5, "החומר מצולם לאורך");
    add("social_promo", 1.5, "החומר מצולם לאורך");
  }

  const text = String(userText || "").toLowerCase();
  if (text) {
    for (const hint of TEXT_HINTS) {
      if (!hint.words.some((w) => text.includes(w.toLowerCase()))) continue;
      for (const goal of hint.goals) add(goal, hint.weight, hint.reasonHe);
    }
  }

  const out = [...scores.entries()]
    .map(([goal, slot]) => ({ goal, score: slot.score, reasonsHe: slot.reasons }))
    .sort((a, b) => b.score - a.score || a.goal.localeCompare(b.goal));
  return out.length ? out : [{ goal: "unknown", score: 0, reasonsHe: ["אין מספיק מידע"] }];
}

/**
 * האם ההובלה חד-משמעית. פער קטן בין הראשון לשני = לנחש זה להימר על
 * המוצר של המשתמש, ועדיף לשאול שאלה אחת.
 */
export function isConfident(ranked: GoalScore[], minLead = 1.5, minScore = 3): boolean {
  if (!ranked.length || ranked[0].goal === "unknown") return false;
  if (ranked[0].score < minScore) return false;
  const second = ranked[1]?.score ?? 0;
  return ranked[0].score - second >= minLead;
}
