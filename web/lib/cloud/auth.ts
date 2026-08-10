import "server-only";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getSupabaseServer } from "@/lib/auth/supabase-server";

export async function requireCloudUser(): Promise<
  | { user: User; supabase: NonNullable<ReturnType<typeof getSupabaseServer>>; response?: never }
  | { response: NextResponse; user?: never; supabase?: never }
> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return { response: NextResponse.json({ error: "cloud_auth_not_configured" }, { status: 503 }) };
  }
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { response: NextResponse.json({ error: "authentication_required" }, { status: 401 }) };
  }
  return { user: data.user, supabase };
}
