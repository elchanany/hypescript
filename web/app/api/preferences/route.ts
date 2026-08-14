import { NextRequest, NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";
import { isLocale, normalizedAddressForm } from "@/lib/i18n/config";

export async function GET() {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const { data, error } = await auth.supabase
    .from("profiles")
    .select("locale,address_form")
    .eq("id", auth.user.id)
    .single();
  if (error) return NextResponse.json({ error: "preferences_unavailable" }, { status: 503 });
  return NextResponse.json({ locale: data.locale, addressForm: data.address_form });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const body = await req.json().catch(() => ({}));
  const update: { locale?: string; address_form?: string; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };
  if (isLocale(body.locale)) update.locale = body.locale;
  if (body.addressForm !== undefined) update.address_form = normalizedAddressForm(body.addressForm);
  if (!update.locale && !update.address_form) {
    return NextResponse.json({ error: "invalid_preferences" }, { status: 400 });
  }
  const { error } = await auth.supabase.from("profiles").update(update).eq("id", auth.user.id);
  if (error) return NextResponse.json({ error: "preferences_update_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
