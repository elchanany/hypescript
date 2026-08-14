"use client";
import { useEffect, useState } from "react";
import { Download, Save, Trash2 } from "@/components/icons";
import { toast } from "@/lib/ui/toast";
import { LoadingState } from "@/components/LoadingState";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { SUPPORTED_LOCALES, type AddressForm, type AppLocale } from "@/lib/i18n/config";
type State = {
  profile: {
    display_name: string;
    locale: string;
    address_form: AddressForm;
    timezone: string;
    usage_type: string | null;
  };
  settings: {
    theme: string;
    reduced_motion: boolean;
    notify_email: boolean;
    notify_in_app: boolean;
    analytics_consent: boolean;
    high_contrast: boolean;
    font_scale: number;
    marketing_email: boolean;
    provider_mode: string;
  };
};
export default function AccountPreferences() {
  const { locale, addressForm, setLocale, setAddressForm, t } = useI18n();
  const [v, setV] = useState<State | null>(null),
    [busy, setBusy] = useState(false),
    [unavailable, setUnavailable] = useState(false),
    [canUseByok, setCanUseByok] = useState(false);
  useEffect(() => {
    fetch("/api/account")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setV(data);
        if (SUPPORTED_LOCALES.includes(data.profile?.locale)) setLocale(data.profile.locale as AppLocale);
        if (data.profile?.address_form) setAddressForm(data.profile.address_form);
      })
      .catch(() => setUnavailable(true));
    fetch("/api/providers/byok").then((r) => r.ok ? r.json() : null).then((data) => setCanUseByok(data?.canUseByok === true)).catch(() => {});
  }, []);
  if (unavailable)
    return <section className="account-preferences"><strong>{t("account.schemaPending")}</strong><p>{t("account.continues")}</p></section>;
  if (!v) return <LoadingState label={t("account.loading")} lines={3} compact />;
  const save = async () => {
    setBusy(true);
    const r = await fetch("/api/account", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(v),
    });
    setBusy(false);
    r.ok ? toast.success(t("common.saved")) : toast.error(t("common.saveFailed"));
  };
  const del = async () => {
    if (
      !confirm(
        t("account.deleteConfirm"),
      )
    )
      return;
    const r = await fetch("/api/account", { method: "DELETE" });
    if (r.ok) location.href = "/welcome";
    else toast.error(t("account.deleteFailed"));
  };
  return (
    <section className="account-preferences">
      <div className="account-section-head">
        <div>
          <span className="account-eyebrow">{t("account.profilePrivacy")}</span>
          <h2>{t("account.control")}</h2>
        </div>
        <button className="btn primary" onClick={save} disabled={busy}>
          <Save size={15} />
          {busy ? t("common.saving") : t("common.save")}
        </button>
      </div>
      <div className="account-settings-grid">
        <label>
          {t("account.displayName")}
          <input
            value={v.profile.display_name || ""}
            onChange={(e) =>
              setV({
                ...v,
                profile: { ...v.profile, display_name: e.target.value },
              })
            }
          />
        </label>
        <label>
          {t("language.label")}
          <select value={locale} onChange={(e) => {
            const next = e.target.value as AppLocale;
            setLocale(next);
            setV({ ...v, profile: { ...v.profile, locale: next } });
          }}>
            {SUPPORTED_LOCALES.map((item) => <option key={item} value={item}>{t(`language.${item}` as const)}</option>)}
          </select>
        </label>
        <label>
          {t("address.label")}
          <select value={addressForm} onChange={(e) => {
            const next = e.target.value as AddressForm;
            setAddressForm(next);
            setV({ ...v, profile: { ...v.profile, address_form: next } });
          }}>
            <option value="male">{t("address.male")}</option>
            <option value="female">{t("address.female")}</option>
            <option value="plural">{t("address.plural")}</option>
            <option value="unspecified">{t("address.unspecified")}</option>
          </select>
        </label>
        <label>
          {t("account.usageType")}
          <select
            value={v.profile.usage_type || "personal"}
            onChange={(e) =>
              setV({
                ...v,
                profile: { ...v.profile, usage_type: e.target.value },
              })
            }
          >
            <option value="personal">{t("usage.personal")}</option>
            <option value="business">{t("usage.business")}</option>
            <option value="nonprofit">{t("usage.nonprofit")}</option>
            <option value="team">{t("usage.team")}</option>
          </select>
        </label>
        <label>
          {t("account.textSize")}
          <input
            type="range"
            min=".85"
            max="1.35"
            step=".05"
            value={v.settings.font_scale}
            onChange={(e) =>
              setV({
                ...v,
                settings: { ...v.settings, font_scale: Number(e.target.value) },
              })
            }
          />
        </label>
        <label className="settings-switch">
          <input
            type="checkbox"
            checked={v.settings.high_contrast}
            onChange={(e) =>
              setV({
                ...v,
                settings: { ...v.settings, high_contrast: e.target.checked },
              })
            }
          />
          <span>{t("account.highContrast")}</span>
        </label>
        <label className="settings-switch">
          <input
            type="checkbox"
            checked={v.settings.reduced_motion}
            onChange={(e) =>
              setV({
                ...v,
                settings: { ...v.settings, reduced_motion: e.target.checked },
              })
            }
          />
          <span>{t("account.reduceMotion")}</span>
        </label>
        <label className="settings-switch">
          <input
            type="checkbox"
            checked={v.settings.analytics_consent}
            onChange={(e) =>
              setV({
                ...v,
                settings: {
                  ...v.settings,
                  analytics_consent: e.target.checked,
                },
              })
            }
          />
          <span>{t("account.analytics")}</span>
        </label>
        <label className="settings-switch">
          <input
            type="checkbox"
            checked={v.settings.marketing_email}
            onChange={(e) =>
              setV({
                ...v,
                settings: { ...v.settings, marketing_email: e.target.checked },
              })
            }
          />
          <span>{t("account.marketing")}</span>
        </label>
        <label className="settings-switch">
          <input
            type="checkbox"
            disabled={!canUseByok}
            checked={v.settings.provider_mode === "byok"}
            onChange={(e) =>
              setV({
                ...v,
                settings: {
                  ...v.settings,
                  provider_mode: e.target.checked ? "byok" : "managed",
                },
              })
            }
          />
          <span>{canUseByok ? t("account.byok") : t("account.byokPro")}</span>
        </label>
      </div>
      <div className="account-data-actions">
        <a className="btn secondary" href="/api/analytics">
          <Download size={15} />
          {t("account.export")}
        </a>
        <button className="btn danger" onClick={del}>
          <Trash2 size={15} />
          {t("account.delete")}
        </button>
      </div>
    </section>
  );
}
