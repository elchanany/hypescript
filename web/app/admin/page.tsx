"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import {
  Activity, BarChart3, Cloud, Coins, CreditCard, ExternalLink,
  Film, Lock, RefreshCw, Save, Search, ShieldCheck, Sparkles, Users, X
} from "@/components/icons";
import { toast } from "@/lib/ui/toast";
import { LoadingState } from "@/components/LoadingState";

type PriceMap = Record<"creator" | "pro", { monthlyIls: number; yearlyIls: number }>;

interface UserSummary {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  suspended: boolean;
  quota_exempt: boolean;
  subscription: {
    plan_id: string;
    status: string;
    current_period_end?: string;
  } | null;
}

interface UserDetail extends UserSummary {
  roles: string[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  lastActiveAt: string | null;
  projects: { id: string; name: string; state: string; created_at: string; updated_at: string }[];
  creditBalanceIls: number;
  providerStats: Record<string, { calls: number; inputTokens: number; outputTokens: number; totalTokens: number }>;
  recentEvents: { name: string; properties: any; occurred_at: string }[];
}

interface AdminData {
  users: number;
  projects: number;
  uniqueVisitors: number;
  subscriptions: any[];
  events: any[];
  eventCounts: Record<string, number>;
  usersList: UserSummary[];
  creditLiabilityIls: number;
}

const PROVIDER_NAMES: Record<string, { name: string; color: string; desc: string }> = {
  openai: { name: "OpenAI (GPT-4o)", color: "#10a37f", desc: "מודלי שפה ותמונות DALL-E" },
  anthropic: { name: "Anthropic (Claude 3.5)", color: "#d97706", desc: "סוכן חכם וכתיבת סקריפטים" },
  gemini: { name: "Google Gemini Pro", color: "#3b82f6", desc: "עיבוד וידאו והבנת תוכן" },
  deepseek: { name: "DeepSeek", color: "#6366f1", desc: "מודל חינמי ומהיר לשיחות" },
  groq: { name: "Groq (Whisper)", color: "#f97316", desc: "תמלול בזמן אמת מהיר במיוחד" },
  elevenlabs: { name: "ElevenLabs", color: "#ec4899", desc: "קריינות ודיבוב קולות AI" },
};

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [prices, setPrices] = useState<PriceMap | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "pro" | "exempt" | "suspended">("all");
  const [savingPrices, setSavingPrices] = useState(false);

  // Selected User Modal / Drawer State
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [userActionBusy, setUserActionBusy] = useState(false);

