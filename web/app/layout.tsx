import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "hypescript — עריכת שיעורים בעברית",
  description: "חיתוך לפי סקריפט, הסרת נשימות וכתוביות עברית — הכל בדפדפן, מקומית.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">🎬 hypescript</Link>
          <nav>
            <Link href="/">עורך</Link>
            <Link href="/settings">הגדרות</Link>
          </nav>
        </header>
        <main className="container">{children}</main>
        <footer className="foot">
          עיבוד הווידאו רץ בדפדפן שלך · רק האודיו נשלח לתמלול · ללא אחסון בענן
        </footer>
      </body>
    </html>
  );
}
