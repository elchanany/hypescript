// יצירת קובץ ASS לצריבת כתוביות בשרת הייצוא המהיר.
//
// למה ASS ולא הדרך של הדפדפן: בדפדפן כל כתובית מצוירת ל-PNG דרך canvas
// ומוטמעת כשכבה. זה נותן התאמה מושלמת לתצוגה המקדימה, אבל זה גם אומר להעלות
// מאות תמונות קטנות לפני כל ייצוא. בענן, libass מצייר את אותו טקסט ישירות
// בתוך אותו מעבר קידוד — בלי העלאות ובלי מעבר נוסף.
//
// ההבדל שכן קיים: libass אינו מנוע הטיפוגרפיה של הדפדפן, ולכן שבירת שורות
// וריווח עשויים להיות שונים במעט מהתצוגה המקדימה. לכן היכולת הזו נשלטת
// בדגל יכולת (workerBurnsCaptions) ולא נדלקת מעצמה.
//
// הפונקציות כאן טהורות — בלי DOM, בלי רשת — כדי שאפשר יהיה לבדוק את הפלט
// מול ffmpeg אמיתי בבדיקה, ולא רק "המחרוזת נראית נכון".

import type { CaptionStyle } from "@/lib/editor/captionStyle";
import { normalizeCaptionStyle } from "@/lib/editor/captionStyle";
import type { Sub } from "@/lib/editor/subtitlesEdl";

export interface AssTarget {
  width: number;
  height: number;
}

/** שעה:דקה:שנייה.מאיות — הפורמט היחיד ש-ASS מקבל. */
export function assTime(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const centis = Math.round(safe * 100);
  const h = Math.floor(centis / 360000);
  const m = Math.floor((centis % 360000) / 6000);
  const s = Math.floor((centis % 6000) / 100);
  const cs = centis % 100;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

/**
 * ‎#rrggbb -> ‎&HaabbggrrR של ASS. שים לב לשני הפכים: הסדר הוא BGR ולא RGB,
 * והאלפא הפוך (00 = אטום מלא). טעות באחד מהם נותנת צבע שגוי בשקט.
 */
export function assColor(hex: string, alpha = 0): string {
  const clean = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.slice(1) : "ffffff";
  const rr = clean.slice(0, 2), gg = clean.slice(2, 4), bb = clean.slice(4, 6);
  const aa = Math.max(0, Math.min(255, Math.round(alpha))).toString(16).padStart(2, "0");
  return `&H${aa}${bb}${gg}${rr}`.toUpperCase();
}

/** יישור ASS לפי numpad: 2 = תחתון-מרכז, 5 = אמצע-מרכז, 8 = עליון-מרכז. */
export function assAlignment(position: CaptionStyle["position"]): number {
  if (position === "top") return 8;
  if (position === "center") return 5;
  return 2;
}

/** טקסט של אירוע: פסיקים ושורות חדשות הם תחביר ב-ASS ולכן חייבים בריחה. */
export function assEscapeText(text: string): string {
  return String(text || "")
    .replace(/‏/g, "")          // RLM מיותר — libass לא צריך אותו והוא מבלבל שבירה
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\r?\n/g, "\\N")
    .trim();
}

export interface BuildAssOptions {
  /** ברירת המחדל היא גופן עברי שקיים בתמונת העובד. */
  fallbackFont?: string;
}

const DEFAULT_FONT = "Noto Sans Hebrew";

/**
 * בונה קובץ ASS שלם. PlayResX/Y נקבעים לפי גודל הפריים בפועל, כך שכל המידות
 * (גודל גופן, שוליים) הן ביחידות הפריים ולא צריכות סקיילינג נוסף.
 */
export function buildAssFile(
  subs: Sub[],
  style: CaptionStyle | null | undefined,
  target: AssTarget,
  opts: BuildAssOptions = {},
): string {
  const st = normalizeCaptionStyle(style);
  const width = Math.max(16, Math.round(target.width));
  const height = Math.max(16, Math.round(target.height));
  const short = Math.min(width, height);
  const fontPx = Math.max(12, Math.round((st.fontSize / 100) * short));
  const marginH = Math.round(width * 0.06);
  const marginV = Math.round(height * 0.06);
  const font = (st.fontFamily || opts.fallbackFont || DEFAULT_FONT).replace(/[,\r\n]/g, " ").trim();

  // "box" = פס אטום מאחורי הטקסט (BorderStyle 3), "soft" = אותו פס בשקיפות,
  // "none" = בלי רקע, ואז מתאר שחור דק כדי שהטקסט יישאר קריא על רקע בהיר.
  const borderStyle = st.bg === "none" ? 1 : 3;
  const backAlpha = st.bg === "box" ? 0x40 : st.bg === "soft" ? 0xa0 : 0xff;
  const outline = st.bg === "none" ? Math.max(1, Math.round(fontPx * 0.045)) : Math.round(fontPx * 0.28);
  const shadow = st.bg === "none" ? Math.max(1, Math.round(fontPx * 0.03)) : 0;

  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "YCbCr Matrix: TV.709",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour,"
      + " Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline,"
      + " Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    [
      "Style: Default",
      font,
      String(fontPx),
      assColor(st.color),
      assColor(st.color),
      assColor("#000000"),
      assColor("#000000", backAlpha),
      st.bold ? "-1" : "0",
      "0", "0", "0", "100", "100", "0", "0",
      String(borderStyle),
      String(outline),
      String(shadow),
      String(assAlignment(st.position)),
      String(marginH), String(marginH), String(marginV),
      "1",
    ].join(","),
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];

  const events = subs
    .filter((sub) => sub && sub.end > sub.start && assEscapeText(sub.text))
    .sort((a, b) => a.start - b.start)
    .map((sub) => `Dialogue: 0,${assTime(sub.start)},${assTime(sub.end)},Default,,0,0,0,,${assEscapeText(sub.text)}`);

  return [...header, ...events, ""].join("\n");
}

/**
 * בריחת נתיב עבור מסנן `ass=` של FFmpeg.
 *
 * הנקודתיים הן מפריד ארגומנטים בתוך מסנן, ולכן נתיב עם אות כונן ("C:/...")
 * שובר את כל שרשרת המסננים אם לא בורחים ממנה. הבריחה היא חד-שכבתית ובלי
 * מרכאות עוטפות — נוסה מול FFmpeg 8.0.1 בפועל; בריחה כפולה או ציטוט נוסף
 * מייצרים "No option name near". בעובד (לינוקס) הנתיב הוא /tmp/... וממילא
 * אין בו נקודתיים, אבל ההתנהגות חייבת להיות נכונה בשני המקרים.
 */
export function escapeFilterPath(path: string): string {
  return String(path).replace(/\\/g, "/").replace(/([:'])/g, "\\$1");
}
