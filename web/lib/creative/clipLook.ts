// נקודת האמת היחידה למראה של קליפ.
//
// גם התצוגה המקדימה וגם הייצוא קוראים לפונקציה הזו, ולכן אי-אפשר שהם יסטו:
// אם מישהו ישנה את חישוב הלוק, שני המסלולים משתנים יחד. זו הדרך היחידה
// לקיים בפועל את חוזה הפאריטי, במקום לתחזק שתי נוסחאות מקבילות ולקוות.

import { Clip, clipContrast, clipEffectAmount, clipSaturation } from "@/lib/editor/model";
import { effectById, scaleEffect } from "./effects";

export interface ClipLook {
  /** ערך מוכן ל-CSS filter בתצוגה המקדימה. */
  css: string;
  /** שרשרת פילטרים ל-FFmpeg, בלי פסיק מוביל או עוקב. ריק = בלי עיבוד. */
  ffmpeg: string;
}

const EMPTY: ClipLook = { css: "none", ffmpeg: "" };

/**
 * מרכיב את מראה הקליפ משני מקורות:
 *  1. הלוק מהקטלוג (`effectId`), בעוצמה `effectAmount`.
 *  2. תיקוני contrast/saturation ידניים שהמשתמש כיוונן ב-Inspector.
 * הידני מוחל *אחרי* הלוק, כך שכיוונון תמיד גובר — בשני המסלולים.
 */
export function clipLook(clip: Clip): ClipLook {
  const parts: string[] = [];
  const cssParts: string[] = [];

  const effect = effectById(clip.effectId);
  if (effect && effect.id !== "none") {
    const scaled = scaleEffect(effect, clipEffectAmount(clip));
    if (scaled.ffmpeg) parts.push(scaled.ffmpeg);
    if (scaled.css && scaled.css !== "none") cssParts.push(scaled.css);
  }

  const contrast = clipContrast(clip);
  const saturation = clipSaturation(clip);
  if (Math.abs(contrast - 1) > 0.0005 || Math.abs(saturation - 1) > 0.0005) {
    parts.push(`eq=contrast=${contrast.toFixed(3)}:saturation=${saturation.toFixed(3)}`);
    cssParts.push(`contrast(${contrast.toFixed(3)}) saturate(${saturation.toFixed(3)})`);
  }

  if (!parts.length && !cssParts.length) return EMPTY;
  return {
    css: cssParts.length ? cssParts.join(" ") : "none",
    ffmpeg: parts.join(","),
  };
}

/** האם לקליפ יש עיבוד חזותי כלשהו — לדילוג על עבודה מיותרת. */
export function hasLook(clip: Clip): boolean {
  return clipLook(clip).ffmpeg.length > 0;
}
