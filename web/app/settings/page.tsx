"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PROVIDER_PREF } from "@/lib/keys";
import { Provider } from "@/lib/agent/types";
import { flattenApiConfig, getProviderStatuses, type ApiConfigShape } from "@/lib/providers/health";
import { LLM_PROVIDERS, PROVIDER_REGISTRY } from "@/lib/providers/registry";
import type { ProviderStatusInfo } from "@/lib/providers/types";

export default function SettingsPage() {
  const [provider, setProvider] = useState<Provider>("deepseek");
  const [cfg, setCfg] = useState<ApiConfigShape>({});

  useEffect(() => {
    setProvider(((localStorage.getItem(PROVIDER_PREF) as Provider) || "deepseek"));
    fetch("/api/config").then((r) => r.json()).then(setCfg).catch(() => {});
  }, []);

  const save = (p: Provider) => {
    setProvider(p);
    localStorage.setItem(PROVIDER_PREF, p);
  };

  const statuses = getProviderStatuses(flattenApiConfig(cfg));
  const statusById = Object.fromEntries(statuses.map((status) => [status.id, status])) as Record<string, ProviderStatusInfo>;

  const Status = ({ status }: { status: ProviderStatusInfo }) =>
    status.status === "ready"
      ? <span className="ok">✓ מוכן</span>
      : <span className="err">— {status.status === "missing_key" ? "חסר מפתח" : "לא זמין"}</span>;

  return (
    <div>
      <header className="site-header">
        <Link href="/" className="brand">hypescript</Link>
        <nav>
          <Link href="/">חזרה לעורך</Link>
        </nav>
      </header>
      <div className="container">
      <div className="hero">
        <h1>הגדרות</h1>
        <p>המפתחות נשמרים כמשתני-סביבה ב-Vercel (או ב-<code>web/.env.local</code> להרצה מקומית) — לא בדפדפן ולא בקוד.</p>
        <p style={{ color: "var(--muted)", fontSize: 13 }}>
          התחברות Google (אופציונלי): ראה מדריך <Link href="https://github.com/elchanany/hypescript/blob/main/docs/SETUP_AUTH.md">SETUP_AUTH.md</Link>
          {" · "}
          <Link href="/dashboard">לוח פרויקטים</Link>
          {" · "}
          <Link href="/login">התחברות</Link>
        </p>
      </div>

      <div className="card">
        <h2>תמלול</h2>
        {PROVIDER_REGISTRY.filter((p) => p.kind === "transcribe").map((p) => {
          const status = statusById[p.id];
          return (
            <div key={p.id} className="row" style={{ justifyContent: "space-between" }}>
              <span>{p.labelHe} · משתנה <code>{p.envKeys.join(" / ")}</code></span>
              <Status status={status} />
            </div>
          );
        })}
        <div className="hint">מפתח חינם: console.groq.com/keys</div>
      </div>

      <div className="card">
        <h2>ספק ה-AI לסוכן</h2>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>בחר ספק, ודא שהמפתח שלו מוגדר ב-Vercel. הסוכן ישתמש בספק שנבחר.</p>
        <div className="controls">
          {LLM_PROVIDERS.map((p) => (
            <label key={p.id} className="check" style={{ justifyContent: "space-between", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: provider === p.id ? "var(--card-2)" : "transparent" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="radio" name="prov" checked={provider === p.id} onChange={() => save(p.id)} />
                {p.labelHe}
              </span>
              <Status status={statusById[p.id]} />
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
        <ol style={{ color: "var(--muted)", lineHeight: 1.9, margin: 0, paddingInlineStart: 20 }}>
          <li>Vercel → הפרויקט → Settings → Environment Variables.</li>
          <li>הוסף את שם המשתנה (למשל <code>DEEPSEEK_API_KEY</code>) ואת הערך, ושמור.</li>
          <li>Redeploy כדי שהמפתח ייכנס לתוקף.</li>
          <li>הרצה מקומית: הוסף אותם ל-<code>web/.env.local</code>.</li>
        </ol>
      </div>
      </div>
    </div>
  );
}
