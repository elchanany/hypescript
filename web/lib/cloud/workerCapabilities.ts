// מה שרת הייצוא המהיר *שפרוס כרגע* יודע לעשות.
//
// למה בכלל לשאול: העובד והאתר נפרסים בנפרד. אם האתר יניח יכולת שהעובד עדיין
// לא פרס, התוצאה הגרועה ביותר תתרחש — הייצוא "יצליח" ויחזיר וידאו בלי
// כתוביות, בשקט. לכן היכולות נקראות מהעובד עצמו, ועובד ישן שלא מדווח עליהן
// נחשב כמי שאינו תומך — כלומר ההתנהגות הקיימת (רינדור בדפדפן) נשמרת.

export interface WorkerCapabilities {
  subtitles: boolean;
  imageOverlays: boolean;
  textOverlays: boolean;
  audioMix: boolean;
}

export const NO_CAPABILITIES: WorkerCapabilities = {
  subtitles: false,
  imageOverlays: true, // העובד תמך בזה מאז ומתמיד, גם לפני שדיווח יכולות
  textOverlays: false,
  audioMix: true,
};

/** ברירת מחדל בטוחה: כל דגל שאינו `true` מפורש נחשב "לא נתמך". */
export function parseWorkerCapabilities(raw: unknown): WorkerCapabilities {
  const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  return {
    subtitles: value.subtitles === true,
    imageOverlays: value.imageOverlays === true ? true : NO_CAPABILITIES.imageOverlays,
    textOverlays: value.textOverlays === true,
    audioMix: value.audioMix === true ? true : NO_CAPABILITIES.audioMix,
  };
}
