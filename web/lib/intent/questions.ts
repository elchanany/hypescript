// שאלות פתיחה — רק מה שאי-אפשר להסיק, ולכל היותר שלוש.
//
// הכלל: כל שאלה חייבת *לשנות את הפלט*. שאלה שהתשובה לה כבר עולה מהמדיה,
// או שלא משנה שום החלטה, לא נשאלת. משתמש שנשאל שלוש שאלות קצרות עונה;
// משתמש שנשאל עשר סוגר את החלון.
//
// לכל שאלה יש דילוג, ולכל השלב יש כיבוי מלא בהגדרות. ברירת המחדל שנבחרת
// כשמדלגים היא תמיד הבטוחה ביותר, לא הכי מרשימה.

import { GOALS, GoalId, GoalScore, ProjectSignals, isConfident } from "./signals";

export type QuestionId = "goal" | "platform" | "tone" | "music" | "narration" | "length";

export interface QuestionOption {
  id: string;
  labelHe: string;
  /** הסבר קצר — מופיע מתחת לאפשרות. */
  hintHe?: string;
}

export interface DiscoveryQuestion {
  id: QuestionId;
  /** ניסוח ידידותי, לא חקירה. */
  promptHe: string;
  options: QuestionOption[];
  /** ברירת מחדל כשמדלגים. */
  skipDefault: string;
}

export interface DiscoveryAnswers {
  goal?: GoalId;
  platform?: "tiktok" | "instagram" | "facebook" | "youtube" | "whatsapp" | "screen" | "other";
  tone?: "energetic" | "warm" | "serious" | "clean";
  music?: "yes_generated" | "yes_own" | "no";
  narration?: "yes" | "no";
  length?: "very_short" | "short" | "medium" | "full";
}

/** מקסימום שאלות בפתיחה. מעבר לזה זה סקר, לא שיחה. */
export const MAX_QUESTIONS = 3;

const GOAL_OPTIONS = (ranked: GoalScore[]): QuestionOption[] => {
  const top = ranked.filter((r) => r.goal !== "unknown").slice(0, 4);
  const options = top.map((r) => ({
    id: r.goal,
    labelHe: GOALS[r.goal].labelHe,
    hintHe: GOALS[r.goal].outcomeHe,
  }));
  return options.length ? options : Object.values(GOALS)
    .filter((g) => g.id !== "unknown")
    .slice(0, 4)
    .map((g) => ({ id: g.id, labelHe: g.labelHe, hintHe: g.outcomeHe }));
};

const PLATFORM: DiscoveryQuestion = {
  id: "platform",
  promptHe: "איפה זה הולך להתפרסם?",
  options: [
    { id: "tiktok", labelHe: "טיקטוק / רילס", hintHe: "לאורך, כתוביות בולטות" },
    { id: "facebook", labelHe: "פייסבוק / אינסטגרם", hintHe: "לאורך או ריבוע" },
    { id: "youtube", labelHe: "יוטיוב", hintHe: "לרוחב, איכות מלאה" },
    { id: "screen", labelHe: "הקרנה או וואטסאפ", hintHe: "לרוחב, בלי כתוביות אגרסיביות" },
  ],
  skipDefault: "facebook",
};

const TONE: DiscoveryQuestion = {
  id: "tone",
  promptHe: "איזו הרגשה אתה רוצה?",
  options: [
    { id: "energetic", labelHe: "אנרגטי וקצבי", hintHe: "קאטים מהירים, כתוביות מודגשות" },
    { id: "warm", labelHe: "חם ומרגש", hintHe: "מעברים רכים, מוזיקה נעימה" },
    { id: "serious", labelHe: "רציני ומכובד", hintHe: "בלי גימיקים, כתוביות שקטות" },
    { id: "clean", labelHe: "נקי ומקצועי", hintHe: "מינימלי, ממוקד בתוכן" },
  ],
  skipDefault: "clean",
};