  const load = async () => {
    setError("");
    try {
      const [overview, pricing] = await Promise.all([
        fetch("/api/admin/overview"),
        fetch("/api/admin/pricing"),
      ]);
      if (!overview.ok || !pricing.ok) throw new Error(String(overview.status));
      setData(await overview.json());
      setPrices((await pricing.json()).plans);
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const loadUserDetails = async (userId: string) => {
    setSelectedUserId(userId);
    setLoadingUser(true);
    setUserDetail(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error("טעינת פרטי המשתמש נכשלה");
      const json = await res.json();
      setUserDetail(json.user);
    } catch (err) {
      toast.error("שגיאה בטעינת משתמש", err instanceof Error ? err.message : undefined);
    } finally {
      setLoadingUser(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return (data?.usersList || []).filter((u) => {
      const matchQuery = `${u.display_name || ""} ${u.email || ""}`.toLowerCase().includes(query.toLowerCase());
      if (!matchQuery) return false;
      if (filterRole === "pro") return u.subscription?.plan_id === "pro" || u.subscription?.plan_id === "creator";
      if (filterRole === "exempt") return u.quota_exempt;
      if (filterRole === "suspended") return u.suspended;
      return true;
    });
  }, [data, query, filterRole]);

  const activeSubs = data?.subscriptions.filter((s) => ["active", "trialing"].includes(s.status)).length || 0;

  const savePrices = async () => {
    if (!prices) return;
    setSavingPrices(true);
    const response = await fetch("/api/admin/pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plans: prices }),
    });
    setSavingPrices(false);
    if (!response.ok) return toast.error("שמירת המחירים נכשלה");
    toast.success("המחירים עודכנו בהצלחה", "שינויים יחולו על Checkouts חדשים.");
  };

  const handleToggleRole = async (targetUser: UserDetail) => {
    if (targetUser.isSuperAdmin) {
      toast.error("לא ניתן לשנות הרשאות לסופר-אדמין");
      return;
    }
    const nextRole = targetUser.isAdmin ? "user" : "system_admin";
    setUserActionBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(targetUser.id)}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.message || resJson.error || "שינוי התפקיד נכשל");
      toast.success(nextRole === "system_admin" ? "המשתמש קודם למנהל בהצלחה" : "הרשאת הניהול הוסרה");
      await loadUserDetails(targetUser.id);
      await load();
    } catch (e) {
      toast.error("שגיאה בעדכון תפקיד", e instanceof Error ? e.message : undefined);
    } finally {
      setUserActionBusy(false);
    }
  };

  const handleUpdatePlan = async (targetUser: UserDetail, newPlan: string) => {
    setUserActionBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(targetUser.id)}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: newPlan }),
      });
      if (!res.ok) throw new Error("עדכון המסלול נכשל");
      toast.success(`מסלול המשתמש עודכן ל-${newPlan.toUpperCase()}`);
      await loadUserDetails(targetUser.id);
      await load();
    } catch (e) {
      toast.error("שגיאה בעדכון מסלול", e instanceof Error ? e.message : undefined);
    } finally {
      setUserActionBusy(false);
    }
  };

  const handleToggleExempt = async (targetUser: UserDetail) => {
    setUserActionBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(targetUser.id)}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotaExempt: !targetUser.quota_exempt }),
      });
      if (!res.ok) throw new Error("עדכון פטור נכשל");
      toast.success(!targetUser.quota_exempt ? "הוענק פטור מלא ממגבלות" : "פטור ממגבלות בוטל");
      await loadUserDetails(targetUser.id);
      await load();
    } catch (e) {
      toast.error("שגיאה בעדכון", e instanceof Error ? e.message : undefined);
    } finally {
      setUserActionBusy(false);
    }
  };

  const priceField = (plan: "creator" | "pro", field: "monthlyIls" | "yearlyIls") => (
    <input
      type="number"
      min={1}
      value={prices?.[plan]?.[field] || ""}
      onChange={(e) => setPrices((p) => p ? ({ ...p, [plan]: { ...p[plan], [field]: Number(e.target.value) } }) : p)}
    />
  );

  return (
    <main className="admin-page">
      <header className="account-nav">
        <BrandLogo variant="horizontal" size="sm" decorative />
        <div className="admin-head-actions">
          <button className="btn secondary" onClick={load}><RefreshCw size={14} />רענון</button>
          <Link href="/dashboard" className="btn secondary">חזרה למוצר</Link>
        </div>
      </header>

      <section className="admin-shell">
        <div className="admin-header-row">
          <div>
            <span className="account-eyebrow">מרכז שליטה וניהול</span>
            <h1>Hypescript Control Center</h1>
            <p>ניהול משתמשים, מעקב צריכת AI, שדרוגי מנויים ופיקוח על פרויקטי ענן.</p>
          </div>
        </div>

        {error ? (
          <div className="auth-error">אין הרשאת מנהל. החשבון חייב לקבל תפקיד system_owner או system_admin בטבלת user_roles.</div>
        ) : !data ? (
          <LoadingState label="טוען ומנתח את נתוני המערכת…" lines={5} />
        ) : (
          <>
            <div className="admin-metrics">
              <article><Users /><strong>{data.users}</strong><span>משתמשים רשומים</span></article>
              <article><BarChart3 /><strong>{data.uniqueVisitors}</strong><span>פעילים ב־30 יום</span></article>
              <article><Cloud /><strong>{data.projects}</strong><span>פרויקטים בענן</span></article>
              <article><Activity /><strong>{activeSubs}</strong><span>מנויים פעילים</span></article>
              <article><Coins /><strong>₪{data.creditLiabilityIls.toFixed(2)}</strong><span>התחייבות קרדיטים</span></article>
            </div>

            <div className="admin-grid">
              <section className="account-card admin-pricing">
                <div className="admin-section-title">
                  <div>
                    <CreditCard />
                    <h2>תמחור Checkout</h2>
                    <p>השינוי חל בפועל על Checkouts חדשים דרך custom_price של Lemon Squeezy.</p>
                  </div>
                  <button className="btn primary" onClick={savePrices} disabled={savingPrices}>
                    <Save size={14} />{savingPrices ? "שומר…" : "שמור מחירים"}
                  </button>
                </div>
                <div className="admin-price-grid">
                  <b>מסלול</b><b>חודשי ₪</b><b>שנתי ₪</b>
                  <span>Creator</span>{priceField("creator", "monthlyIls")}{priceField("creator", "yearlyIls")}
                  <span>Pro</span>{priceField("pro", "monthlyIls")}{priceField("pro", "yearlyIls")}
                </div>
                <a className="admin-external" href="https://app.lemonsqueezy.com/products" target="_blank" rel="noreferrer">
                  ניהול Variants וניסיונות ב־Lemon Squeezy <ExternalLink size={13} />
                </a>
              </section>

              <section className="account-card">
                <div className="admin-section-title">
                  <div>
                    <Activity />
                    <h2>פעילות ב־30 יום</h2>
                    <p>אירועים וקריאות מערכת מאומתות.</p>
                  </div>
                </div>
                <div className="admin-event-bars">
                  {Object.entries(data.eventCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => (
                    <div key={name}>
                      <span>{name}</span>
                      <i><b style={{ width: `${Math.min(100, (count / Math.max(1, ...Object.values(data.eventCounts))) * 100)}%` }} /></i>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="account-card admin-users">
              <div className="admin-section-title">
                <div>
                  <ShieldCheck />
                  <h2>ניהול משתמשים</h2>
                  <p>לחץ על משתמש לצפייה בפרופיל מלא, שימוש ב-AI, פרויקטים וניהול הרשאות.</p>
                </div>
                <div className="admin-filter-group">
                  <div className="admin-tabs">
                    <button className={filterRole === "all" ? "active" : ""} onClick={() => setFilterRole("all")}>הכל ({data.usersList.length})</button>
                    <button className={filterRole === "pro" ? "active" : ""} onClick={() => setFilterRole("pro")}>Pro / מנויים</button>
                    <button className={filterRole === "exempt" ? "active" : ""} onClick={() => setFilterRole("exempt")}>פטורים ממגבלה</button>
                  </div>
                  <label className="admin-search-label">
                    <Search size={14} />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש לפי שם או אימייל…" />
                  </label>
                </div>
              </div>

              <div className="admin-table">
                <div className="admin-tr head">
                  <b>משתמש</b>
                  <b>מסלול מנוי</b>
                  <b>סטטוס</b>
                  <b>תאריך הרשמה</b>
                  <b>פעולה</b>
                </div>
                {filteredUsers.map((u) => {
                  const isPro = u.subscription?.plan_id === "pro" || u.subscription?.plan_id === "creator";
                  return (
                    <div className="admin-tr clickable" key={u.id} onClick={() => loadUserDetails(u.id)}>
                      <span>
                        <strong>{u.display_name || "משתמש"}</strong>
                        <small>{u.email}</small>
                      </span>
                      <span>
                        <span className={`admin-badge-plan ${isPro ? "pro" : "free"}`}>
                          {u.subscription?.plan_id?.toUpperCase() || "FREE"}
                        </span>
                        {u.quota_exempt && <span className="admin-badge-exempt">פטור ממגבלה</span>}
                      </span>
                      <span className={`admin-status ${u.suspended ? "bad" : "good"}`}>
                        {u.suspended ? "מושעה" : "פעיל"}
                      </span>
                      <time>{new Date(u.created_at).toLocaleDateString("he-IL")}</time>
                      <span>
                        <button className="btn xs secondary" onClick={(e) => { e.stopPropagation(); loadUserDetails(u.id); }}>
                          פרטים וניהול
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </section>

      {/* User Details & Management Modal / Drawer */}
      {selectedUserId && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedUserId(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <div className="admin-modal-user-header">
                <div className="admin-modal-avatar">
                  {userDetail?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={userDetail.avatar_url} alt="" />
                  ) : (
                    <span>{userDetail?.display_name?.[0]?.toUpperCase() || userDetail?.email?.[0]?.toUpperCase() || "U"}</span>
                  )}
                </div>
                <div>
                  <h2>{userDetail?.display_name || "משתמש"}</h2>
                  <p>{userDetail?.email}</p>
                  <div className="admin-modal-badges">
                    {userDetail?.isSuperAdmin ? (
                      <span className="badge-super-admin">👑 Super Admin</span>
                    ) : userDetail?.isAdmin ? (
                      <span className="badge-admin">🛡️ מנהל מערכת</span>
                    ) : (
                      <span className="badge-user">משתמש רגיל</span>
                    )}
                    <span className={`badge-plan ${userDetail?.subscription?.plan_id || "free"}`}>
                      {(userDetail?.subscription?.plan_id || "Free").toUpperCase()}
                    </span>
                    {userDetail?.quota_exempt && <span className="badge-exempt">⚡ פטור ממגבלות</span>}
                  </div>
                </div>
              </div>
              <button className="iconbtn" onClick={() => setSelectedUserId(null)} aria-label="סגור"><X size={18} /></button>
            </div>

            {loadingUser ? (
              <div className="admin-modal-loading"><LoadingState label="טוען נתוני משתמש מלאים…" lines={4} /></div>
            ) : userDetail ? (
              <div className="admin-modal-body">
                {/* Metrics row */}
                <div className="admin-modal-stat-grid">
                  <div className="stat-box">
                    <span>תאריך הרשמה</span>
                    <strong>{new Date(userDetail.created_at).toLocaleDateString("he-IL")}</strong>
                  </div>
                  <div className="stat-box">
                    <span>פעילות אחרונה</span>
                    <strong>{userDetail.lastActiveAt ? new Date(userDetail.lastActiveAt).toLocaleDateString("he-IL", { hour: "2-digit", minute: "2-digit" }) : "—"}</strong>
                  </div>
                  <div className="stat-box">
                    <span>פרויקטים בענן</span>
                    <strong>{userDetail.projects.length}</strong>
                  </div>
                  <div className="stat-box">
                    <span>יתרת קרדיטים</span>
                    <strong>₪{userDetail.creditBalanceIls.toFixed(2)}</strong>
                  </div>
                </div>

                {/* AI Token & Provider Breakdown */}
                <div className="admin-modal-section">
                  <h3><Sparkles size={16} /> שימוש ב-AI וטוקנים לפי ספק</h3>
                  <div className="provider-stats-grid">
                    {Object.entries(PROVIDER_NAMES).map(([key, info]) => {
                      const stats = userDetail.providerStats[key] || { calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 };
                      return (
                        <div key={key} className="provider-stat-card">
                          <div className="provider-stat-header">
                            <span className="provider-indicator" style={{ background: info.color }} />
                            <strong>{info.name}</strong>
                          </div>
                          <div className="provider-stat-numbers">
                            <div>
                              <small>קריאות:</small>
                              <span>{stats.calls.toLocaleString()}</span>
                            </div>
                            <div>
                              <small>סך טוקנים:</small>
                              <span>{stats.totalTokens.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* User Projects */}
                <div className="admin-modal-section">
                  <h3><Film size={16} /> פרויקטים בענן ({userDetail.projects.length})</h3>
                  {userDetail.projects.length === 0 ? (
                    <p className="empty-txt">אין פרויקטים שמורים בענן עבור משתמש זה.</p>
                  ) : (
                    <div className="admin-user-projects-list">
                      {userDetail.projects.map((p) => (
                        <div key={p.id} className="admin-user-project-item">
                          <div>
                            <strong>{p.name}</strong>
                            <small>עודכן: {new Date(p.updated_at).toLocaleDateString("he-IL")}</small>
                          </div>
                          <span className="badge-cloud">בענן</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Administrative Controls */}
                <div className="admin-modal-section admin-actions-box">
                  <h3><ShieldCheck size={16} /> פעולות ניהול למשתמש זה</h3>
                  <div className="admin-actions-grid">
                    <div>
                      <label>שדרוג/שינוי מסלול מנוי:</label>
                      <div className="admin-btn-group">
                        <button
                          className={`btn sm ${userDetail.subscription?.plan_id === "free" || !userDetail.subscription ? "primary" : "secondary"}`}
                          disabled={userActionBusy}
                          onClick={() => handleUpdatePlan(userDetail, "free")}
                        >
                          Free
                        </button>
                        <button
                          className={`btn sm ${userDetail.subscription?.plan_id === "creator" ? "primary" : "secondary"}`}
                          disabled={userActionBusy}
                          onClick={() => handleUpdatePlan(userDetail, "creator")}
                        >
                          Creator
                        </button>
                        <button
                          className={`btn sm ${userDetail.subscription?.plan_id === "pro" ? "primary" : "secondary"}`}
                          disabled={userActionBusy}
                          onClick={() => handleUpdatePlan(userDetail, "pro")}
                        >
                          Pro 🚀
                        </button>
                        <button
                          className={`btn sm ${userDetail.subscription?.plan_id === "lifetime" ? "primary" : "secondary"}`}
                          disabled={userActionBusy}
                          onClick={() => handleUpdatePlan(userDetail, "lifetime")}
                        >
                          Lifetime
                        </button>
                      </div>
                    </div>

                    <div>
                      <label>הטבות והרשאות מיוחדות:</label>
                      <div className="admin-btn-group">
                        <button
                          className={`btn sm ${userDetail.quota_exempt ? "warning" : "secondary"}`}
                          disabled={userActionBusy}
                          onClick={() => handleToggleExempt(userDetail)}
                        >
                          {userDetail.quota_exempt ? "בטל פטור ממגבלות" : "הענק פטור ממגבלות ⚡"}
                        </button>

                        {!userDetail.isSuperAdmin && (
                          <button
                            className={`btn sm ${userDetail.isAdmin ? "danger" : "secondary"}`}
                            disabled={userActionBusy}
                            onClick={() => handleToggleRole(userDetail)}
                          >
                            {userDetail.isAdmin ? "הסר הרשאת מנהל" : "קדם למנהל מערכת 🛡️"}
                          </button>
                        )}
                        {userDetail.isSuperAdmin && (
                          <span className="super-admin-lock-note">
                            <Lock size={13} /> מנהל על (נעול מפני שינויים)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}
