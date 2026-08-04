"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme, ThemeMode } from "@/lib/theme/ThemeProvider";

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading, configured } = useAuth();
  const { mode, setMode } = useTheme();
  const [step, setStep] = useState<Step>(1);
  const [displayName, setDisplayName] = useState("");
  const [usageType, setUsageType] = useState("personal");
  const [projectMode, setProjectMode] = useState("ask");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && configured && !user) router.replace("/login?next=/onboarding");
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
      localStorage.setItem("hs_onboarding_done", "1");
      localStorage.setItem("hs_display_name", displayName.trim());
      localStorage.setItem("hs_usage_type", usageType);
      localStorage.setItem("hs_default_project_mode", projectMode);
      router.replace("/dashboard");
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
            <label className="dlg-field">
              ברירת מחדל לפרויקטים
              <select value={projectMode} onChange={(e) => setProjectMode(e.target.value)}>
                <option value="ask">שאל בכל פרויקט</option>
                <option value="local">Local</option>
                <option value="cloud">Cloud</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </label>
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
                {busy ? "שומר…" : "ללוח הבקרה"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
