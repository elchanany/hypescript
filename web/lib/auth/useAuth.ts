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
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
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
      if (err) setError(err.message);
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [configured]);

  const signInWithGoogle = async () => {
    setError(null);
    const sb = getSupabaseBrowser();
    if (!sb) { setError("התחברות לא מוגדרת (חסרים מפתחות Supabase)."); return; }
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error: err } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (err) setError(err.message);
  };

  const signOut = async () => {
    setError(null);
    const sb = getSupabaseBrowser();
    if (!sb) return;
    const { error: err } = await sb.auth.signOut();
    if (err) setError(err.message);
  };

  return {
    configured,
    loading,
    session,
    user: session?.user ?? null,
    error,
    signInWithGoogle,
    signOut,
  };
}
