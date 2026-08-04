"use client";

// OAuth return URL. Supabase puts tokens in the URL hash; the browser client
// picks them up via detectSessionInUrl. We just wait briefly then go to dashboard.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
      // Give the client a moment to parse the hash / exchange the code.
      const { data, error } = await sb.auth.getSession();
      if (cancelled) return;
      if (error) {
        setMsg(error.message);
        setTimeout(() => router.replace("/login?error=1"), 1200);
        return;
      }
      if (data.session) router.replace("/dashboard");
      else {
        // PKCE / code flow: try exchange if present
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
        router.replace("/dashboard");
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>hypescript</h1>
        <p>{msg}</p>
      </div>
    </div>
  );
}
