"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
export default function CookieConsent() {
  const [show, setShow] = useState(false);
  useEffect(() => setShow(!localStorage.getItem("hs_cookie_consent")), []);
  const choose = (v: "essential" | "analytics") => {
    localStorage.setItem("hs_cookie_consent", v);
    setShow(false);
  };
  if (!show) return null;
  return (
    <aside className="cookie-consent" role="dialog" aria-label="העדפות פרטיות">
      <div>
        <strong>הפרטיות שלך, הבחירה שלך</strong>
        <p>
          קוקיז חיוניים מפעילים התחברות ושמירה. ניתוח שימוש אופציונלי עוזר לנו
          לשפר את העורך ואינו מופעל בלי אישור.
        </p>
        <Link href="/legal/privacy">מדיניות פרטיות</Link>
      </div>
      <div>
        <button className="btn secondary" onClick={() => choose("essential")}>
          חיוניים בלבד
        </button>
        <button className="btn primary" onClick={() => choose("analytics")}>
          אישור ניתוח שימוש
        </button>
      </div>
    </aside>
  );
}