const MUSIC: DiscoveryQuestion = {
  id: "music",
  promptHe: "מוזיקת רקע?",
  options: [
    { id: "yes_generated", labelHe: "כן, תייצר לי", hintHe: "מוזיקה מקורית, בלי בעיית זכויות" },
    { id: "yes_own", labelHe: "יש לי שיר", hintHe: "תעלה אותו ואשלב" },
    { id: "no", labelHe: "בלי מוזיקה", hintHe: "רק הקול המקורי" },
  ],
  skipDefault: "no",
};

const NARRATION: DiscoveryQuestion = {
  id: "narration",
  promptHe: "צריך קריינות?",
  options: [
    { id: "yes", labelHe: "כן", hintHe: "אכתוב טקסט ואייצר קול" },
    { id: "no", labelHe: "לא", hintHe: "רק מה שכבר מוקלט" },
  ],
  skipDefault: "no",
};

const LENGTH: DiscoveryQuestion = {
  id: "length",
  promptHe: "כמה ארוך שיצא?",
  options: [
    { id: "very_short", labelHe: "עד 30 שניות" },
    { id: "short", labelHe: "עד דקה" },
    { id: "medium", labelHe: "2–5 דקות" },
    { id: "full", labelHe: "כמה שצריך", hintHe: "בלי לקצץ תוכן" },
  ],
  skipDefault: "full",
};

/**
 * בונה את רשימת השאלות. סדר העדיפויות: קודם מה שמשנה הכי הרבה בפלט.
 * שאלה נשמטת ברגע שהאות מהמדיה כבר עונה עליה.
 */
export function planQuestions(
  signals: ProjectSignals,
  ranked: GoalScore[],
  known: DiscoveryAnswers = {},
): DiscoveryQuestion[] {
  const out: DiscoveryQuestion[] = [];

  // 1. המטרה — נשאלת רק כשהדירוג אינו חד-משמעי
  if (!known.goal && !isConfident(ranked)) {
    out.push({
      id: "goal",
      promptHe: signals.shape === "empty"
        ? "נעים להכיר. מה בא לך ליצור?"
        : "קלטתי מה העלית. מה המטרה?",
      options: GOAL_OPTIONS(ranked),
      skipDefault: ranked[0]?.goal ?? "unknown",
    });
  }

  const goal = known.goal ?? ranked[0]?.goal ?? "unknown";
  const recipe = GOALS[goal]?.recipe;

  // 2. פלטפורמה — קובעת יחס מסך וסגנון כתוביות. מיותרת אם החומר כבר לאורך
  //    ומדובר במוצר קצר, כי אז יחס המסך כבר נקבע בפועל.
  const aspectDecided = signals.aspect === "portrait" && recipe?.aspect === "portrait";
  if (!known.platform && !aspectDecided && goal !== "lecture_cut") out.push(PLATFORM);

  // 3. אחת מהשלוש הבאות, לפי מה שהכי משנה ליעד הזה
  if (out.length < MAX_QUESTIONS) {
    if (recipe?.narration && !known.narration) out.push(NARRATION);
    else if (recipe && recipe.music !== "none" && !known.music) out.push(MUSIC);
    else if (!known.tone) out.push(TONE);
  }

  // 4. אורך — רק לתוכן ארוך, שם זו באמת החלטה
  if (out.length < MAX_QUESTIONS && !known.length
    && (signals.shape === "single_long_video" || signals.shape === "audio_only")) {
    out.push(LENGTH);
  }

  return out.slice(0, MAX_QUESTIONS);
}

// ─── הבריף שנוצר ──────────────────────────────────────────────────────────

export interface ProjectBrief {
  goal: GoalId;
  goalLabelHe: string;
  outcomeHe: string;
  aspect: "portrait" | "landscape" | "square";
  targetSec: number | null;
  pacing: "staccato" | "tight" | "natural" | "broadcast";
  captions: "karaoke" | "phrase" | "lecture" | "minimal" | "none";
  transitions: string[];
  music: "upbeat" | "warm" | "cinematic" | "calm" | "none";
  narration: boolean;
  steps: string[];
  /** מה נגזר מאותות ומה נענה במפורש — לשקיפות מול המשתמש. */
  derivedHe: string[];
  answered: DiscoveryAnswers;
}

