"use client";

import { SUPPORTED_LOCALES, type AppLocale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { SelectField } from "@/components/ui";

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  return <label className={`language-switcher${compact ? " compact" : ""}`}>
    {!compact && <span>{t("language.label")}</span>}
    <SelectField
      value={locale}
      ariaLabel={t("language.label")}
      prefix={locale.toUpperCase()}
      options={SUPPORTED_LOCALES.map((item) => ({ value: item, label: t(`language.${item}` as const) }))}
      onValueChange={(value) => {
        const next = value as AppLocale;
        setLocale(next);
        void fetch("/api/preferences", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ locale: next }),
        }).catch(() => {});
      }}
    />
  </label>;
}
