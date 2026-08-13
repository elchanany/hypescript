"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/lib/auth/useAuth";
import { postLoginPath, postLoginPathForUser } from "@/lib/auth/session";
import { authIssueMessage, type AuthDiagnostics } from "@/lib/auth/config";
import { getSupabaseBrowser } from "@/lib/auth/supabase";

type Tab = "login" | "signup" | "magic" | "reset";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const urlError = params.get("error");
  const urlMsg = params.get("msg");
  const {
    configured, loading, user, error, clearError,
    signInWithGoogle, signInWithPassword, signUpWithPassword, signInWithMagicLink, resetPassword,
  } = useAuth();

  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [authDiag, setAuthDiag] = useState<AuthDiagnostics | null>(null);

  useEffect(() => {
    if (urlError) {
      const raw = urlMsg ? decodeURIComponent(urlMsg) : "ההתחברות נכשלה. נסה שוב.";
      // Prefer Hebrew guidance for the common Vercel misconfig.
      if (/invalid api key/i.test(raw)) {
        setLocalError("מפתח Supabase לא תקין. ב-Vercel חייב להיות Publishable/anon ב־NEXT_PUBLIC_SUPABASE_ANON_KEY (לא Secret), מאותו פרויקט כמו ה-URL, בלי מרכאות — ואז Redeploy.");
      } else {
        setLocalError(raw);
      }
    }
  }, [urlError, urlMsg]);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((j) => {
        if (j?.auth) {
          setAuthDiag({
            configured: !!j.auth.supabase,
            urlHost: j.auth.urlHost ?? null,
            keyKind: j.auth.keyKind ?? "unknown",
            keyLen: j.auth.keyLen ?? 0,
            issue: j.auth.issue ?? null,
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && user) {
      const sb = getSupabaseBrowser();
      if (!sb) router.replace(postLoginPath(next));
      else void postLoginPathForUser(sb, next).then((path) => router.replace(path));
    }
  }, [loading, user, router, next]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError(); setInfo(null); setLocalError(null); setBusy(true);
    try {
      if (tab === "login") {
        const ok = await signInWithPassword(email, password);
        if (ok) {
          // Don't wait only on useEffect — navigate once session exists
          const sb = getSupabaseBrowser();
          router.replace(sb ? await postLoginPathForUser(sb, next) : postLoginPath(next));
        }
      } else if (tab === "signup") {
        const ok = await signUpWithPassword(email, password);
        if (ok) setInfo("נשלח אימייל אימות (אם נדרש). אפשר גם להתחבר עם Google.");
      } else if (tab === "magic") {
        const ok = await signInWithMagicLink(email);
        if (ok) setInfo("נשלח קישור התחברות לאימייל שלך.");
      } else if (tab === "reset") {
        const ok = await resetPassword(email);
        if (ok) setInfo("נשלח קישור לאיפוס סיסמה.");
      }
    } finally {
      setBusy(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand-row">
          <BrandLogo variant="horizontal" size="md" theme="auto" priority />
        </div>
        <h1>התחברות ל־Hypescript</h1>
        <p className="auth-sub">
          הפרויקטים נשמרים בענן מאובטח כברירת מחדל, ותמיד אפשר לבחור שמירה מקומית בהגדרות.
        </p>

        {!configured || authDiag?.issue ? (
          <div className="auth-warn">
            <strong>{authDiag?.issue ? "הגדרות ההתחברות לא תקינות" : "התחברות עדיין לא מופעלת."}</strong>
            <p>
              {authIssueMessage(authDiag?.issue ?? "missing_both") ||
                "הגדר Supabase לפי docs/SETUP_AUTH.md."}
            </p>
            {authDiag?.urlHost && (
              <p className="hint" style={{ marginTop: 8 }}>
                פרויקט מזוהה: <code dir="ltr">{authDiag.urlHost}</code>
                {authDiag.keyKind ? <> · סוג מפתח: <code dir="ltr">{authDiag.keyKind}</code></> : null}
                {authDiag.keyLen ? <> · אורך: {authDiag.keyLen}</> : null}
              </p>
            )}
            <p style={{ marginTop: 8 }}>
              ב-Vercel → Settings → Environment Variables:
              <br />1) <code dir="ltr">NEXT_PUBLIC_SUPABASE_URL</code> = <code dir="ltr">https://xxxx.supabase.co</code>
              <br />2) <code dir="ltr">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> = Publishable / anon בלבד
              <br />3) Save → Deployments → Redeploy
            </p>
            <Link href="/" className="btn primary tall" style={{ marginTop: 12, display: "inline-flex" }}>
              המשך בלי התחברות (עורך מקומי)
            </Link>
          </div>
        ) : (
          <>
            <button
              className="btn primary tall auth-google"
              onClick={() => signInWithGoogle(next)}
              disabled={loading || busy}
            >
              המשך עם Google
            </button>

            <div className="auth-divider"><span>או באימייל</span></div>

            <div className="auth-tabs" role="tablist">
              {([
                ["login", "התחברות"],
                ["signup", "הרשמה"],
                ["magic", "קישור"],
                ["reset", "איפוס"],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  className={`auth-tab ${tab === id ? "on" : ""}`}
                  onClick={() => { setTab(id); clearError(); setInfo(null); setLocalError(null); }}
                >
                  {label}
                </button>
              ))}
            </div>

            <form className="auth-form" onSubmit={onSubmit}>
              <label className="dlg-field">
                אימייל
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  dir="ltr"
                />
              </label>
              {(tab === "login" || tab === "signup") && (
                <label className="dlg-field">
                  סיסמה
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete={tab === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    dir="ltr"
                  />
                </label>
              )}
              <button className="btn primary tall" type="submit" disabled={busy}>
                {busy ? "רגע…" : tab === "login" ? "התחבר" : tab === "signup" ? "הרשמה" : tab === "magic" ? "שלח קישור" : "שלח איפוס"}
              </button>
            </form>

            {displayError && <div className="auth-error" role="alert">{displayError}</div>}
            {info && <div className="auth-info" role="status">{info}</div>}

            <p className="auth-legal">
              בהמשך השימוש אתה מאשר את <a href="/legal/terms">תנאי השימוש</a> ואת <a href="/legal/privacy">מדיניות הפרטיות</a>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-brand-row">
            <BrandLogo variant="horizontal" size="md" theme="auto" priority decorative />
          </div>
          <p className="auth-sub">טוען…</p>
        </div>
      </div>
    }>
      <LoginInner />
    </Suspense>
  );
}
