"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme, ThemeMode } from "@/lib/theme/ThemeProvider";
import { getSupabaseBrowser } from "@/lib/auth/supabase";
import { useI18n } from "@/lib/i18n/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { type AddressForm } from "@/lib/i18n/config";

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading, configured } = useAuth();
  const { mode, setMode } = useTheme();
  const { locale, addressForm, setAddressForm, t, addressed } = useI18n();
  const [step, setStep] = useState<Step>(1);
  const [displayName, setDisplayName] = useState("");
  const [usageType, setUsageType] = useState("personal");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only bounce after auth finished loading — never during the brief session hydrate.
    if (loading) return;
    if (configured && !user) router.replace("/login?next=/onboarding");
  }, [loading, configured, user, router]);

  useEffect(() => {
    if (user) {
      const meta = user.user_metadata || {};
      setDisplayName(String(meta.full_name || meta.name || user.email?.split("@")[0] || ""));
    }
  }, [user]);

  const finish = async () => {
    if (!accepted) { setError(t("onboarding.accept")); return; }
    setBusy(true); setError(null);
    try {
      const sb = getSupabaseBrowser();
      if (sb && user) {
        const profileUpdate = {
          display_name: displayName.trim(),
          usage_type: usageType,
          locale,
          address_form: addressForm,
          onboarding_completed: true,
          terms_accepted_at: new Date().toISOString(),
          privacy_accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        let { error: profileError } = await sb.from("profiles").update(profileUpdate).eq("id", user.id);
        if (profileError?.code === "42703") {
          const { address_form: _pendingMigration, ...legacyProfileUpdate } = profileUpdate;
          ({ error: profileError } = await sb.from("profiles").update(legacyProfileUpdate).eq("id", user.id));
        }
        if (profileError) throw profileError;
      }
      localStorage.setItem("hs_onboarding_done", "1");
      localStorage.setItem("hs_display_name", displayName.trim());
      localStorage.setItem("hs_usage_type", usageType);
      localStorage.setItem("hs_address_form", addressForm);
      localStorage.setItem("hs_default_project_mode", "cloud");
      localStorage.setItem("hs_first_project_flow", "1");
      const next = "/dashboard?welcome=1";
      sessionStorage.removeItem("hs_post_onboarding");
      router.replace(next);
    } catch (e: any) {
      setError(e?.message || t("onboarding.saveError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card onboarding-card">
        <div className="auth-brand-row">
          <BrandLogo variant={step === 1 ? "horizontal" : "icon"} size={step === 1 ? "md" : "sm"} theme="dark" priority />
        </div>
        <h1>{addressed({ male: "onboarding.welcome.male", female: "onboarding.welcome.female", plural: "onboarding.welcome.plural" })}</h1>
        <p className="auth-sub">{t("onboarding.subtitle")}</p>

        {step === 1 && (
          <div className="onb-step">
            <label className="dlg-field">
              {t("onboarding.displayName")}
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t("onboarding.namePlaceholder")} />
            </label>
            <LanguageSwitcher />
            <label className="dlg-field">
              {t("address.label")}
              <select value={addressForm} onChange={(e) => setAddressForm(e.target.value as AddressForm)}>
                <option value="male">{t("address.male")}</option>
                <option value="female">{t("address.female")}</option>
                <option value="plural">{t("address.plural")}</option>
                <option value="unspecified">{t("address.unspecified")}</option>
              </select>
              <small>{t("address.help")}</small>
            </label>
            <label className="dlg-field">
              {t("onboarding.usage")}
              <select value={usageType} onChange={(e) => setUsageType(e.target.value)}>
                <option value="personal">{t("usage.personal")}</option>
                <option value="nonprofit">{t("usage.nonprofit")}</option>
                <option value="business">{t("usage.business")}</option>
                <option value="team">{t("usage.team")}</option>
              </select>
            </label>
            <button className="btn primary tall" disabled={!displayName.trim()} onClick={() => setStep(2)}>{t("common.continue")}</button>
          </div>
        )}

        {step === 2 && (
          <div className="onb-step">
            <label className="dlg-field">
              {t("onboarding.appearance")}
              <select value={mode} onChange={(e) => setMode(e.target.value as ThemeMode)}>
                <option value="system">{t("theme.system")}</option>
                <option value="dark">{t("theme.dark")}</option>
                <option value="light">{t("theme.light")}</option>
              </select>
            </label>
            <div className="onb-managed-note"><strong>{t("onboarding.ready")}</strong><span>{t("onboarding.managed")}</span></div>
            <div className="onb-actions">
              <button className="btn" onClick={() => setStep(1)}>{t("common.back")}</button>
              <button className="btn primary" onClick={() => setStep(3)}>{t("common.continue")}</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onb-step">
            <label className="check">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
              <span>{t("onboarding.terms")} <a href="/legal/terms" target="_blank" rel="noreferrer">↗ Terms</a> · <a href="/legal/privacy" target="_blank" rel="noreferrer">↗ Privacy</a></span>
            </label>
            {error && <div className="auth-error">{error}</div>}
            <div className="onb-actions">
              <button className="btn" onClick={() => setStep(2)}>{t("common.back")}</button>
              <button className="btn primary" disabled={busy || !accepted} onClick={finish}>
                {busy ? t("onboarding.preparing") : t("onboarding.create")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
