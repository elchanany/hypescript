"use client";

// ווידג'ט נגישות צף — זמין בכל עמוד ציבורי (welcome/login/legal/*), וגם
// בשאר האפליקציה כי הוא נטען פעם אחת ב-layout.tsx. עובד למשתמש אנונימי
// לגמרי: כל ההעדפות נשמרות ב-localStorage ומוחלות מיידית על ה-DOM, בלי
// תלות בחשבון או בחיבור לרשת. ראו web/lib/a11y/prefs.ts לתיעוד סדר
// העדיפויות מול הגדרות החשבון (AccountPreferences.tsx).

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { RotateCcw, X } from "@/components/icons";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { readStoredA11yPrefs, resetStoredA11yPrefs, writeStoredA11yPrefs } from "@/lib/a11y/apply";
import { DEFAULT_A11Y_PREFS, stepFontScale, type A11yPrefs } from "@/lib/a11y/prefs";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function AccessibilityWidget() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<A11yPrefs>(DEFAULT_A11Y_PREFS);
  const widgetRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const titleId = useId();

  // קורא את ההעדפות השמורות רק אחרי mount — סקריפט קדם-הציור ב-layout.tsx
  // כבר החיל אותן על ה-DOM לפני שהדף צויר, כך שאין הבהוב; הקריאה כאן רק
  // מסנכרנת את מצב ה-React כדי שהפקדים בפאנל יציגו את הערכים הנכונים.
  useEffect(() => {
    setPrefs(readStoredA11yPrefs());
  }, []);

  const update = (patch: Partial<A11yPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    writeStoredA11yPrefs(next);
  };

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const handleReset = () => {
    setPrefs(resetStoredA11yPrefs());
  };

  // מלכודת פוקוס + Escape, בזמן שהפאנל פתוח בלבד.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusables = () => Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    focusables()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const els = focusables();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const onOutsideClick = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onOutsideClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onOutsideClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="a11y-widget" ref={widgetRef}>
      <button
        ref={buttonRef}
        type="button"
        className="a11y-fab"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        aria-label={t("a11y.buttonLabel")}
        onClick={() => setOpen((o) => !o)}
      >
        <AccessibilityGlyph />
      </button>
      {open && (
        <div
          id={panelId}
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="a11y-panel"
        >
          <div className="a11y-panel-head">
            <h2 id={titleId}>{t("a11y.panelTitle")}</h2>
            <button type="button" className="a11y-panel-close" aria-label={t("a11y.close")} onClick={close}>
              <X size={15} />
            </button>
          </div>

          <div className="a11y-text-size">
            <span>{t("account.textSize")}</span>
            <div className="a11y-text-size-controls">
              <button
                type="button"
                aria-label={t("a11y.decreaseText")}
                onClick={() => update({ fontScale: stepFontScale(prefs.fontScale, -1) })}
              >
                A-
              </button>
              <output aria-live="polite">{Math.round(prefs.fontScale * 100)}%</output>
              <button
                type="button"
                aria-label={t("a11y.increaseText")}
                onClick={() => update({ fontScale: stepFontScale(prefs.fontScale, 1) })}
              >
                A+
              </button>
            </div>
          </div>

          <label className="settings-switch">
            <input
              type="checkbox"
              checked={prefs.highContrast}
              onChange={(e) => update({ highContrast: e.target.checked })}
            />
            <span>{t("account.highContrast")}</span>
          </label>
          <label className="settings-switch">
            <input
              type="checkbox"
              checked={prefs.highlightLinks}
              onChange={(e) => update({ highlightLinks: e.target.checked })}
            />
            <span>{t("a11y.highlightLinks")}</span>
          </label>
          <label className="settings-switch">
            <input
              type="checkbox"
              checked={prefs.reducedMotion}
              onChange={(e) => update({ reducedMotion: e.target.checked })}
            />
            <span>{t("account.reduceMotion")}</span>
          </label>
          <label className="settings-switch">
            <input
              type="checkbox"
              checked={prefs.readableFont}
              onChange={(e) => update({ readableFont: e.target.checked })}
            />
            <span>{t("a11y.readableFont")}</span>
          </label>

          <div className="a11y-panel-foot">
            <button type="button" className="btn secondary" onClick={handleReset}>
              <RotateCcw size={14} />
              {t("a11y.reset")}
            </button>
            <Link href="/legal/accessibility" onClick={close}>
              {t("a11y.statementLink")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/** סמל "גישה אוניברסלית" מוטמע — אין אייקון כזה בספריית האייקונים הקיימת. */
function AccessibilityGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="7.2" r="1.6" fill="currentColor" />
      <path
        d="M6.5 9.6c3.6 1.1 7.4 1.1 11 0M12 9.6v3.1l2.6 5.4M12 12.7l-2.6 5.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
