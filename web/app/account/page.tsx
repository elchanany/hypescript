"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Cloud, CreditCard, ExternalLink, HardDrive, LogOut, Sparkles, Video } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/lib/auth/useAuth";
import { BILLING_PLANS, BillingInterval, BillingPlanId } from "@/lib/billing/plans";
import { toast } from "@/lib/ui/toast";

type BillingStatus = {
  subscription: { plan_id: BillingPlanId; status: string; current_period_end?: string | null; provider?: string | null };
  usage: {
    projects: { used: number; limit: number };
    storageBytes: { used: number; limit: number };
    renderSeconds: { used: number; limit: number };
  };
};

const gb = (bytes: number) => `${(bytes / 1073741824).toFixed(bytes < 1073741824 ? 1 : 0)}GB`;
const min = (seconds: number) => `${Math.round(seconds / 60)} דק׳`;

function UsageBar({ label, used, limit, value, icon: Icon }: { label: string; used: number; limit: number; value: string; icon: typeof Cloud }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return <div className="account-usage-item">
    <div className="account-usage-head"><span><Icon size={16} />{label}</span><strong>{value}</strong></div>
    <div className="account-meter"><i style={{ width: `${pct}%` }} /></div>
  </div>;
}

export default function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) { window.location.href = "/login?next=/account"; return; }
    if (!user) return;
    fetch("/api/billing/status").then((r) => r.ok ? r.json() : Promise.reject()).then(setStatus).catch(() => toast.error("לא הצלחנו לטעון את פרטי החשבון"));
  }, [loading, user]);

  const checkout = async (planId: BillingPlanId) => {
    setBusy(planId);
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId, interval }) });
      const body = await response.json();
      if (!response.ok || !body.url) throw new Error(body.error || "checkout_failed");
      window.location.href = body.url;
    } catch (error) {
      const message = error instanceof Error && error.message === "billing_variant_missing"
        ? "המוצר עדיין לא נוצר ב־Lemon Squeezy. החשבון נשאר במסלול החינמי."
        : "פתיחת התשלום נכשלה. נסה שוב בעוד רגע.";
      toast.error("התשלום עדיין לא זמין", message);
      setBusy(null);
    }
  };

  const portal = async () => {
    setBusy("portal");
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const body = await response.json();
      if (!response.ok || !body.url) throw new Error();
      window.location.href = body.url;
    } catch { toast.error("אין עדיין מנוי פעיל לניהול"); setBusy(null); }
  };

  const activePlan = status?.subscription.plan_id || "free";
  const active = BILLING_PLANS[activePlan];
  return <main className="account-page">
    <header className="account-nav">
      <Link href="/dashboard" aria-label="Hypescript"><BrandLogo variant="horizontal" size="sm" decorative priority /></Link>
      <Link className="btn ghost" href="/dashboard"><ArrowLeft size={15} />לפרויקטים</Link>
    </header>

    <section className="account-hero">
      <div>
        <span className="account-eyebrow">החשבון שלי</span>
        <h1>{user?.user_metadata?.full_name || user?.user_metadata?.name || "שלום"}</h1>
        <p>{user?.email}</p>
      </div>
      <div className="account-plan-chip"><Sparkles size={17} /><span>המסלול שלך</span><strong>{active.nameHe}</strong></div>
    </section>

    <section className="account-grid">
      <article className="account-card usage-card">
        <div className="account-card-head"><div><h2>שימוש החודש</h2><p>המכסות נאכפות בשרת כדי שלא יהיו הפתעות בחיוב.</p></div><Cloud size={22} /></div>
        {status ? <div className="account-usage-list">
          <UsageBar icon={Video} label="רינדור" used={status.usage.renderSeconds.used} limit={status.usage.renderSeconds.limit} value={`${min(status.usage.renderSeconds.used)} מתוך ${min(status.usage.renderSeconds.limit)}`} />
          <UsageBar icon={HardDrive} label="אחסון" used={status.usage.storageBytes.used} limit={status.usage.storageBytes.limit} value={`${gb(status.usage.storageBytes.used)} מתוך ${gb(status.usage.storageBytes.limit)}`} />
          <UsageBar icon={Cloud} label="פרויקטים" used={status.usage.projects.used} limit={status.usage.projects.limit} value={`${status.usage.projects.used} מתוך ${status.usage.projects.limit}`} />
        </div> : <div className="account-skeleton">טוען שימוש…</div>}
      </article>

      <article className="account-card billing-card">
        <div className="account-card-head"><div><h2>חיוב ומנוי</h2><p>{status?.subscription.provider ? "המנוי מנוהל באופן מאובטח דרך Lemon Squeezy." : "אין אמצעי תשלום שמור במסלול החינמי."}</p></div><CreditCard size={22} /></div>
        {status?.subscription.current_period_end && <div className="account-renew">התקופה הנוכחית עד {new Date(status.subscription.current_period_end).toLocaleDateString("he-IL")}</div>}
        <button className="btn secondary tall" onClick={portal} disabled={!status?.subscription.provider || busy === "portal"}><ExternalLink size={15} />ניהול חיוב</button>
      </article>
    </section>

    <section className="account-plans-section" id="plans">
      <div className="account-section-head"><div><span className="account-eyebrow">מסלולים</span><h2>בחר את הקצב שמתאים לך</h2></div><div className="billing-toggle"><button className={interval === "month" ? "on" : ""} onClick={() => setInterval("month")}>חודשי</button><button className={interval === "year" ? "on" : ""} onClick={() => setInterval("year")}>שנתי · חודשיים מתנה</button></div></div>
      <div className="account-plans">
        {(Object.values(BILLING_PLANS) as Array<(typeof BILLING_PLANS)[BillingPlanId]>).map((plan) => {
          const current = activePlan === plan.id;
          const price = interval === "year" ? plan.yearlyIls : plan.monthlyIls;
          return <article key={plan.id} className={`account-plan ${plan.id === "creator" ? "featured" : ""}`}>
            {plan.id === "creator" && <em>הבחירה הפופולרית</em>}
            <h3>{plan.nameHe}</h3>
            <div className="account-plan-price"><strong>₪{price}</strong><span>/{interval === "year" ? "שנה" : "חודש"}</span></div>
            <ul><li><Check size={15} />{plan.projects} פרויקטים</li><li><Check size={15} />{plan.storageGb}GB אחסון</li><li><Check size={15} />{plan.renderMinutes} דקות רינדור בחודש</li></ul>
            {plan.id === "free"
              ? <button className="btn secondary tall" disabled>{current ? "המסלול הנוכחי" : "ללא Checkout"}</button>
              : <button className="btn primary tall" disabled={current || !!busy} onClick={() => checkout(plan.id)}>{current ? "המסלול הנוכחי" : busy === plan.id ? "פותח תשלום…" : "שדרוג מאובטח"}</button>}
          </article>;
        })}
      </div>
      <p className="billing-test-note">התשלומים כרגע במצב בדיקה בלבד עד אישור החנות. לא מתבצע חיוב אמיתי.</p>
    </section>

    <section className="account-danger">
      <div><h2>יציאה מהחשבון</h2><p>הפרויקטים בענן יישארו שמורים לחשבון שלך.</p></div>
      <button className="btn ghost tall" onClick={async () => { await signOut(); window.location.href = "/welcome"; }}><LogOut size={15} />התנתקות</button>
    </section>
  </main>;
}
