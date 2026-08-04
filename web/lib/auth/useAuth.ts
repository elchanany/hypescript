"use client";

import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "./supabase";
import { isAuthConfigured } from "./config";

export interface AuthState {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  error: string | null;
  signInWithGoogle: (nextPath?: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<boolean>;
  signUpWithPassword: (email: string, password: string) => Promise<boolean>;
  signInWithMagicLink: (email: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

async function postBootstrap() {
  try {
    const sb = getSupabaseBrowser();
    if (!sb) return;
    const { data } = await sb.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/auth/bootstrap", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch { /* non-fatal */ }
}

export function useAuth(): AuthState {
  const configured = isAuthConfigured();
  const [loading, setLoading] = useState(configured);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    const sb = getSupabaseBrowser();
    if (!sb) { setLoading(false); return; }
    let alive = true;
    sb.auth.getSession().then(({ data, error: err }) => {
      if (!alive) return;
      if (err) setError(humanAuthError(err.message));
      setSession(data.session ?? null);
      setLoading(false);
      if (data.session) void postBootstrap();
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setLoading(false);
      if (event === "SIGNED_IN") void postBootstrap();
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [configured]);

  const redirectTo = (nextPath?: string) => {
    const origin = window.location.origin;
    const next = (nextPath || "").trim();
    if (next.startsWith("/") && !next.startsWith("//")) {
      return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
    }
    return `${origin}/auth/callback`;
  };

  const signInWithGoogle = async (nextPath?: string) => {
    setError(null);
    const sb = getSupabaseBrowser();
    if (!sb) { setError("התחברות לא מוגדרת (חסרים מפתחות Supabase)."); return; }
    const { error: err } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo(nextPath),
        queryParams: { prompt: "select_account" },
      },
    });
    if (err) setError(humanAuthError(err.message));
  };

  const signInWithPassword = async (email: string, password: string) => {
    setError(null);
    const sb = getSupabaseBrowser();
    if (!sb) { setError("התחברות לא מוגדרת."); return false; }
    const { error: err } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (err) { setError(humanAuthError(err.message)); return false; }
    return true;
  };

  const signUpWithPassword = async (email: string, password: string) => {
    setError(null);
    const sb = getSupabaseBrowser();
    if (!sb) { setError("התחברות לא מוגדרת."); return false; }
    const { error: err } = await sb.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: redirectTo() },
    });
    if (err) { setError(humanAuthError(err.message)); return false; }
    return true;
  };

  const signInWithMagicLink = async (email: string) => {
    setError(null);
    const sb = getSupabaseBrowser();
    if (!sb) { setError("התחברות לא מוגדרת."); return false; }
    const { error: err } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo() },
    });
    if (err) { setError(humanAuthError(err.message)); return false; }
    return true;
  };

  const resetPassword = async (email: string) => {
    setError(null);
    const sb = getSupabaseBrowser();
    if (!sb) { setError("התחברות לא מוגדרת."); return false; }
    const { error: err } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login?reset=1`,
    });
    if (err) { setError(humanAuthError(err.message)); return false; }
    return true;
  };

  const signOut = async () => {
    setError(null);
    const sb = getSupabaseBrowser();
    if (!sb) return;
    const { error: err } = await sb.auth.signOut();
    if (err) setError(humanAuthError(err.message));
  };

  return {
    configured,
    loading,
    session,
    user: session?.user ?? null,
    error,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    signInWithMagicLink,
    resetPassword,
    signOut,
    clearError: () => setError(null),
  };
}

function humanAuthError(msg: string): string {
  const m = (msg || "").toLowerCase();
  if (/invalid api key|invalid.*api.*key|jwt.*invalid/i.test(m)) {
    return "מפתח Supabase לא תקין (Invalid API key). ב-Vercel → Environment Variables ודא ש־NEXT_PUBLIC_SUPABASE_ANON_KEY הוא Publishable/anon (לא Secret), מאותו פרויקט כמו ה-URL, בלי מרכאות — ואז Redeploy.";
  }
  if (/pkce code verifier not found/i.test(m)) {
    return "ההתחברות נקטעה (PKCE). סגור את הלשונית, פתח מחדש את האתר, ולחץ שוב על «המשך עם Google» מאותו דפדפן.";
  }
  if (/invalid login|invalid credentials|wrong password/i.test(m)) return "אימייל או סיסמה שגויים.";
  if (/email not confirmed/i.test(m)) return "יש לאמת את האימייל לפני ההתחברות (בדוק את תיבת הדואר).";
  if (/user already registered|already been registered/i.test(m)) return "המשתמש כבר רשום — נסה להתחבר.";
  if (/rate limit|too many/i.test(m)) return "יותר מדי ניסיונות. המתן מעט ונסה שוב.";
  if (/network|fetch/i.test(m)) return "בעיית רשת. בדוק חיבור ונסה שוב.";
  return msg || "שגיאת התחברות.";
}
