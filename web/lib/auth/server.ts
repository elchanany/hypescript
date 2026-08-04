// Server-only Supabase clients. Never import this file from client components.

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { normalizeSupabaseUrl } from "./config";

export function getServiceRoleKey(): string | null {
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  return key || null;
}

export function getBootstrapSuperAdminEmail(): string | null {
  // Server-only. Never expose via NEXT_PUBLIC_*.
  const email = (process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL || "").trim().toLowerCase();
  return email || null;
}

export function getSupabaseServiceClient(): SupabaseClient | null {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
  const key = getServiceRoleKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Anon server client (for cookie/session verification when needed). */
export function getSupabaseAnonServer(): SupabaseClient | null {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  if (!url || !anon) return null;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function allowGuestEditor(): boolean {
  // When Auth is not configured → always guest. When configured, guest only if explicitly allowed.
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  if (!url || !anon) return true;
  const flag = (process.env.ALLOW_GUEST_EDITOR || "").trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}
