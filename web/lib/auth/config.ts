// Auth is OPTIONAL. Without these env vars the editor works exactly as before
// (local IndexedDB only). Never throw at import time — crash-free boot.

export function isAuthConfigured(): boolean {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  return !!(url && anon);
}

export function getSupabasePublicConfig(): { url: string; anonKey: string } | null {
  if (!isAuthConfigured()) return null;
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
  };
}
