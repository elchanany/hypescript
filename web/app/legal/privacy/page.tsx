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
          מפתחות API של Hypescript נשמרים בצד השרת ואינם נשלחים לדפדפן.
        </p>
        <h2>קוקיז ואנליטיקה</h2>
        <p>קוקיז חיוניים משמשים להתחברות, אבטחה ושמירת העדפות. אירועי שימוש אופציונליים נשמרים רק לאחר הסכמה מפורשת ואינם משמשים לפרסום ממוקד.</p>
        <h2>הזכויות שלך</h2>
        <p>בעמוד החשבון אפשר לערוך פרטים, לבטל הסכמה לניתוח שימוש, לייצא את האירועים שנשמרו ולמחוק לצמיתות את החשבון והנתונים הקשורים אליו.</p>
        <Link className="legal-back" href="/login">חזרה להתחברות</Link>
      </div>
    </main>
  );
}
