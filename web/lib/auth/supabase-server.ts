import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "./config";

/** Server Components / Route Handlers — cookie-backed session. */
export function getSupabaseServer() {
  const cfg = getSupabasePublicConfig();
  if (!cfg) return null;

  const cookieStore = cookies();

  return createServerClient(cfg.url, cfg.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component without mutable cookies — middleware refreshes instead.
        }
      },
    },
  });
}
