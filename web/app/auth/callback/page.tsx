"use client";

// OAuth return URL. Supabase puts tokens in the URL hash; the browser client
// picks them up via detectSessionInUrl. We wait briefly then route onward.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import { getSupabaseBrowser } from "@/lib/auth/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
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
      const { data, error } = await sb.auth.getSession();
      if (cancelled) return;
      if (error) {
        setMsg(error.message);
        setTimeout(() => router.replace("/login?error=1"), 1200);
        return;
      }
      const finish = async () => {
        try {
          const { data: s } = await sb.auth.getSession();
          const token = s.session?.access_token;
          if (token) {
            await fetch("/api/auth/bootstrap", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        } catch { /* ignore */ }
        try { sessionStorage.setItem("hs_just_logged_in", "1"); } catch { /* private mode */ }
        const done = localStorage.getItem("hs_onboarding_done") === "1";
        router.replace(done ? "/dashboard" : "/onboarding");
      };
      if (data.session) {
        await finish();
        return;
      }
      const qs = new URLSearchParams(window.location.search);
      const code = qs.get("code");
      if (code) {
        const ex = await sb.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (ex.error) {
          setMsg(ex.error.message);
          setTimeout(() => router.replace("/login?error=1"), 1200);
          return;
        }
      }
      await finish();
    })();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <BrandLogo variant="icon" size="lg" theme="dark" priority />
        <h1>Hypescript</h1>
        <p>{msg}</p>
      </div>
    </div>
  );
}
