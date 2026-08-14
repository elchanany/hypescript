"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
export default function CookieConsent() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  useEffect(() => setShow(!localStorage.getItem("hs_cookie_consent")), []);
  const choose = (v: "essential" | "analytics") => {
    localStorage.setItem("hs_cookie_consent", v);
    setShow(false);
  };
  if (!show) return null;
  return (
    <aside className="cookie-consent" role="dialog" aria-label={t("privacy.label")}>
      <div>
        <strong>{t("privacy.title")}</strong>
        <p>{t("privacy.copy")}</p>
        <Link href="/legal/privacy">{t("auth.privacy")}</Link>
      </div>
      <div>
        <button className="btn secondary" onClick={() => choose("essential")}>
          {t("privacy.essential")}
        </button>
        <button className="btn primary" onClick={() => choose("analytics")}>
          {t("privacy.analytics")}
        </button>
      </div>
    </aside>
  );
}
