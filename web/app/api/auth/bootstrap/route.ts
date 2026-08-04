import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeSupabaseUrl } from "@/lib/auth/config";
import { ensureBootstrapSystemOwner } from "@/lib/auth/bootstrap";
import { getBootstrapSuperAdminEmail, getServiceRoleKey } from "@/lib/auth/server";

export const runtime = "nodejs";

/** Called after login to bind System Owner and ensure profile row exists. */
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return NextResponse.json({ error: "חסר session." }, { status: 401 });

    const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
    const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
    if (!url || !anon) return NextResponse.json({ error: "Auth לא מוגדר." }, { status: 503 });

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data: userData, error } = await userClient.auth.getUser();
    if (error || !userData.user) return NextResponse.json({ error: "Session לא תקין." }, { status: 401 });

    const user = userData.user;
    const serviceOk = !!getServiceRoleKey();
    let owner = false;
    if (serviceOk) {
      owner = await ensureBootstrapSystemOwner(user.id, user.email);
    } else {
      // Without service role we can still detect bootstrap email for UI hints only —
      // DB trigger (when migration applied) remains the durable binding.
      const boot = getBootstrapSuperAdminEmail();
      owner = !!(boot && user.email && user.email.toLowerCase() === boot);
    }

    return NextResponse.json({
      ok: true,
      userId: user.id,
      systemOwner: owner,
      serviceRoleConfigured: serviceOk,
      onboardingRequired: true,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "שגיאה" }, { status: 500 });
  }
}
