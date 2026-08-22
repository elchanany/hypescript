// ממיר A11yPrefs לתכונות data-* ומשתנה CSS על <html>. קובץ נפרד מ-apply.ts
// כדי שאפשר יהיה להריץ את אותה פונקציה גם מתוך סקריפט קדם-הציור המוטבע
// ב-layout.tsx (JS גולמי, בלי import) — שני המקומות חייבים להסכים על אותם
// שמות תכונות בדיוק, והתיעוד כאן הוא המקור היחיד להם.
//
// שמות ה-data-* (must match the inline pre-paint script in layout.tsx):
//   data-contrast="high"        — ניגודיות גבוהה
//   data-motion="reduce"        — הפחתת תנועה
//   data-readable-font="1"      — גופן קריא
//   data-link-highlight="1"     — הדגשת קישורים
//   --hs-font-scale (inline style on <html>) — מכפיל גודל טקסט

import type { A11yPrefs } from "./prefs";

export function applyA11yPrefsToDom(root: HTMLElement, prefs: A11yPrefs): void {
  if (prefs.highContrast) root.dataset.contrast = "high";
  else delete root.dataset.contrast;

  if (prefs.reducedMotion) root.dataset.motion = "reduce";
  else delete root.dataset.motion;

  if (prefs.readableFont) root.dataset.readableFont = "1";
  else delete root.dataset.readableFont;

  if (prefs.highlightLinks) root.dataset.linkHighlight = "1";
  else delete root.dataset.linkHighlight;

  root.style.setProperty("--hs-font-scale", String(prefs.fontScale));
}
