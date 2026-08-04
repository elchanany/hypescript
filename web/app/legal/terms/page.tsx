import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

export default function TermsPage() {
  return (
    <main className="legal-page">
      <div className="legal-card">
        <div className="legal-brand">
          <BrandLogo variant="horizontal" size="sm" theme="auto" />
        </div>
        <h1>תנאי שימוש</h1>
        <p>
          מסמך תנאי שימוש מלא יפורסם לפני השקת מנויים בתשלום. בינתיים: השימוש בכלי הוא באחריות המשתמש;
          הווידאו מעובד מקומית בדפדפן אלא אם בחרת במפורש במצב ענן.
        </p>
        <Link className="legal-back" href="/login">חזרה להתחברות</Link>
      </div>
    </main>
  );
}
