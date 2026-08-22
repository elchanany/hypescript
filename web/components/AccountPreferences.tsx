"use client";
import { useEffect, useState } from "react";
import { Download, Save, Trash2 } from "@/components/icons";
import { toast } from "@/lib/ui/toast";
import { LoadingState } from "@/components/LoadingState";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { SUPPORTED_LOCALES, type AddressForm, type AppLocale } from "@/lib/i18n/config";
import { readStoredA11yPrefs, writeStoredA11yPrefs } from "@/lib/a11y/apply";
import { mergeAccountSettingsIntoPrefs } from "@/lib/a11y/prefs";
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
// סדר עדיפויות בין הווידג'ט הצף (localStorage, לכל מבקר כולל אנונימי) לבין
// שלוש ההעדפות שנשמרות בחשבון (high_contrast / font_scale / reduced_motion,
// user_settings ב-Supabase): החשבון הוא "מקור האמת" עבור משתמש מחובר, כי
// הוא חוצה מכשירים ומבטא בחירה מכוונת. לכן בכל טעינה של עמוד החשבון, וגם
// אחרי כל שמירה מוצלחת, אנחנו דורסים את שלושת השדות המקבילים ב-localStorage
// (ומחילים מיד על ה-DOM) — כדי שהמכשיר הזה יתיישר עם החשבון. שדות שקיימים
// רק בווידג'ט (הדגשת קישורים, גופן קריא) אין להם מקבילה בחשבון ונשארים
// כפי שהיו. שינוי הפוך — מהווידג'ט לחשבון בשרת — לא ממומש בכוונה: זה היה
// דורש קריאת רשת בכל טעינת עמוד ציבורי כדי לבדוק אם המבקר מחובר, מה
// שסותר את הדרישה שהווידג'ט יעבוד באופן מקומי לגמרי למבקר אנונימי. כך
// שני המנגנונים לעולם לא "רבים": כל עוד לא ביקרת ב-/account, הווידג'ט
// שולט; ברגע שביקרת (או שמרת שם), החשבון דורס ומאותו רגע הוא הערך המקומי.
function syncA11yFromAccount(settings: State["settings"]) {
  writeStoredA11yPrefs(mergeAccountSettingsIntoPrefs(settings, readStoredA11yPrefs()));
}

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
        if (data.settings) syncA11yFromAccount(data.settings);
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
    if (r.ok) {
      toast.success(t("common.saved"));
      syncA11yFromAccount(v.settings);
    } else {
      toast.error(t("common.saveFailed"));
    }
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
