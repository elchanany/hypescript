"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { DEFAULT_DATA_MODE_PREF, PROVIDER_PREF, TRANSCRIBE_MODEL_PREF, TRANSCRIBE_PREF } from "@/lib/keys";
import { Provider } from "@/lib/agent/types";
import { flattenApiConfig, getProviderStatuses, type ApiConfigShape } from "@/lib/providers/health";
import { LLM_PROVIDERS, PROVIDER_REGISTRY } from "@/lib/providers/registry";
import { getProviderApprovals, setProviderBillingApproval } from "@/lib/providers/policy";
import type { ProviderId, ProviderStatusInfo } from "@/lib/providers/types";
import type { TranscribeProviderPref } from "@/lib/elevenlabs/prefs";
import { useTheme, type ThemeMode } from "@/lib/theme/ThemeProvider";
import type { DataMode } from "@/lib/projects/types";

interface CloudStatus {
  configured: boolean;
  authenticated: boolean;
  services: { database: boolean; storage: boolean; renderer: boolean };
  live: { database: boolean; storage: boolean };
  missing: string[];
}

export default function SettingsPage() {
  const { mode, setMode } = useTheme();
  const [provider, setProvider] = useState<Provider>("deepseek");
  const [transcribePref, setTranscribePref] = useState<TranscribeProviderPref>("auto");
  const [transcribeModel, setTranscribeModel] = useState("");
  const [cfg, setCfg] = useState<ApiConfigShape>({});
  const [billingApprovals, setBillingApprovals] = useState<Partial<Record<ProviderId, boolean>>>({});
  const [cloud, setCloud] = useState<CloudStatus | null>(null);
  const [defaultDataMode, setDefaultDataMode] = useState<DataMode>("cloud");

  useEffect(() => {
    setProvider(((localStorage.getItem(PROVIDER_PREF) as Provider) || "deepseek"));
    const tp = localStorage.getItem(TRANSCRIBE_PREF) as TranscribeProviderPref | null;
    if (tp === "auto" || tp === "elevenlabs" || tp === "groq") setTranscribePref(tp);
    setTranscribeModel(localStorage.getItem(TRANSCRIBE_MODEL_PREF) || "");
    const savedMode = localStorage.getItem(DEFAULT_DATA_MODE_PREF);
    if (savedMode === "cloud" || savedMode === "local" || savedMode === "hybrid") setDefaultDataMode(savedMode);
    fetch("/api/config").then((r) => r.json()).then(setCfg).catch(() => {});
    fetch("/api/cloud/status").then((r) => r.json()).then(setCloud).catch(() => setCloud(null));
    const approvals = getProviderApprovals().approved;
    setBillingApprovals(Object.fromEntries(Object.keys(approvals).map((id) => [id, true])));
  }, []);

  const save = (p: Provider) => {
    setProvider(p);
    localStorage.setItem(PROVIDER_PREF, p);
  };

  const saveTranscribePref = (p: TranscribeProviderPref) => {
    setTranscribePref(p);
    localStorage.setItem(TRANSCRIBE_PREF, p);
  };

  const saveTranscribeModel = (m: string) => {
    setTranscribeModel(m);
    if (m.trim()) localStorage.setItem(TRANSCRIBE_MODEL_PREF, m.trim());
    else localStorage.removeItem(TRANSCRIBE_MODEL_PREF);
  };

  const saveDefaultDataMode = (mode: DataMode) => {
    setDefaultDataMode(mode);
    localStorage.setItem(DEFAULT_DATA_MODE_PREF, mode);
  };

  const setBillingApproval = (id: ProviderId, approved: boolean) => {
    setProviderBillingApproval(id, approved);
    setBillingApprovals((current) => ({ ...current, [id]: approved }));
  };

  const statuses = getProviderStatuses(flattenApiConfig(cfg));
  const statusById = Object.fromEntries(statuses.map((status) => [status.id, status])) as Record<string, ProviderStatusInfo>;

  const Status = ({ status }: { status: ProviderStatusInfo }) =>
    status.status === "ready"
      ? <span className="ok">✓ נבדק וזמין</span>
      : status.status === "configured_unverified"
        ? <span title={status.reasonHe}>◐ מוגדר · לא נבדק</span>
      : <span className="err">— {status.status === "missing_key" ? "חסר מפתח" : "לא זמין"}</span>;

  const BillingApproval = ({ id }: { id: ProviderId }) => {
    const definition = PROVIDER_REGISTRY.find((item) => item.id === id)!;
    return (
      <label className="check" title={definition.billingNoteHe} style={{ fontSize: 12 }}>
        <input type="checkbox" checked={!!billingApprovals[id]} onChange={(event) => setBillingApproval(id, event.target.checked)} />
        אישור שימוש במכסה/חיוב חיצוני
      </label>
    );
  };

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
        <h2>תמלול</h2>
        {PROVIDER_REGISTRY.filter((p) => p.kind === "transcribe").map((p) => {
          const status = statusById[p.id];
          return (
            <div key={p.id} className="row" style={{ justifyContent: "space-between" }}>
              <span>{p.labelHe} · משתנה <code>{p.envKeys.join(" / ")}</code></span>
              <span style={{ display: "grid", justifyItems: "end", gap: 5 }}><Status status={status} /><BillingApproval id={p.id} /></span>
            </div>
          );
        })}
        <div className="hint" style={{ marginTop: 10 }}>
          Groq חינם: console.groq.com/keys · ElevenLabs (בתשלום, מדויק יותר): elevenlabs.io/app/developers/api-keys
        </div>

        <h3 style={{ marginTop: 18, marginBottom: 8 }}>ספק תמלול ברירת מחדל</h3>
        <div className="controls">
          {([
            ["auto", "אוטומטי (ElevenLabs אם קיים, אחרת Groq)"],
            ["elevenlabs", "ElevenLabs Scribe"],
            ["groq", "Groq Whisper"],
          ] as const).map(([id, label]) => (
            <label key={id} className="check" style={{ justifyContent: "space-between", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: transcribePref === id ? "var(--card-2)" : "transparent" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="radio" name="tx" checked={transcribePref === id} onChange={() => saveTranscribePref(id)} />
                {label}
              </span>
            </label>
          ))}
        </div>

        <label style={{ display: "block", marginTop: 14, color: "var(--text-2)" }}>
          מודל תמלול ספציפי (אופציונלי)
          <input
            type="text"
            value={transcribeModel}
            onChange={(e) => saveTranscribeModel(e.target.value)}
            placeholder="למשל scribe_v2 או whisper-large-v3 — ריק = ברירת מחדל"
            style={{ display: "block", width: "100%", marginTop: 6, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card-2)", color: "inherit" }}
          />
        </label>
        <div className="hint" style={{ marginTop: 8 }}>
          הסוכן יכול גם לקבל מודל/ספק בכל קריאה ל-<code>transcribe_video</code>. מודלים מומלצים: <code>scribe_v2</code> (ElevenLabs), <code>whisper-large-v3</code> (Groq).
        </div>
      </div>

      <div className="card">
        <h2>קריינות (ElevenLabs)</h2>
        {PROVIDER_REGISTRY.filter((p) => p.kind === "voice").map((p) => {
          const status = statusById[p.id];
          return (
            <div key={p.id} className="row" style={{ justifyContent: "space-between" }}>
              <span>{p.labelHe} · אותו משתנה <code>{p.envKeys.join(" / ")}</code></span>
              <span style={{ display: "grid", justifyItems: "end", gap: 5 }}><Status status={status} /><BillingApproval id={p.id} /></span>
            </div>
          );
        })}
        <div className="hint" style={{ marginTop: 10 }}>
          אותו מפתח מאפשר גם קריינות (TTS), רשימת קולות ומודלים. הרשאות מומלצות במפתח: Speech to Text, Text to Speech, Voices Read, Models Access.
          פירוט מלא: <code>docs/ElevenLabs_API_HypeScript_2026-08-04.md</code>.
        </div>
      </div>

      <div className="card">
        <h2>יצירת תמונות (OpenAI GPT Image)</h2>
        {PROVIDER_REGISTRY.filter((p) => p.kind === "image").map((p) => {
          const status = statusById[p.id];
          return (
            <div key={p.id} className="row" style={{ justifyContent: "space-between" }}>
              <span>{p.labelHe} · אותו משתנה <code>{p.envKeys.join(" / ")}</code></span>
              <span style={{ display: "grid", justifyItems: "end", gap: 5 }}><Status status={status} /><BillingApproval id={p.id} /></span>
            </div>
          );
        })}
        <div className="hint" style={{ marginTop: 10 }}>
          אותו מפתח OpenAI (OPENAI_API_KEY) מאפשר גם את הסוכן. אישור החיוב נפרד מאישור ה-LLM — הסוכן ישאל לפני יצירת תמונה ראשונה.
        </div>
      </div>

      <div className="card">
        <h2>ספק ה-AI לסוכן</h2>
        <p style={{ color: "var(--text-2)", marginTop: 0 }}>בחר ספק, ודא שהמפתח שלו מוגדר ב-Vercel. הסוכן ישתמש בספק שנבחר.</p>
        <div className="controls">
          {LLM_PROVIDERS.map((p) => (
            <label key={p.id} className="check" style={{ justifyContent: "space-between", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: provider === p.id ? "var(--card-2)" : "transparent" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="radio" name="prov" checked={provider === p.id} onChange={() => save(p.id)} />
                {p.labelHe}
              </span>
              <span style={{ display: "grid", justifyItems: "end", gap: 5 }}><Status status={statusById[p.id]} /><BillingApproval id={p.id} /></span>
            </label>
          ))}
        </div>
        <div className="hint" style={{ marginTop: 12 }}>
          משתני הסביבה: {LLM_PROVIDERS.map((p, i) => (
            <span key={p.id}>{i > 0 ? ", " : ""}<code>{p.envKeys.join(" / ")}</code></span>
          ))}.
        </div>
      </div>

      <div className="card">
        <h2>איך מגדירים מפתח</h2>
        <ol style={{ color: "var(--text-2)", lineHeight: 1.9, margin: 0, paddingInlineStart: 20 }}>
          <li>Vercel → הפרויקט → Settings → Environment Variables.</li>
          <li>הוסף את שם המשתנה (למשל <code>ELEVENLABS_API_KEY</code> או <code>DEEPSEEK_API_KEY</code>) ואת הערך, ושמור.</li>
          <li>Redeploy כדי שהמפתח ייכנס לתוקף.</li>
          <li>הרצה מקומית: הוסף אותם ל-<code>web/.env.local</code>.</li>
          <li>ל-ElevenLabs: צור מפתח מוגבל (<code>hypescript-runtime</code>) עם הרשאות מינימליות בלבד — ראה המפרט ב-<code>docs/</code>.</li>
        </ol>
      </div>
      </div>
    </div>
  );
}
