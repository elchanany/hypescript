// לאן הייצוא הולך בפועל — ולמה. פונקציות טהורות, בלי React ובלי רשת.
//
// הרקע: הייצוא ניסה קודם את הענן, ואם משהו לא התאים נפל בשקט לרינדור בדפדפן
// (console.warn + blob = null) — בזמן שחלון הייצוא המשיך לכתוב "מייצאים את
// הסרטון בענן" ו"הרינדור מתבצע על שרתי הענן של Google". כלומר המשתמש קיבל
// חצי שעה של טחינה על המחשב שלו, ונאמר לו שזה רץ בענן.
//
// שתי בעיות נפרדות שהופרדו כאן:
//   1. *האם* מותר ענן — decideCloudRoute, עם סיבה מפורשת לכל דחייה.
//   2. *מה מספרים למשתמש* — renderRouteMessage, שאף פעם לא מדבר על ענן
//      כשהעבודה רצה על המכשיר.

export type RenderLocation = "cloud" | "device";

export type CloudSkipReason =
  | "project_is_local"
  | "media_still_uploading"
  | "media_not_in_cloud"
  | "text_overlay_unsupported"
  | "captions_unsupported"
  | "cloud_failed"
  | "cloud_quota";

export interface CloudRouteInput {
  /** מדיניות הפרויקט מבקשת ביצוע בענן ויש לו מזהה פרויקט בענן. */
  policyAllowsCloud: boolean;
  /** כל הקליפים והאודיו כבר קיימים כנכס בענן. */
  allMediaInCloud: boolean;
  /** יש העלאה שרצה כרגע ברקע. */
  uploadInFlight: boolean;
  /** קיימת שכבת טקסט (העובד יודע לצרוב רק תמונות). */
  hasTextOverlay: boolean;
  /** המשתמש ביקש כתוביות צרובות ויש כתוביות בפועל. */
  wantsBurnedCaptions: boolean;
  /** העובד שפרוס כרגע מדווח שהוא יודע לצרוב כתוביות. */
  workerBurnsCaptions: boolean;
}

export interface CloudRouteDecision {
  eligible: boolean;
  reason?: CloudSkipReason;
}

/**
 * הסדר כאן הוא סדר החשיבות למשתמש: קודם מה שהוא יכול לתקן בעצמו (להמתין
 * להעלאה), אחר כך מגבלות אמיתיות של המערכת.
 */
export function decideCloudRoute(input: CloudRouteInput): CloudRouteDecision {
  if (!input.policyAllowsCloud) return { eligible: false, reason: "project_is_local" };
  if (input.uploadInFlight) return { eligible: false, reason: "media_still_uploading" };
  if (!input.allMediaInCloud) return { eligible: false, reason: "media_not_in_cloud" };
  if (input.hasTextOverlay) return { eligible: false, reason: "text_overlay_unsupported" };
  if (input.wantsBurnedCaptions && !input.workerBurnsCaptions) {
    return { eligible: false, reason: "captions_unsupported" };
  }
  return { eligible: true };
}

const REASON_HE: Record<CloudSkipReason, string> = {
  project_is_local: "הפרויקט מוגדר לעבודה מקומית, ולכן הייצוא רץ על המכשיר.",
  media_still_uploading: "יש קובץ שעדיין עולה לענן. אפשר להמתין לסיום ההעלאה ולייצא שוב — זה יהיה הרבה יותר מהיר.",
  media_not_in_cloud: "חלק מהמדיה עדיין לא נמצאת בענן, ולכן הייצוא רץ על המכשיר.",
  text_overlay_unsupported: "יש שכבת טקסט, ושרת הייצוא המהיר עדיין לא יודע לצרוב טקסט — לכן הייצוא רץ על המכשיר.",
  captions_unsupported: "כתוביות צרובות עדיין נצרבות על המכשיר. אפשר לייצא בלי צריבת כתוביות כדי לקבל ייצוא מהיר בענן.",
  cloud_failed: "שרת הייצוא המהיר לא היה זמין, ולכן הייצוא ממשיך על המכשיר.",
  cloud_quota: "נגמרה מכסת הייצוא בענן בחשבון, ולכן הייצוא ממשיך על המכשיר.",
};

/** הסבר בעברית למה לא בענן. מחרוזת ריקה כשאין מה להסביר. */
export function cloudSkipMessage(reason?: CloudSkipReason): string {
  return reason ? REASON_HE[reason] : "";
}

export interface RenderRouteMessage {
  /** כותרת חלון הייצוא. */
  titleHe: string;
  /** שורת ההסבר מתחת לכותרת. */
  noteHe: string;
}

/**
 * הטקסט שמוצג בחלון הייצוא. הכלל היחיד שאסור לשבור: כשהעבודה רצה על המכשיר,
 * המילה "ענן" לא מופיעה כתיאור של מה שקורה עכשיו.
 */
export function renderRouteMessage(location: RenderLocation, reason?: CloudSkipReason): RenderRouteMessage {
  if (location === "cloud") {
    return {
      titleHe: "מייצאים את הסרטון בענן",
      noteHe: "הרינדור מתבצע על שרת הייצוא המהיר. אפשר להסתיר את החלון ולהמשיך לעבוד.",
    };
  }
  const why = cloudSkipMessage(reason);
  return {
    titleHe: "מייצאים את הסרטון על המכשיר",
    noteHe: why
      ? why + " אפשר להסתיר את החלון ולהמשיך לעבוד, אבל ייצוא על המכשיר איטי משמעותית."
      : "הייצוא מתבצע על המחשב שלך. אפשר להסתיר את החלון ולהמשיך לעבוד, אבל זה איטי משמעותית מייצוא בענן.",
  };
}

/** ממפה כשל של קריאת הענן לסיבה — כדי שההודעה תבדיל בין "לא זמין" ל"נגמרה מכסה". */
export function cloudFailureReason(error: unknown): CloudSkipReason {
  const text = error instanceof Error ? error.message : String(error || "");
  if (/402|quota|limit_reached|render_seconds/i.test(text)) return "cloud_quota";
  return "cloud_failed";
}
