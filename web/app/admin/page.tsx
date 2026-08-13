"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { Activity, BarChart3, Cloud, Coins, CreditCard, ExternalLink, RefreshCw, Save, Search, ShieldCheck, Users } from "@/components/icons";
import { toast } from "@/lib/ui/toast";

type PriceMap = Record<"creator" | "pro", { monthlyIls: number; yearlyIls: number }>;
type AdminData = { users: number; projects: number; uniqueVisitors: number; subscriptions: any[]; events: any[]; eventCounts: Record<string, number>; usersList: any[]; creditLiabilityIls: number };

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [prices, setPrices] = useState<PriceMap | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const load = async () => {
    setError("");
    try {
      const [overview, pricing] = await Promise.all([fetch("/api/admin/overview"), fetch("/api/admin/pricing")]);
      if (!overview.ok || !pricing.ok) throw new Error(String(overview.status));
      setData(await overview.json()); setPrices((await pricing.json()).plans);
    } catch (e) { setError(e instanceof Error ? e.message : "error"); }
  };
  useEffect(() => { void load(); }, []);
  const users = useMemo(() => (data?.usersList || []).filter((u) => `${u.display_name || ""} ${u.email || ""}`.toLowerCase().includes(query.toLowerCase())), [data, query]);
  const active = data?.subscriptions.filter((s) => ["active", "trialing"].includes(s.status)).length || 0;
  const savePrices = async () => {
    if (!prices) return; setSaving(true);
    const response = await fetch("/api/admin/pricing", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plans: prices }) });
    setSaving(false);
    if (!response.ok) return toast.error("שמירת המחירים נכשלה");
    toast.success("המחירים עודכנו", "Checkouts חדשים יחויבו במחיר החדש; מנויים קיימים נשארים במחיר שבו נרשמו.");
  };
  const priceField = (plan: "creator" | "pro", field: "monthlyIls" | "yearlyIls") => <input type="number" min={1} value={prices?.[plan]?.[field] || ""} onChange={(e) => setPrices((p) => p ? ({ ...p, [plan]: { ...p[plan], [field]: Number(e.target.value) } }) : p)} />;
  return <main className="admin-page">
    <header className="account-nav"><BrandLogo variant="horizontal" size="sm" decorative /><div className="admin-head-actions"><button className="btn secondary" onClick={load}><RefreshCw size={14} />רענון</button><Link href="/dashboard" className="btn secondary">חזרה למוצר</Link></div></header>
    <section className="admin-shell">
      <span className="account-eyebrow">ניהול מערכת</span><h1>Hypescript Control Center</h1><p>משתמשים, ביקורים, מנויים, תמחור ושימוש — ממקור הנתונים האמיתי.</p>
      {error ? <div className="auth-error">אין הרשאת מנהל. החשבון חייב לקבל תפקיד system_owner או system_admin בטבלת user_roles.</div> : !data ? <div className="account-skeleton">טוען נתוני מערכת…</div> : <>
        <div className="admin-metrics">
          <article><Users /><strong>{data.users}</strong><span>משתמשים רשומים</span></article>
          <article><BarChart3 /><strong>{data.uniqueVisitors}</strong><span>משתמשים פעילים ב־30 יום</span></article>
          <article><Cloud /><strong>{data.projects}</strong><span>פרויקטים בענן</span></article>
          <article><Activity /><strong>{active}</strong><span>מנויים וניסיונות פעילים</span></article>
          <article><Coins /><strong>₪{data.creditLiabilityIls.toFixed(2)}</strong><span>התחייבות קרדיטים</span></article>
        </div>

        <div className="admin-grid">
          <section className="account-card admin-pricing"><div className="admin-section-title"><div><CreditCard /><h2>תמחור Checkout</h2><p>השינוי חל בפועל על Checkouts חדשים דרך custom_price של Lemon Squeezy.</p></div><button className="btn primary" onClick={savePrices} disabled={saving}><Save size={14} />{saving ? "שומר…" : "שמור מחירים"}</button></div>
            <div className="admin-price-grid"><b>מסלול</b><b>חודשי ₪</b><b>שנתי ₪</b><span>Creator</span>{priceField("creator","monthlyIls")}{priceField("creator","yearlyIls")}<span>Pro</span>{priceField("pro","monthlyIls")}{priceField("pro","yearlyIls")}</div>
            <a className="admin-external" href="https://app.lemonsqueezy.com/products" target="_blank" rel="noreferrer">ניהול Variants וניסיונות ב־Lemon Squeezy <ExternalLink size={13} /></a>
          </section>
          <section className="account-card"><div className="admin-section-title"><div><Activity /><h2>פעילות ב־30 יום</h2><p>אירועים שנשלחו בהסכמת המשתמשים.</p></div></div><div className="admin-event-bars">{Object.entries(data.eventCounts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,count])=><div key={name}><span>{name}</span><i><b style={{width:`${Math.min(100,count/Math.max(1,...Object.values(data.eventCounts))*100)}%`}} /></i><strong>{count}</strong></div>)}</div></section>
        </div>

        <section className="account-card admin-users"><div className="admin-section-title"><div><ShieldCheck /><h2>משתמשים</h2><p>חשבון, סטטוס מנוי ודגלים תפעוליים.</p></div><label><Search size={14} /><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="חיפוש משתמש…" /></label></div>
          <div className="admin-table"><div className="admin-tr head"><b>משתמש</b><b>מסלול</b><b>סטטוס</b><b>נרשם</b></div>{users.map((u)=><div className="admin-tr" key={u.id}><span><strong>{u.display_name || "ללא שם"}</strong><small>{u.email}</small></span><span>{u.subscription?.plan_id || "free"}</span><span className={`admin-status ${u.suspended ? "bad" : ""}`}>{u.suspended ? "מושעה" : u.subscription?.status || "פעיל"}</span><time>{new Date(u.created_at).toLocaleDateString("he-IL")}</time></div>)}</div>
        </section>
      </>}
    </section>
  </main>;
}
