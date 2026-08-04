import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/auth/config";

/**
 * OAuth / magic-link callback — MUST run on the server so the PKCE
 * code_verifier cookie written by @supabase/ssr is available for exchange.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error_description") || url.searchParams.get("error");
  const nextRaw = url.searchParams.get("next") || "/dashboard";
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";

  const origin = url.origin;

  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/login?error=1&msg=${encodeURIComponent(oauthError)}`,
    );
  }

  const cfg = getSupabasePublicConfig();
  if (!cfg) {
    return NextResponse.redirect(
      `${origin}/login?error=1&msg=${encodeURIComponent("התחברות לא מוגדרת")}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=1&msg=${encodeURIComponent("חסר קוד התחברות")}`,
    );
  }

  // Mutable response so Set-Cookie from exchange is preserved on redirect.
  let response = NextResponse.redirect(`${origin}/auth/continue?next=${encodeURIComponent(next)}`);

  const supabase = createServerClient(cfg.url, cfg.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.redirect(`${origin}/auth/continue?next=${encodeURIComponent(next)}`);
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=1&msg=${encodeURIComponent(error.message)}`,
    );
  }

  // Bootstrap System Owner (best-effort; non-blocking for login UX)
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      await fetch(`${origin}/api/auth/bootstrap`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  } catch { /* ignore */ }

  return response;
}
