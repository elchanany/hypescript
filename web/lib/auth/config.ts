// Auth is OPTIONAL. Without these env vars the editor works exactly as before
// (local IndexedDB only). Never throw at import time — crash-free boot.

/**
 * Normalize Project URL from env.
 * Users sometimes paste the Data API URL (`…/rest/v1`) or a trailing slash.
 * OAuth must hit `https://xxxx.supabase.co/auth/v1/...` — not `/rest/v1/auth/...`.
 */
export function normalizeSupabaseUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, "");
  // Strip common accidental API path suffixes (order: longer first).
  url = url.replace(/\/rest\/v1$/i, "");
  url = url.replace(/\/auth\/v1$/i, "");
  url = url.replace(/\/+$/, "");
  return url;
}

export function isAuthConfigured(): boolean {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  return !!(url && anon);
}

export function getSupabasePublicConfig(): { url: string; anonKey: string } | null {
  if (!isAuthConfigured()) return null;
  return {
    url: normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || ""),
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
  };
}
