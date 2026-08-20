// Live provider health. Admin-only: it reveals which keys are configured and whether they
// actually work (masked fingerprints only — never key material).
import { NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";
import { adminContext } from "@/lib/admin/server";
import { probeAllProviders } from "@/lib/providers/probe.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const access = await adminContext(auth.user.id);
  if (!access.allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const results = await probeAllProviders();
  const summary = {
    ready: results.filter((r) => r.status === "ready").length,
    unhealthy: results.filter((r) => r.status === "unhealthy").length,
    missing: results.filter((r) => r.status === "missing_key").length,
  };
  return NextResponse.json({ checkedAt: new Date().toISOString(), summary, providers: results });
}
