"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { Activity, Cloud, Coins, Users } from "lucide-react";
export default function AdminPage() {
  const [d, setD] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/admin/overview")
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(setD)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <main className="admin-page">
      <header className="account-nav">
        <BrandLogo variant="horizontal" size="sm" decorative />
        <Link href="/dashboard" className="btn secondary">
          חזרה למוצר
        </Link>
      </header>
      <section className="admin-shell">
        <span className="account-eyebrow">ניהול מערכת</span>
        <h1>Hypescript Control Center</h1>
        <p>משתמשים, שימוש, מנויים ויתרות — נתוני אמת בלבד.</p>
        {error ? (
          <div className="auth-error">אין הרשאת מנהל למסך זה.</div>
        ) : !d ? (
          <div className="account-skeleton">טוען נתוני מערכת…</div>
        ) : (
          <>
            <div className="admin-metrics">
              <article>
                <Users />
                <strong>{d.users}</strong>
                <span>משתמשים</span>
              </article>
              <article>
                <Cloud />
                <strong>{d.projects}</strong>
                <span>פרויקטים</span>
              </article>
              <article>
                <Activity />
                <strong>
                  {
                    d.subscriptions.filter(
                      (s: any) =>
                        s.status === "active" || s.status === "trialing",
                    ).length
                  }
                </strong>
                <span>מנויים פעילים/ניסיון</span>
              </article>
              <article>
                <Coins />
                <strong>₪{d.creditLiabilityIls.toFixed(2)}</strong>
                <span>יתרת קרדיטים</span>
              </article>
            </div>
            <section className="account-card">
              <h2>אירועים אחרונים</h2>
              <div className="admin-events">
                {d.events.slice(0, 30).map((e: any, i: number) => (
                  <div key={i}>
                    <strong>{e.name}</strong>
                    <time>
                      {new Date(e.occurred_at).toLocaleString("he-IL")}
                    </time>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
