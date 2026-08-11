import { NextResponse } from "next/server";
import { BILLING_PLANS, PAID_PLAN_IDS } from "@/lib/billing/plans";
import { getCatalog, getStore, resolveVariant } from "@/lib/billing/lemon";

export async function GET() {
  try {
    const [store, catalog] = await Promise.all([getStore(), getCatalog()]);
    const readiness = await Promise.all(PAID_PLAN_IDS.flatMap((planId) => (["month", "year"] as const).map(async (interval) => {
      try {
        const variant = await resolveVariant(planId, interval);
        return { planId, interval, ready: true, variantId: variant.id };
      } catch (error) {
        return { planId, interval, ready: false, reason: error instanceof Error ? error.message : "unavailable" };
      }
    })));
    return NextResponse.json({
      mode: catalog.products.length === 0
        ? "test-enforced"
        : catalog.products.every((product) => product.attributes.test_mode === true) ? "test" : "live-blocked",
      store: { id: store.id, name: store.attributes.name, slug: store.attributes.slug },
      productCount: catalog.products.length,
      plans: BILLING_PLANS,
      readiness,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "billing_unavailable", plans: BILLING_PLANS }, { status: 503 });
  }
}
