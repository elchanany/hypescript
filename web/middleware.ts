import { NextRequest, NextResponse } from "next/server";

/**
 * Soft gate: when Auth is configured and guest editor is disabled,
 * unauthenticated visitors hitting / (editor) are sent to /login.
 * Full session verification happens client-side + server APIs (RLS).
 * This middleware only checks for the presence of the Supabase auth cookie.
 */
export function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const guest = (process.env.ALLOW_GUEST_EDITOR || "").toLowerCase();
  const authConfigured = !!(url.trim() && anon.trim());
  const allowGuest = !authConfigured || guest === "1" || guest === "true" || guest === "yes";

  if (allowGuest) return NextResponse.next();

  const { pathname } = req.nextUrl;
  const isEditor = pathname === "/";
  if (!isEditor) return NextResponse.next();

  // Supabase SSR cookie names vary; look for any sb-*-auth-token
  const hasSession = req.cookies.getAll().some((c) =>
    c.name.includes("-auth-token") || c.name.startsWith("sb-"),
  );
  if (hasSession) return NextResponse.next();

  const login = req.nextUrl.clone();
  login.pathname = "/login";
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/"],
};
