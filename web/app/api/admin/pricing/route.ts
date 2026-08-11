import { NextRequest, NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";
import { adminContext, BILLING_OVERRIDE_KEY, readPricing } from "@/lib/admin/server";

async function context() {
  const auth = await requireCloudUser();
  if (auth.response) return { response: auth.response } as const;
  const admin = await adminContext(auth.user.id);
  if (!admin.allowed || !admin.service) return { response: NextResponse.json({ error: "forbidden" }, { status: 403 }) } as const;
  return { auth, service: admin.service } as const;
}

export async function GET() {
  const ctx = await context(); if ("response" in ctx) return ctx.response;
  return NextResponse.json({ plans: await readPricing(ctx.service) });
}

export async function PUT(request: NextRequest) {
  const ctx = await context(); if ("response" in ctx) return ctx.response;
  const body = await request.json().catch(() => ({}));
  const plans = body.plans || {};
  for (const plan of ["creator", "pro"]) for (const field of ["monthlyIls", "yearlyIls"]) {
    const value = Number(plans?.[plan]?.[field]);
    if (!Number.isInteger(value) || value < 1 || value > 100000) return NextResponse.json({ error: "invalid_price" }, { status: 400 });
  }
  const value = { creator: plans.creator, pro: plans.pro };
  const { error } = await ctx.service.from("system_settings").upsert({ key: BILLING_OVERRIDE_KEY, value, updated_by: ctx.auth.user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 503 });
  return NextResponse.json({ ok: true, plans: value });
}
