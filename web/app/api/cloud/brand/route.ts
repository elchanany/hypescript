// Brand Kit בענן.
//
// לפני כן הראוט קרא וכתב אל public.user_profiles.brand_kit — טבלה שלא קיימת
// באף מיגרציה. כל כתיבה נכשלה ב-500, הקורא בלע את השגיאה, וה-GET החזיר null
// גם כשהייתה תקלה. כלומר ה-Brand Kit היה מקומי בלבד בלי שאיש ידע.
// עכשיו: טבלה אמיתית (public.user_brand_kits), ושגיאה שמדווחת כשגיאה.

import { NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";

export const runtime = "nodejs";

/** PGRST116 = "אין שורה" מ-PostgREST. זה מצב תקין למשתמש חדש, לא תקלה. */
const NO_ROW = "PGRST116";

export async function GET() {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const { data, error } = await auth.supabase
    .from("user_brand_kits")
    .select("brand_kit, updated_at")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error && error.code !== NO_ROW) {
    // מבדילים בין "עוד אין ערכת מותג" לבין "הקריאה נכשלה". קודם שניהם החזירו
    // null, ולכן תקלה נראתה בדיוק כמו משתמש חדש.
    return NextResponse.json({ brandKit: null, error: "brand_read_failed" }, { status: 502 });
  }
  return NextResponse.json({ brandKit: data?.brand_kit ?? null, updatedAt: data?.updated_at ?? null });
}

export async function PUT(request: Request) {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({}));
  const kit = body.kit ?? null;
  if (kit != null && (typeof kit !== "object" || Array.isArray(kit))) {
    return NextResponse.json({ ok: false, error: "invalid_brand_kit" }, { status: 400 });
  }
  // ערכת מותג היא מטא-דאטה, לא מדיה. גבול ברור מונע דחיפת base64 של לוגו לתוך
  // השורה במקום להעלות אותו כנכס.
  if (kit != null && JSON.stringify(kit).length > 128 * 1024) {
    return NextResponse.json({ ok: false, error: "brand_kit_too_large" }, { status: 413 });
  }

  const { error } = await auth.supabase
    .from("user_brand_kits")
    .upsert({ user_id: auth.user.id, brand_kit: kit ?? {}, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ ok: false, error: "brand_sync_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
