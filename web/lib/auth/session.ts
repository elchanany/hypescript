"use client";

import type { Session, SupabaseClient } from "@supabase/supabase-js";

/** Wait until Supabase has a session (hash detect / PKCE), or timeout. */
export function waitForSession(
  sb: SupabaseClient,
  timeoutMs = 8000,
): Promise<Session | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (session: Session | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      sub.subscription.unsubscribe();
      resolve(session);
    };

    const timer = setTimeout(() => {
      void sb.auth.getSession().then(({ data }) => finish(data.session ?? null));
    }, timeoutMs);

    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (session && (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        finish(session);
      }
    });

    void sb.auth.getSession().then(({ data }) => {
      if (data.session) finish(data.session);
    });
  });
}

export function postLoginPath(next?: string | null): string {
  let onboarded = false;
  try {
    onboarded = globalThis.localStorage?.getItem("hs_onboarding_done") === "1";
  } catch { /* private mode / SSR */ }
  const n = (next || "").trim();
  if (!onboarded) {
    if (n.startsWith("/") && !n.startsWith("//")) {
      try { globalThis.sessionStorage?.setItem("hs_post_onboarding", n); } catch { /* private mode */ }
    }
    return "/onboarding";
  }
  if (n.startsWith("/") && !n.startsWith("//")) return n;
  return "/dashboard";
}
