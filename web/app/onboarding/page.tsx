"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme, ThemeMode } from "@/lib/theme/ThemeProvider";
import { getSupabaseBrowser } from "@/lib/auth/supabase";

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading, configured } = useAuth();
  const { mode, setMode } = useTheme();
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
    if (!accepted) { setError("יש לאשר את תנאי השימוש ומדיניות הפרטיות."); return; }
    setBusy(true); setError(null);
    try {
      const sb = getSupabaseBrowser();
      if (sb && user) {
        const { error: profileError } = await sb.from("profiles").update({
          display_name: displayName.trim(),
          usage_type: usageType,
          onboarding_completed: true,
          terms_accepted_at: new Date().toISOString(),
          privacy_accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", user.id);
        if (profileError) throw profileError;
      }
      localStorage.setItem("hs_onboarding_done", "1");
      localStorage.setItem("hs_display_name", displayName.trim());
      localStorage.setItem("hs_usage_type", usageType);
      localStorage.setItem("hs_default_project_mode", "cloud");
      localStorage.setItem("hs_first_project_flow", "1");
      const next = "/dashboard?welcome=1";
      sessionStorage.removeItem("hs_post_onboarding");
      router.replace(next);
    } catch (e: any) {
      setError(e?.message || "שגיאה בשמירה");
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
        <h1>ברוך הבא ל־Hypescript</h1>
        <p className="auth-sub">הגדרה קצרה לפני שמתחילים. אפשר לשנות הכל אחר כך בהגדרות.</p>

        {step === 1 && (
          <div className="onb-step">
            <label className="dlg-field">
              שם תצוגה
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="השם שלך" />
            </label>
            <label className="dlg-field">
              סוג שימוש
              <select value={usageType} onChange={(e) => setUsageType(e.target.value)}>
                <option value="personal">אישי</option>
                <option value="nonprofit">עמותה</option>
                <option value="business">עסק</option>
                <option value="team">צוות</option>
              </select>
            </label>
            <button className="btn primary tall" disabled={!displayName.trim()} onClick={() => setStep(2)}>המשך</button>
          </div>
        )}

        {step === 2 && (
          <div className="onb-step">
            <label className="dlg-field">
              מראה
              <select value={mode} onChange={(e) => setMode(e.target.value as ThemeMode)}>
                <option value="system">לפי המערכת</option>
                <option value="dark">כהה</option>
                <option value="light">בהיר</option>
              </select>
            </label>
            <div className="onb-managed-note"><strong>הכול מוכן בשבילך</strong><span>פרויקטים נשמרים בענן ו־Hypescript מנהל את שירותי ה־AI. לא צריך לבחור מודל, ספק או מפתח.</span></div>
            <div className="onb-actions">
              <button className="btn" onClick={() => setStep(1)}>חזרה</button>
              <button className="btn primary" onClick={() => setStep(3)}>המשך</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onb-step">
            <label className="check">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
              <span>אני מסכים/ה ל<a href="/legal/terms" target="_blank" rel="noreferrer">תנאי השימוש</a> ול<a href="/legal/privacy" target="_blank" rel="noreferrer">מדיניות הפרטיות</a>.</span>
            </label>
            {error && <div className="auth-error">{error}</div>}
            <div className="onb-actions">
              <button className="btn" onClick={() => setStep(2)}>חזרה</button>
              <button className="btn primary" disabled={busy || !accepted} onClick={finish}>
                {busy ? "מכין את סביבת העבודה…" : "צור את הפרויקט הראשון"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
