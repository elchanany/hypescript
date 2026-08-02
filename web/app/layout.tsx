import type { Metadata } from "next";
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
        {children}
      </body>
    </html>
  );
}
