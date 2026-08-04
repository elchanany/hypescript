"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "./config";

let client: SupabaseClient | null | undefined;

/** Returns a browser Supabase client, or null when Auth is not configured. */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (client !== undefined) return client;
  const cfg = getSupabasePublicConfig();
  if (!cfg) { client = null; return null; }
  client = createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}
