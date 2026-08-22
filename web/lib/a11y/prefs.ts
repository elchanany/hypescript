// העדפות נגישות — לוגיקה טהורה בלבד (בלי DOM/localStorage).
//
// למה קובץ נפרד מה-DOM: הלוגיקה כאן צריכה לרוץ גם בצד השרת (route.ts שמאמת
// את font_scale שנשמר בחשבון) וגם בצד הלקוח (הווידג'ט הצף ועמוד ההגדרות),
// ואותה בדיוק לוגיקת clamp/parse חייבת לתת תוצאה זהה בשני הצדדים — אחרת
// הווידג'ט והחשבון "יריבו" על הערך התקף. הפרדה הזו גם מאפשרת בדיקות יחידה
// פשוטות בלי לדמות דפדפן.

export interface A11yPrefs {
  /** מכפיל גודל טקסט. אותו טווח וברירת מחדל כמו font_scale בטבלת user_settings. */
  fontScale: number;
  highContrast: boolean;
  highlightLinks: boolean;
  reducedMotion: boolean;
  readableFont: boolean;
}

export const FONT_SCALE_MIN = 0.85;
export const FONT_SCALE_MAX = 1.35;

/** צעדי גודל טקסט שהווידג'ל מציג — כפתורי הגדלה/הקטנה קופצים ביניהם. */
export const TEXT_SIZE_STEPS: readonly number[] = [0.85, 1, 1.15, 1.3, 1.35];

export const DEFAULT_A11Y_PREFS: A11yPrefs = {
  fontScale: 1,
  highContrast: false,
  highlightLinks: false,
  reducedMotion: false,
  readableFont: false,
};

/**
 * זהה ל-clamp שמתבצע ב-web/app/api/account/route.ts עבור font_scale.
 * אם משנים טווח כאן — יש לשנות גם שם (או, עוד יותר טוב, לגרום ל-route
 * לייבא מכאן; זה מה שנעשה בפועל).
 */
export function clampFontScale(value: unknown): number {
  // `Number(value) || 1`, לא Number.isFinite — בכוונה: זו בדיוק הנוסחה
  // שכבר רצה ב-web/app/api/account/route.ts (Math.max(.85, Math.min(1.35,
  // Number(s.font_scale) || 1))), כולל תופעת הלוואי ש-0 גם הוא נופל ל-1
  // (0 אינו ערך תקין לגודל טקסט בין כה וכה). שינוי כאן בלי לעדכן שם היה
  // יוצר סתירה בין מה שהחשבון שומר למה שהווידג'ט מציג.
  const safe = Number(value) || 1;
  const clamped = Math.max(FONT_SCALE_MIN, Math.min(FONT_SCALE_MAX, safe));
  // עיגול לשתי ספרות כדי למנוע רעש כמו 1.0499999999999998 מחיבורי float.
  return Math.round(clamped * 100) / 100;
}

/** מזיז את גודל הטקסט לצעד הבא/הקודם ברשימת TEXT_SIZE_STEPS, עם clamp בקצוות. */
export function stepFontScale(current: number, direction: 1 | -1): number {
  const value = clampFontScale(current);
  const steps = TEXT_SIZE_STEPS;
  // מוצאים את הצעד הקרוב ביותר לערך הנוכחי, ואז זזים ממנו — כך שערך "בין
  // צעדים" (למשל אם הגיע מ-/account עם 1.07) עדיין מתקדם בכיוון הגיוני.
  let closestIndex = 0;
  let closestDistance = Infinity;
  for (let i = 0; i < steps.length; i++) {
    const distance = Math.abs(steps[i] - value);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = i;
    }
  }
  const nextIndex = Math.max(0, Math.min(steps.length - 1, closestIndex + direction));
  return clampFontScale(steps[nextIndex]);
}

function coerceBoolean(value: unknown): boolean {
  return value === true;
}

/**
 * הופך מחרוזת גולמית מ-localStorage לאובייקט A11yPrefs תקין תמיד — קלט
 * חסר, לא תקין, או ישן (סכימה שהשתנתה) חוזר כברירת המחדל בלי לזרוק.
 */
export function parseA11yPrefs(raw: string | null | undefined): A11yPrefs {
  if (!raw) return { ...DEFAULT_A11Y_PREFS };
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return { ...DEFAULT_A11Y_PREFS };
    return {
      fontScale: clampFontScale((data as Record<string, unknown>).fontScale),
      highContrast: coerceBoolean((data as Record<string, unknown>).highContrast),
      highlightLinks: coerceBoolean((data as Record<string, unknown>).highlightLinks),
      reducedMotion: coerceBoolean((data as Record<string, unknown>).reducedMotion),
      readableFont: coerceBoolean((data as Record<string, unknown>).readableFont),
    };
  } catch {
    return { ...DEFAULT_A11Y_PREFS };
  }
}

/** מסדר מחדש לצורת JSON קנונית — כדי לא לשמר שדות זבל שהצטברו בעבר. */
export function serializeA11yPrefs(prefs: A11yPrefs): string {
  const clean: A11yPrefs = {
    fontScale: clampFontScale(prefs.fontScale),
    highContrast: coerceBoolean(prefs.highContrast),
    highlightLinks: coerceBoolean(prefs.highlightLinks),
    reducedMotion: coerceBoolean(prefs.reducedMotion),
    readableFont: coerceBoolean(prefs.readableFont),
  };
  return JSON.stringify(clean);
}

/**
 * ממזגת את שלוש ההעדפות שנשמרות בחשבון (high_contrast / font_scale /
 * reduced_motion — הטור העמוד ב-user_settings) לתוך העדפות הווידג'ט
 * המקומיות, ומשמרת שדות שקיימים רק בווידג'ט (highlightLinks, readableFont)
 * שאין להם מקבילה בחשבון.
 *
 * סדר עדיפויות (ראו גם ההערה ב-AccountPreferences.tsx): הגדרות החשבון
 * הן "מקור האמת" עבור משתמש מחובר — לכן כשהן נטענות, הן דורסות את שלושת
 * השדות המקבילים בהעדפות המקומיות; שדות שהחשבון לא מכיר נשארים כפי שהיו.
 */
export function mergeAccountSettingsIntoPrefs(
  settings: { high_contrast?: unknown; font_scale?: unknown; reduced_motion?: unknown },
  current: A11yPrefs,
): A11yPrefs {
  return {
    ...current,
    fontScale: clampFontScale(settings.font_scale),
    highContrast: coerceBoolean(settings.high_contrast),
    reducedMotion: coerceBoolean(settings.reduced_motion),
  };
}
