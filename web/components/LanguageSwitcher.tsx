"use client";

import { SUPPORTED_LOCALES, type AppLocale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { ChevronDown } from "@/components/icons";

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  return <label className={`language-switcher${compact ? " compact" : ""}`}>
    {!compact && <span>{t("language.label")}</span>}
    <span className="language-switcher-control">
      <b aria-hidden="true">{locale.toUpperCase()}</b>
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
      <ChevronDown size={13} aria-hidden="true" />
    </span>
  </label>;
}
