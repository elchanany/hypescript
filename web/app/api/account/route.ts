import { NextRequest, NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";
import { getSupabaseServiceClient } from "@/lib/auth/server";
import { getAiAccess } from "@/lib/billing/aiAccess.server";
import { isLocale, normalizedAddressForm } from "@/lib/i18n/config";

export async function GET() {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  let [profileResult, settingsResult] = await Promise.all([
    auth.supabase
      .from("profiles")
      .select("email,display_name,avatar_url,locale,timezone,usage_type,address_form")
      .eq("id", auth.user.id)
      .single(),
    auth.supabase
      .from("user_settings")
      .select(
        "theme,reduced_motion,notify_email,notify_in_app,analytics_consent,cookie_consent,high_contrast,font_scale,marketing_email,provider_mode",
      )
      .eq("user_id", auth.user.id)
      .single(),
  ]);
  // Deploys are not atomic across Vercel and Supabase. Keep account settings
  // available while the additive address_form migration is still propagating.
  if (profileResult.error?.code === "42703") {
    const legacyProfile = await auth.supabase
      .from("profiles")
      .select("email,display_name,avatar_url,locale,timezone,usage_type")
      .eq("id", auth.user.id)
      .single();
    profileResult = legacyProfile.error
      ? profileResult
      : { ...legacyProfile, data: { ...legacyProfile.data, address_form: "unspecified" } };
  }
  if (profileResult.error || settingsResult.error)
    return NextResponse.json(
      { error: "account_schema_pending" },
      { status: 503 },
    );
  return NextResponse.json({
    profile: profileResult.data,
    settings: settingsResult.data,
  });
}
export async function PATCH(req: NextRequest) {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const body = await req.json().catch(() => ({}));
  const aiAccess = await getAiAccess(auth.supabase, auth.user);
  const profile = {
    display_name: String(body.profile?.display_name || "")
      .trim()
      .slice(0, 80),
    locale: isLocale(body.profile?.locale) ? body.profile.locale : "he",
    address_form: normalizedAddressForm(body.profile?.address_form),
    timezone: String(body.profile?.timezone || "Asia/Jerusalem").slice(0, 64),
    usage_type: ["personal", "nonprofit", "business", "team"].includes(
      body.profile?.usage_type,
    )
      ? body.profile.usage_type
      : null,
  };
  const s = body.settings || {};
  const settings = {
    theme: ["system", "dark", "light"].includes(s.theme) ? s.theme : "system",
    reduced_motion: !!s.reduced_motion,
    notify_email: !!s.notify_email,
    notify_in_app: !!s.notify_in_app,
    analytics_consent: !!s.analytics_consent,
    cookie_consent: s.analytics_consent ? "analytics" : "essential",
    high_contrast: !!s.high_contrast,
    font_scale: Math.max(0.85, Math.min(1.35, Number(s.font_scale) || 1)),
    marketing_email: !!s.marketing_email,
    provider_mode: s.provider_mode === "byok" && aiAccess.canUseByok ? "byok" : "managed",
    updated_at: new Date().toISOString(),
  };
  let [p, u] = await Promise.all([
    auth.supabase.from("profiles").update(profile).eq("id", auth.user.id),
    auth.supabase.from("user_settings").update(settings).eq("user_id", auth.user.id),
  ]);
  if (p.error?.code === "42703") {
    const { address_form: _pendingMigration, ...legacyProfile } = profile;
    p = await auth.supabase.from("profiles").update(legacyProfile).eq("id", auth.user.id);
  }
  if (p.error || u.error)
    return NextResponse.json(
      { error: "account_update_failed" },
      { status: 500 },
    );
  return NextResponse.json({ ok: true });
}
export async function DELETE() {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const service = getSupabaseServiceClient();
  if (!service)
    return NextResponse.json(
      { error: "account_delete_unavailable" },
      { status: 503 },
    );
  const { data: profile } = await service
    .from("profiles")
    .select("system_owner")
    .eq("id", auth.user.id)
    .single();
  if (profile?.system_owner)
    return NextResponse.json(
      { error: "system_owner_protected" },
      { status: 409 },
    );
  await auth.supabase.auth.signOut();
  const { error } = await service.auth.admin.deleteUser(auth.user.id);
  if (error)
    return NextResponse.json(
      { error: "account_delete_failed" },
      { status: 500 },
    );
  return NextResponse.json({ ok: true });
}
