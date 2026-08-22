import { NextResponse } from "next/server";
import { BILLING_PLANS, PAID_PLAN_IDS, TRIAL_OFFER } from "@/lib/billing/plans";
import { getCatalog, getStore, resolveVariant } from "@/lib/billing/lemon";
import { billingMode } from "@/lib/billing/mode";

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
      // מדווח את המצב שבו אנחנו *רצים* ואת מה שהחנות מכילה בפועל — שני דברים
      // שונים. `readiness` למטה כבר בודק כל שילוב תוכנית×מחזור מול המצב הזה.
      mode: billingMode(),
      storeContains: catalog.products.length === 0
        ? "empty"
        : catalog.products.every((product) => product.attributes.test_mode === true)
          ? "test-only"
          : catalog.products.every((product) => product.attributes.test_mode !== true) ? "live-only" : "mixed",
      store: { id: store.id, name: store.attributes.name, slug: store.attributes.slug },
      productCount: catalog.products.length,
      plans: BILLING_PLANS,
      trial: TRIAL_OFFER,
      readiness,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "billing_unavailable", plans: BILLING_PLANS }, { status: 503 });
  }
}
