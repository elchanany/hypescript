"use client";

import { SUPPORTED_LOCALES, type AppLocale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  return <label className={`language-switcher${compact ? " compact" : ""}`}>
    {!compact && <span>{t("language.label")}</span>}
    <select value={locale} onChange={(event) => {
      const next = event.target.value as AppLocale;
      setLocale(next);
      void fetch("/api/preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: next }),
      }).catch(() => {});
    }} aria-label={t("language.label")}>
      {SUPPORTED_LOCALES.map((item) => <option key={item} value={item}>{t(`language.${item}` as const)}</option>)}
    </select>
  </label>;
}
