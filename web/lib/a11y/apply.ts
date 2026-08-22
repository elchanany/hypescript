"use client";

// שכבת ה-DOM/localStorage מעל web/lib/a11y/prefs.ts. מופרדת מהלוגיקה הטהורה
// כדי שאפשר יהיה לייבא את prefs.ts גם משרת (route.ts) בלי לגרור התייחסות
// ל-window/document/localStorage למודול שרץ ב-Node.

import { applyA11yPrefsToDom as coreApply } from "./dom";
import { DEFAULT_A11Y_PREFS, parseA11yPrefs, serializeA11yPrefs, type A11yPrefs } from "./prefs";

/** אותו מפתח localStorage שסקריפט קדם-הציור ב-layout.tsx קורא ממנו. */
export const A11Y_STORAGE_KEY = "hs_a11y_prefs";

export function readStoredA11yPrefs(): A11yPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_A11Y_PREFS };
  try {
    return parseA11yPrefs(window.localStorage.getItem(A11Y_STORAGE_KEY));
  } catch {
    return { ...DEFAULT_A11Y_PREFS };
  }
}

export function writeStoredA11yPrefs(prefs: A11yPrefs): void {
  applyA11yPrefsToDom(prefs);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(A11Y_STORAGE_KEY, serializeA11yPrefs(prefs));
  } catch {
    /* localStorage לא זמין (מצב פרטי חוסם וכו') — עדיין החלנו על ה-DOM. */
  }
}

export function applyA11yPrefsToDom(prefs: A11yPrefs): void {
  if (typeof document === "undefined") return;
  coreApply(document.documentElement, prefs);
}

export function resetStoredA11yPrefs(): A11yPrefs {
  const next = { ...DEFAULT_A11Y_PREFS };
  writeStoredA11yPrefs(next);
  return next;
}
