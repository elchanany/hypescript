// Ensures the bootstrap email is bound as System Owner (server-side only).

import { getBootstrapSuperAdminEmail, getSupabaseServiceClient } from "./server";

export async function ensureBootstrapSystemOwner(userId: string, email: string | null | undefined): Promise<boolean> {
  const bootstrap = getBootstrapSuperAdminEmail();
  if (!bootstrap || !email) return false;
  if (email.trim().toLowerCase() !== bootstrap) return false;

  const sb = getSupabaseServiceClient();
  if (!sb) return false;

  await sb.from("profiles").upsert({
    id: userId,
    email,
    system_owner: true,
    quota_exempt: true,
    suspended: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });

  await sb.from("user_roles").upsert({
    user_id: userId,
    role_id: "system_owner",
  }, { onConflict: "user_id,role_id" });

  await sb.from("credit_accounts").upsert({
    user_id: userId,
    quota_exempt: true,
    status: "active",
  }, { onConflict: "user_id" });

  await sb.from("audit_logs").insert({
    actor_id: userId,
    action: "auth.bootstrap_system_owner",
    target_type: "user",
    target_id: userId,
    meta: { email },
  });

  return true;
}
