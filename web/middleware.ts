import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { normalizeSupabaseUrl } from "@/lib/auth/config";
import { LOCALE_COOKIE, resolveInitialLocale } from "@/lib/i18n/config";

/**
 * 1) Refresh Supabase auth cookies (PKCE / session) on navigations.
 * 2) Keep the marketing home public and gate the editor at `/` behind auth.
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

  const existingLocale = req.cookies.get(LOCALE_COOKIE)?.value;
  const detectedLocale = existingLocale || resolveInitialLocale({
    acceptLanguage: req.headers.get("accept-language"),
    country: req.headers.get("x-vercel-ip-country"),
  });
  const applyDetectedLocale = <T extends NextResponse>(target: T): T => {
    if (!existingLocale) {
      target.cookies.set(LOCALE_COOKIE, detectedLocale, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
    return target;
  };
  if (!existingLocale) {
    applyDetectedLocale(response);
  }

  let authedUser = false;
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
          applyDetectedLocale(response);
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    // Touches/refreshes session cookies when needed.
    const { data } = await supabase.auth.getUser();
    authedUser = !!data?.user;
  }

  const { pathname } = req.nextUrl;
  if (pathname !== "/") return response;

  const hasSession = authedUser || req.cookies.getAll().some(
    (c) => c.name.includes("-auth-token") || c.name.startsWith("sb-") || c.name.includes("supabase"),
  );
  if (hasSession) return response;

  // Direct project links remain usable. Anonymous guest mode is a local/QA
  // escape hatch; production visitors should always see the welcome page first.
  if (req.nextUrl.searchParams.has("project")) return response;
  if (allowGuest && process.env.NODE_ENV !== "production") return response;

  const welcome = req.nextUrl.clone();
  welcome.pathname = "/welcome";
  return applyDetectedLocale(NextResponse.redirect(welcome));
}

export const config = {
  matcher: [
    /*
     * Refresh session on app navigations; skip static assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
