"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { DEFAULT_DATA_MODE_PREF } from "@/lib/keys";
import { flattenApiConfig, getProviderStatuses, type ApiConfigShape } from "@/lib/providers/health";
import { PROVIDER_REGISTRY } from "@/lib/providers/registry";
import type { ProviderStatusInfo } from "@/lib/providers/types";
import { useTheme, type ThemeMode } from "@/lib/theme/ThemeProvider";
import type { DataMode } from "@/lib/projects/types";
import { LoadingState } from "@/components/LoadingState";

interface CloudStatus {
  configured: boolean;
  authenticated: boolean;
  services: { database: boolean; storage: boolean; renderer: boolean };
  live: { database: boolean; storage: boolean };
  missing: string[];
}

export default function SettingsPage() {
  const { mode, setMode } = useTheme();
  const [cfg, setCfg] = useState<ApiConfigShape>({});
  const [cloud, setCloud] = useState<CloudStatus | null>(null);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [defaultDataMode, setDefaultDataMode] = useState<DataMode>("cloud");

  useEffect(() => {
    const savedMode = localStorage.getItem(DEFAULT_DATA_MODE_PREF);
    if (savedMode === "cloud" || savedMode === "local" || savedMode === "hybrid") setDefaultDataMode(savedMode);
    Promise.allSettled([
      fetch("/api/config").then((r) => r.json()).then(setCfg),
      fetch("/api/cloud/status").then((r) => r.json()).then(setCloud),
    ]).finally(() => setServicesLoading(false));
  }, []);

  const saveDefaultDataMode = (mode: DataMode) => {
    setDefaultDataMode(mode);
    localStorage.setItem(DEFAULT_DATA_MODE_PREF, mode);
  };


  const statuses = getProviderStatuses(flattenApiConfig(cfg));
  const statusById = Object.fromEntries(statuses.map((status) => [status.id, status])) as Record<string, ProviderStatusInfo>;

  const Status = ({ status }: { status: ProviderStatusInfo }) =>
    status.status === "ready"
      ? <span className="ok">✓ נבדק וזמין</span>
      : status.status === "configured_unverified"
        ? <span title={status.reasonHe}>◐ מוגדר · לא נבדק</span>
      : <span className="err">— {status.status === "missing_key" ? "חסר מפתח" : "לא זמין"}</span>;


  return (
    <div>
      <header className="site-header">
        <Link href="/dashboard" className="brand" aria-label="Hypescript">
          <BrandLogo variant="horizontal" size="sm" theme="auto" decorative />
        </Link>
        <nav>
          <Link href="/dashboard">לוח פרויקטים</Link>
          <Link href="/">חזרה לעורך</Link>
        </nav>
      </header>
      <div className="container">
      <div className="hero">
        <h1>הגדרות</h1>
        <p>המפתחות נשמרים כמשתני-סביבה ב-Vercel (או ב-<code>web/.env.local</code> להרצה מקומית) — לא בדפדפן ולא בקוד.</p>
        <p style={{ color: "var(--text-2)", fontSize: 13 }}>
          התחברות Google (אופציונלי): ראה מדריך <Link href="https://github.com/elchanany/hypescript/blob/main/docs/SETUP_AUTH.md">SETUP_AUTH.md</Link>
          {" · "}
          <Link href="/dashboard">לוח פרויקטים</Link>
          {" · "}
          <Link href="/login">התחברות</Link>
        </p>
      </div>

      <div className="card">
        <h2>מראה</h2>
        <div className="controls">
          {([
            ["system", "לפי המערכת"],
            ["dark", "כהה"],
            ["light", "בהיר"],
          ] as const).map(([id, label]) => (
            <label key={id} className="check" style={{ justifyContent: "space-between", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: mode === id ? "var(--card-2)" : "transparent" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="radio" name="theme" checked={mode === id} onChange={() => setMode(id as ThemeMode)} />
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>ערכת מותג</h2>
        <p style={{ color: "var(--text-2)" }}>
          פרופיל ארגון לשיתוף בין הפרויקטים: צבעים, הנחיות ניסוח, לוגו ותמונות ייחוס — נשמר מקומית במכשיר בלבד, זמין לסוכן.
        </p>
        <div className="row">
          <Link href="/settings/brand" className="btn primary" style={{ textDecoration: "none" }}>ניהול ערכת מותג</Link>
        </div>
      </div>

      {servicesLoading && <LoadingState label="בודק שירותי ענן, אחסון וספקי AI…" lines={3} />}

      <div className="card" id="workspace-storage">
        <h2>שמירת פרויקטים</h2>
        <p style={{ color: "var(--text-2)", marginTop: 0 }}>
          ברירת המחדל היא ענן: מסמך העריכה ב־Supabase, קובצי המקור ב־Cloudflare R2 ורינדור ב־Cloud Run. הבחירה חלה על פרויקטים חדשים.
        </p>
        <div className="settings-choice-grid">
          {([
            ["cloud", "ענן · מומלץ", "סנכרון בין מכשירים, גיבוי והעלאת מדיה אוטומטית."],
            ["hybrid", "משולב", "מסמך העריכה בענן; קובצי מקור יכולים להישאר מקומיים."],
            ["local", "מקומי בלבד", "הכול נשמר בדפדפן במכשיר הזה. ללא גיבוי ענן."],
          ] as const).map(([id, label, description]) => (
            <label key={id} className={`settings-choice ${defaultDataMode === id ? "on" : ""}`}>
              <input type="radio" name="default-data-mode" checked={defaultDataMode === id} onChange={() => saveDefaultDataMode(id)} />
              <span><strong>{label}</strong><small>{description}</small></span>
            </label>
          ))}
        </div>
        <div className="hint" style={{ marginTop: 12 }}>פרויקטים קיימים אינם מועברים או נמחקים אוטומטית בעת שינוי ההגדרה.</div>
      </div>
      <nav className="settings-hub-nav" aria-label="קטגוריות הגדרות"><a href="#appearance">מראה ונגישות</a><a href="#workspace-storage">פרויקטים וענן</a><a href="#providers">AI וספקים</a><Link href="/settings/brand">ערכת מותג</Link><Link href="/account">חשבון, פרטיות וחיוב</Link></nav>

      <div className="card" id="appearance">
        <h2>ענן ורינדור</h2>
        <p style={{ color: "var(--text-2)" }}>
          פרויקטים ונכסים פרטיים ב־Supabase + Cloudflare R2, ורינדור FFmpeg ב־Google Cloud Run. המפתחות נשארים בצד השרת בלבד.
        </p>
        {!cloud ? (
          <div className="hint">בדיקת הענן אינה זמינה כרגע.</div>
        ) : (
          <div className="controls">
            {([
              ["מסד נתונים", cloud.services.database, cloud.live.database],
              ["אחסון R2", cloud.services.storage, cloud.live.storage],
              ["רינדור Cloud Run", cloud.services.renderer, null],
            ] as const).map(([label, configured, live]) => (
              <div key={label} className="row" style={{ justifyContent: "space-between" }}>
                <span>{label}</span>
                <span className={configured && live !== false ? "ok" : "err"}>
                  {!configured ? "— חסרה הגדרה" : live === false ? "— מוגדר אך בדיקה נכשלה" : live === true ? "✓ מחובר ונבדק" : "◐ מוגדר · ייבדק ברינדור ראשון"}
                </span>
              </div>
            ))}
            {!cloud.authenticated && <div className="hint">יש להתחבר כדי לבצע בדיקת חיבור חיה ולפתוח פרויקטים בענן.</div>}
            {cloud.missing.length > 0 && <div className="hint">חסרים: <code>{cloud.missing.join(", ")}</code></div>}
            <div className="row">
              <Link href="https://github.com/elchanany/hypescript/blob/main/docs/SETUP_CLOUD.md" className="btn" style={{ textDecoration: "none" }}>מדריך חיבור הענן</Link>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>אודות המוצר</h2>
        <div className="brand-about">
          <BrandLogo variant="icon" size="lg" decorative />
          <div>
            <strong>Hypescript</strong>
            <p>עריכת וידאו מקצועית עם סוכן AI מובנה — מקומי לפרטיות או בענן לפי בחירה.</p>
          </div>
        </div>
      </div>

      <div className="card" id="providers">
        <h2>AI ותמלול מנוהלים</h2>
        <p style={{ color: "var(--text-2)", marginTop: 0 }}>למשתמש רגיל אין שום מפתח להגדיר ושום מודל לבחור. Hypescript משתמש במפתחות השרת ומחליף ספק אוטומטית במקרה תקלה.</p>
        <div className="managed-provider-summary">
          <div><strong>תמלול ראשי</strong><span>ElevenLabs Scribe — חותמות מילה, דוברים ואירועי שמע.</span><Status status={statusById["elevenlabs-transcribe"]} /></div>
          <div><strong>גיבוי תמלול</strong><span>Groq Whisper — מופעל רק כש־ElevenLabs אינו זמין; תוצג אזהרת איכות מופחתת.</span><Status status={statusById["groq-transcribe"]} /></div>
          <div><strong>עריכה חכמה</strong><span>ספק מנוהל וזמין נבחר בשרת. שם הספק והמודל אינם חלק מחוויית המשתמש.</span></div>
        </div>
        <div className="hint" style={{ marginTop: 12 }}>מנויי Pro יכולים לעבור ל־BYOK ולהזין מפתחות מוצפנים מתוך הגדרות ה־AI הקטנות בצ׳אט. רק אז מוצגת בחירת ספק.</div>
      </div>
      </div>
    </div>
  );
}
