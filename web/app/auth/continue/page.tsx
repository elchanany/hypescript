"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import { getSupabaseBrowser } from "@/lib/auth/supabase";
import { postLoginPathForUser, waitForSession } from "@/lib/auth/session";

/**
 * Post-OAuth landing after server exchanged the code into cookies.
 * Confirms the browser client can read the session, then routes onward.
 */
function ContinueInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [msg, setMsg] = useState("משלים התחברות…");

  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    (async () => {
      let session = (await sb.auth.getSession()).data.session;
      if (!session) session = await waitForSession(sb, 5000);
      if (cancelled) return;
      if (!session) {
        setMsg("ההתחברות לא הושלמה");
        router.replace("/login?error=1&msg=" + encodeURIComponent("לא התקבלה סשן אחרי OAuth"));
        return;
      }
      try { sessionStorage.setItem("hs_just_logged_in", "1"); } catch { /* ignore */ }
      router.replace(await postLoginPathForUser(sb, next));
    })();
    return () => { cancelled = true; };
  }, [router, next]);

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

export default function AuthContinuePage() {
  return (
    <Suspense fallback={
      <div className="auth-shell"><div className="auth-card"><p className="auth-sub">משלים התחברות…</p></div></div>
    }>
      <ContinueInner />
    </Suspense>
  );
}