const PLATFORM_ASPECT: Record<string, "portrait" | "landscape" | "square"> = {
  tiktok: "portrait", instagram: "portrait", facebook: "square",
  youtube: "landscape", whatsapp: "landscape", screen: "landscape", other: "landscape",
};

const LENGTH_SEC: Record<string, number | null> = {
  very_short: 30, short: 60, medium: 240, full: null,
};

const TONE_PACING: Record<string, ProjectBrief["pacing"]> = {
  energetic: "staccato", warm: "natural", serious: "broadcast", clean: "natural",
};

const TONE_CAPTIONS: Record<string, ProjectBrief["captions"]> = {
  energetic: "karaoke", warm: "phrase", serious: "lecture", clean: "minimal",
};

/**
 * ממזג אותות + תשובות לבריף אחד. תשובה מפורשת תמיד גוברת על הסקה,
 * וכל החלטה נרשמת ב-derivedHe כדי שהמשתמש יראה על מה זה מבוסס.
 */
export function buildBrief(
  signals: ProjectSignals,
  ranked: GoalScore[],
  answers: DiscoveryAnswers = {},
): ProjectBrief {
  const goal = answers.goal ?? ranked[0]?.goal ?? "unknown";
  const base = GOALS[goal] ?? GOALS.unknown;
  const recipe = base.recipe;
  const derivedHe: string[] = [];

  if (answers.goal) derivedHe.push(`המטרה נבחרה: ${base.labelHe}`);
  else if (ranked[0]?.reasonsHe.length) derivedHe.push(`המטרה הוסקה (${base.labelHe}): ${ranked[0].reasonsHe.join("; ")}`);

  let aspect = recipe.aspect;
  if (answers.platform) {
    aspect = PLATFORM_ASPECT[answers.platform] ?? aspect;
    derivedHe.push(`יחס מסך ${aspect} לפי הפלטפורמה שנבחרה`);
  } else if (signals.aspect === "portrait" || signals.aspect === "landscape") {
    aspect = signals.aspect;
    derivedHe.push(`יחס מסך ${aspect} לפי החומר שהועלה`);
  }

  let pacing = recipe.pacing;
  let captions = recipe.captions;
  if (answers.tone) {
    pacing = TONE_PACING[answers.tone] ?? pacing;
    captions = TONE_CAPTIONS[answers.tone] ?? captions;
    derivedHe.push(`קצב וסגנון כתוביות לפי הטון שנבחר`);
  }

  let targetSec = recipe.targetSec;
  if (answers.length) {
    targetSec = LENGTH_SEC[answers.length] ?? targetSec;
    derivedHe.push(targetSec ? `משך יעד ${targetSec} שניות` : "בלי מגבלת אורך");
  }

  let music = recipe.music;
  if (answers.music === "no") { music = "none"; derivedHe.push("בלי מוזיקה, לפי בחירה"); }
  else if (answers.music && music === "none") { music = "warm"; derivedHe.push("נוספה מוזיקה לפי בחירה"); }

  const narration = answers.narration ? answers.narration === "yes" : recipe.narration;
  if (answers.narration) derivedHe.push(narration ? "קריינות: כן" : "קריינות: לא");

  return {
    goal,
    goalLabelHe: base.labelHe,
    outcomeHe: base.outcomeHe,
    aspect,
    targetSec,
    pacing,
    captions,
    transitions: [...recipe.transitions],
    music,
    narration,
    steps: [...recipe.steps],
    derivedHe,
    answered: { ...answers },
  };
}

/** תקציר קריא לצ'אט — קצר, בלי לחפור. */
export function describeBrief(brief: ProjectBrief): string {
  const bits = [
    `יעד: ${brief.goalLabelHe}`,
    `יחס ${brief.aspect}`,
    brief.targetSec ? `~${brief.targetSec}s` : "אורך חופשי",
    `קצב ${brief.pacing}`,
    `כתוביות ${brief.captions}`,
    brief.music !== "none" ? `מוזיקה ${brief.music}` : "בלי מוזיקה",
    brief.narration ? "עם קריינות" : "בלי קריינות",
  ];
  return `${brief.outcomeHe}\n${bits.join(" · ")}`;
}
