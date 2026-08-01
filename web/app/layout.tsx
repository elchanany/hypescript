import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import ChunkReload from "@/components/ChunkReload";

export const metadata: Metadata = {
  title: "hypescript — עריכת שיעורים בעברית",
  description: "חיתוך לפי סקריפט, הסרת נשימות וכתוביות עברית — הכל בדפדפן, מקומית.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <ChunkReload />
        <header className="topbar">
          <Link href="/" className="brand">🎬 hypescript</Link>
          <nav>
            <Link href="/">עורך</Link>
            <Link href="/settings">הגדרות</Link>
          </nav>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
