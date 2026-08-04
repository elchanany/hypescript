import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { normalizeSupabaseUrl } from "@/lib/auth/config";

/**
 * 1) Refresh Supabase auth cookies (PKCE / session) on navigations.
 * 2) Soft-gate the editor (/) when Auth is configured and guest mode is off.
 */
export async function middleware(req: NextRequest) {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  const guest = (process.env.ALLOW_GUEST_EDITOR || "").toLowerCase();
  const authConfigured = !!(url && anon);
  const allowGuest = !authConfigured || guest === "1" || guest === "true" || guest === "yes";

  let response = NextResponse.next({
    request: { headers: req.headers },
  });

  if (authConfigured) {
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            req.cookies.set(name, value);
          });
          response = NextResponse.next({
            request: { headers: req.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    // Touches/refreshes session cookies when needed.
    await supabase.auth.getUser();
  }

  if (allowGuest) return response;

  const { pathname } = req.nextUrl;
  if (pathname !== "/") return response;

  const hasSession = req.cookies.getAll().some(
    (c) => c.name.includes("-auth-token") || c.name.startsWith("sb-"),
  );
  if (hasSession) return response;

  const login = req.nextUrl.clone();
  login.pathname = "/login";
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    /*
     * Refresh session on app navigations; skip static assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
