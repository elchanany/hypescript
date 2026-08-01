"use client";

import { useEffect, useState } from "react";
import { PROVIDER_PREF } from "@/lib/keys";
import { Provider, PROVIDER_LABELS } from "@/lib/agent/types";

const ENV_VARS: Record<string, string> = {
  groq: "GROQ_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
};

export default function SettingsPage() {
  const [provider, setProvider] = useState<Provider>("deepseek");
  const [cfg, setCfg] = useState<{ providers?: Record<string, boolean>; transcription?: { groq: boolean } }>({});

  useEffect(() => {
    setProvider(((localStorage.getItem(PROVIDER_PREF) as Provider) || "deepseek"));
    fetch("/api/config").then((r) => r.json()).then(setCfg).catch(() => {});
  }, []);

  const save = (p: Provider) => {
    setProvider(p);
    localStorage.setItem(PROVIDER_PREF, p);
  };

  const Status = ({ ok }: { ok?: boolean }) =>
    ok ? <span className="ok">✓ מוגדר</span> : <span className="err">— חסר מפתח</span>;

  return (
    <div>
      <div className="hero">
        <h1>הגדרות</h1>
        <p>המפתחות נשמרים כמשתני-סביבה ב-Vercel (או ב-<code>web/.env.local</code> להרצה מקומית) — לא בדפדפן ולא בקוד.</p>
      </div>

      <div className="card">
        <h2>תמלול</h2>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span>Groq (Whisper) · משתנה <code>{ENV_VARS.groq}</code></span>
          <Status ok={cfg.transcription?.groq} />
        </div>
        <div className="hint">מפתח חינם: console.groq.com/keys</div>
      </div>

      <div className="card">
        <h2>ספק ה-AI לסוכן</h2>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>בחר ספק, ודא שהמפתח שלו מוגדר ב-Vercel. הסוכן ישתמש בספק שנבחר.</p>
        <div className="controls">
          {(["deepseek", "openai", "anthropic", "gemini"] as Provider[]).map((p) => (
            <label key={p} className="check" style={{ justifyContent: "space-between", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: provider === p ? "var(--card-2)" : "transparent" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="radio" name="prov" checked={provider === p} onChange={() => save(p)} />
                {PROVIDER_LABELS[p]}
              </span>
              <Status ok={cfg.providers?.[p]} />
            </label>
          ))}
        </div>
        <div className="hint" style={{ marginTop: 12 }}>
          משתני הסביבה: <code>DEEPSEEK_API_KEY</code>, <code>OPENAI_API_KEY</code>, <code>ANTHROPIC_API_KEY</code>, <code>GEMINI_API_KEY</code>.
        </div>
      </div>

      <div className="card">
        <h2>איך מגדירים מפתח</h2>
        <ol style={{ color: "var(--muted)", lineHeight: 1.9, margin: 0, paddingInlineStart: 20 }}>
          <li>Vercel → הפרויקט → Settings → Environment Variables.</li>
          <li>הוסף את שם המשתנה (למשל <code>DEEPSEEK_API_KEY</code>) ואת הערך, ושמור.</li>
          <li>Redeploy כדי שהמפתח ייכנס לתוקף.</li>
          <li>הרצה מקומית: הוסף אותם ל-<code>web/.env.local</code>.</li>
        </ol>
      </div>
    </div>
  );
}
