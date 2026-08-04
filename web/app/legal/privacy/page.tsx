import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <div className="legal-card">
        <div className="legal-brand">
          <BrandLogo variant="horizontal" size="sm" theme="auto" />
        </div>
        <h1>מדיניות פרטיות</h1>
        <p>
          Hypescript מעבד וידאו מקומית בדפדפן כברירת מחדל. נתוני התחברות (אימייל / Google)
          נשמרים ב-Supabase Auth כאשר ההתחברות מופעלת. מפתחות API של ספקים נשמרים בשרת בלבד.
          מדיניות מלאה תפורסם לפני השקת חיוב.
        </p>
        <Link className="legal-back" href="/login">חזרה להתחברות</Link>
      </div>
    </main>
  );
}
