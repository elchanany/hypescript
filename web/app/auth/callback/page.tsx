"use client";

// OAuth / magic-link return URL.
// Supabase may return either:
//   - PKCE: ?code=...
//   - Implicit/hash: #access_token=... (detectSessionInUrl)
// Never navigate to onboarding/dashboard without a confirmed session —
// that caused a bounce back to /login.

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import { getSupabaseBrowser } from "@/lib/auth/supabase";
import { postLoginPath, waitForSession } from "@/lib/auth/session";

function AuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [msg, setMsg] = useState("משלים התחברות…");

  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) {
      setMsg("התחברות לא מוגדרת.");
      router.replace("/login");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const url = new URL(window.location.href);
        const oauthError =
          url.searchParams.get("error_description") ||
          url.searchParams.get("error") ||
          params.get("error_description") ||
          params.get("error");

        if (oauthError) {
          setMsg(decodeURIComponent(oauthError));
          setTimeout(() => router.replace(`/login?error=1&msg=${encodeURIComponent(oauthError)}`), 1500);
          return;
        }

        const code = url.searchParams.get("code") || params.get("code");
        let session = (await sb.auth.getSession()).data.session;

        if (!session && code) {
          setMsg("מאמת התחברות…");
          const ex = await sb.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (ex.error) {
            setMsg(ex.error.message);
            setTimeout(() => {
              router.replace(`/login?error=1&msg=${encodeURIComponent(ex.error!.message)}`);
            }, 1500);
            return;
          }
          session = ex.data.session;
        }

        if (!session) {
          // Hash tokens / slow detectSessionInUrl
          setMsg("ממתין לאימות…");
          session = await waitForSession(sb, 8000);
        }

        if (cancelled) return;

        if (!session?.access_token) {
          setMsg("ההתחברות לא הושלמה. נסה שוב.");
          setTimeout(() => router.replace("/login?error=1&msg=" + encodeURIComponent("לא התקבלה סשן")), 1500);
          return;
        }

        // Clean URL (remove code/hash) without losing the app route
        try {
          window.history.replaceState({}, "", "/auth/callback");
        } catch { /* ignore */ }

        try {
          await fetch("/api/auth/bootstrap", {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
        } catch { /* non-fatal */ }

        try { sessionStorage.setItem("hs_just_logged_in", "1"); } catch { /* private mode */ }

        const dest = postLoginPath(next);
        setMsg("מעביר אותך הלאה…");
        router.replace(dest);
      } catch (e: any) {
        if (cancelled) return;
        const m = e?.message || "שגיאת התחברות";
        setMsg(m);
        setTimeout(() => router.replace(`/login?error=1&msg=${encodeURIComponent(m)}`), 1500);
      }
    })();

    return () => { cancelled = true; };
  }, [router, params, next]);

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand-row">
          <BrandLogo variant="icon" size="lg" theme="dark" priority decorative />
        </div>
        <h1>Hypescript</h1>
        <p className="auth-sub">{msg}</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="auth-shell">
        <div className="auth-card">
          <p className="auth-sub">משלים התחברות…</p>
        </div>
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  );
}
