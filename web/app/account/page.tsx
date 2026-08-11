"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Check, Cloud, CreditCard, ExternalLink, HardDrive, LockKeyhole, LogOut, Sparkles, Video } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/lib/auth/useAuth";
import { BILLING_PLANS, BillingInterval, BillingPlanId, TRIAL_OFFER } from "@/lib/billing/plans";
import { toast } from "@/lib/ui/toast";

type BillingStatus = {
  subscription: {
    plan_id: BillingPlanId;
    status: string;
    entitlement: "free" | "trial" | "paid";
    current_period_end?: string | null;
    trial_ends_at?: string | null;
    provider?: string | null;
  };
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
    <div className={`account-meter ${pct >= 100 ? "exhausted" : pct >= 80 ? "near" : ""}`}><i style={{ width: `${pct}%` }} /></div>
  </div>;
}

export default function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlanId | null>(null);

  useEffect(() => {
    if (!loading && !user) { window.location.href = "/login?next=/account"; return; }
    if (!user) return;
    fetch("/api/billing/status").then((r) => r.ok ? r.json() : Promise.reject()).then(setStatus).catch(() => toast.error("לא הצלחנו לטעון את פרטי החשבון"));
  }, [loading, user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedPlan = params.get("plan");
    const requestedInterval = params.get("interval");
    if (requestedPlan === "creator" || requestedPlan === "pro") setSelectedPlan(requestedPlan);
    if (requestedInterval === "year" || requestedInterval === "month") setInterval(requestedInterval);
    if (params.get("checkout") === "success") {
      toast.success("ההרשמה נקלטה", "המנוי יתעדכן מיד לאחר אישור האירוע מ־Lemon Squeezy.");
    }
  }, []);

  const checkout = async (planId: BillingPlanId) => {
    setBusy(planId);
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId, interval }) });
      const body = await response.json();
      if (!response.ok || !body.url) throw new Error(body.error || "checkout_failed");
      window.location.href = body.url;
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      const message = code === "billing_variant_missing"
        ? "אחד ממסלולי התשלום עדיין אינו מוגדר. החשבון נשאר ללא שינוי."
        : code === "billing_trial_missing"
          ? "חודש הניסיון עדיין אינו מוגדר בכל אפשרויות המוצר. לא נפתח Checkout מטעה."
          : code === "subscription_already_exists"
            ? "כבר קיים בחשבון מנוי או ניסיון. אפשר לנהל אותו דרך כפתור ניהול החיוב."
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
  const trialing = status?.subscription.entitlement === "trial";
  const usageItems = status ? [status.usage.projects, status.usage.storageBytes, status.usage.renderSeconds] : [];
  const quotaPct = usageItems.length ? Math.max(...usageItems.map((item) => item.limit > 0 ? item.used / item.limit : 0)) : 0;
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
      <div className="account-plan-chip"><Sparkles size={17} /><span>{trialing ? "ניסיון פעיל" : "המסלול שלך"}</span><strong>{trialing ? `ניסיון ${active.nameHe}` : active.nameHe}</strong></div>
    </section>

    {trialing && <section className="account-trial-banner">
      <div className="account-trial-icon"><CalendarDays size={20} /></div>
      <div><strong>החודש הראשון שלך ללא חיוב</strong><p>בתקופת הניסיון זמינות מכסות היכרות של {TRIAL_OFFER.projects} פרויקטים, {TRIAL_OFFER.storageGb}GB ו־{TRIAL_OFFER.renderMinutes} דקות רינדור. המכסה המלאה של {active.nameHe} נפתחת עם תחילת החיוב.</p></div>
      {status?.subscription.trial_ends_at && <span>עד {new Date(status.subscription.trial_ends_at).toLocaleDateString("he-IL")}</span>}
    </section>}

    {quotaPct >= .8 && <section className={`account-quota-callout ${quotaPct >= 1 ? "exhausted" : ""}`}>
      <div><strong>{quotaPct >= 1 ? "המכסה הזמינה הסתיימה" : "המכסה שלך מתקרבת לסיום"}</strong><p>{trialing ? "המכסה המלאה תיפתח בתחילת המנוי בתשלום. אפשר לראות כבר עכשיו כמה נוסף בכל מסלול." : "בחר מסלול גדול יותר כדי להמשיך לעבוד בלי לעצור."}</p></div>
      <a className="btn primary" href="#plans">השווה מסלולים</a>
    </section>}

    <section className="account-grid">
      <article className="account-card usage-card">
        <div className="account-card-head"><div><h2>{trialing ? "שימוש בתקופת הניסיון" : "שימוש החודש"}</h2><p>המכסות נאכפות בשרת כדי שלא יהיו הפתעות בחיוב.</p></div><Cloud size={22} /></div>
        {status ? <div className="account-usage-list">
          <UsageBar icon={Video} label="רינדור" used={status.usage.renderSeconds.used} limit={status.usage.renderSeconds.limit} value={`${min(status.usage.renderSeconds.used)} מתוך ${min(status.usage.renderSeconds.limit)}`} />
          <UsageBar icon={HardDrive} label="אחסון" used={status.usage.storageBytes.used} limit={status.usage.storageBytes.limit} value={`${gb(status.usage.storageBytes.used)} מתוך ${gb(status.usage.storageBytes.limit)}`} />
          <UsageBar icon={Cloud} label="פרויקטים" used={status.usage.projects.used} limit={status.usage.projects.limit} value={`${status.usage.projects.used} מתוך ${status.usage.projects.limit}`} />
        </div> : <div className="account-skeleton">טוען שימוש…</div>}
      </article>

      <article className="account-card billing-card">
        <div className="account-card-head"><div><h2>חיוב ומנוי</h2><p>{trialing ? "אמצעי התשלום אומת ונשמר אצל Lemon Squeezy. לא מתבצע חיוב בתקופת הניסיון." : status?.subscription.provider ? "המנוי מנוהל באופן מאובטח דרך Lemon Squeezy." : "אין אמצעי תשלום שמור במסלול החינמי."}</p></div><CreditCard size={22} /></div>
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
          return <article key={plan.id} className={`account-plan ${plan.id === "creator" ? "featured" : ""} ${selectedPlan === plan.id ? "requested" : ""}`}>
            {plan.id === "creator" && <em>הבחירה הפופולרית</em>}
            <h3>{plan.nameHe}</h3>
            {plan.id !== "free" && <div className="account-trial-price">חודש ראשון ₪0</div>}
            <div className="account-plan-price"><strong>₪{price}</strong><span>/{plan.id === "free" ? "לתמיד" : interval === "year" ? "שנה לאחר הניסיון" : "חודש לאחר הניסיון"}</span></div>
            <ul><li><Check size={15} />{plan.projects} פרויקטים</li><li><Check size={15} />{plan.storageGb}GB אחסון</li><li><Check size={15} />{plan.renderMinutes} דקות רינדור בחודש</li></ul>
            {plan.id === "free"
              ? <button className="btn secondary tall" disabled>{current ? "המסלול הנוכחי" : "ללא Checkout"}</button>
              : <><button className="btn primary tall" disabled={current || !!busy} onClick={() => checkout(plan.id)}>{current ? (trialing ? "הניסיון פעיל" : "המסלול הנוכחי") : busy === plan.id ? "פותח Checkout…" : "התחל חודש חינם"}</button><small className="account-card-note"><LockKeyhole size={12} />נדרש כרטיס. ניתן לבטל לפני החיוב הראשון.</small></>}
          </article>;
        })}
      </div>
      <p className="billing-test-note">החנות כרגע ב־Test Mode: השתמש בכרטיס בדיקה בלבד. כרטיס אמיתי יידרש רק לאחר מעבר מאושר ל־Live Mode.</p>
    </section>

    <section className="account-danger">
      <div><h2>יציאה מהחשבון</h2><p>הפרויקטים בענן יישארו שמורים לחשבון שלך.</p></div>
      <button className="btn ghost tall" onClick={async () => { await signOut(); window.location.href = "/welcome"; }}><LogOut size={15} />התנתקות</button>
    </section>
  </main>;
}
