import { NextResponse } from "next/server";
import { getCloudReadiness } from "@/lib/cloud/config";
import { requireCloudUser } from "@/lib/cloud/auth";
import { checkR2 } from "@/lib/cloud/r2";

export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = getCloudReadiness();
  const auth = await requireCloudUser();
  if (auth.response) {
    return NextResponse.json({ ...readiness, authenticated: false, live: { database: false, storage: false } });
  }

  const dbCheck = await auth.supabase.from("cloud_projects").select("id", { head: true, count: "exact" }).limit(1);
  let storageLive = false;
  if (readiness.services.storage) {
    try { await checkR2(); storageLive = true; } catch { storageLive = false; }
  }
  return NextResponse.json({
    ...readiness,
    authenticated: true,
    live: { database: !dbCheck.error, storage: storageLive },
  });
}
