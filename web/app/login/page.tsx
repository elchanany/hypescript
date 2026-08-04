"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { configured, loading, user, error, signInWithGoogle } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">hs</div>
        <h1>התחברות ל־hypescript</h1>
        <p className="auth-sub">
          הווידאו נשאר אצלך במחשב. ההתחברות רק מזהה מי אתה (חשבון), לא מעלה סרטונים לשרת.
        </p>

        {!configured ? (
          <div className="auth-warn">
            <strong>התחברות עדיין לא מופעלת.</strong>
            <p>צריך להגדיר Supabase (חינם). המדריך המלא: <code>docs/SETUP_AUTH.md</code> בריפו.</p>
            <Link href="/" className="btn primary tall" style={{ marginTop: 12, display: "inline-flex" }}>
              המשך בלי התחברות (עורך מקומי)
            </Link>
          </div>
        ) : (
          <>
            <button className="btn primary tall auth-google" onClick={() => signInWithGoogle()} disabled={loading}>
              המשך עם Google
            </button>
            {error && <div className="auth-error">{error}</div>}
            <Link href="/" className="auth-skip">המשך בלי התחברות</Link>
          </>
        )}
      </div>
    </div>
  );
}
