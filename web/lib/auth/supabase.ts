"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "./config";

let client: SupabaseClient | null | undefined;

/**
 * Browser Supabase client via @supabase/ssr.
 * PKCE code verifier is stored in cookies (not only localStorage),
 * so OAuth redirect back to Next.js can complete exchangeCodeForSession.
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (client !== undefined) return client;
  const cfg = getSupabasePublicConfig();
  if (!cfg) {
    client = null;
    return null;
  }
  client = createBrowserClient(cfg.url, cfg.anonKey, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return client;
}
