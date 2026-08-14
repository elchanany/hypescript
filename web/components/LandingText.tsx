"use client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LANDING_CATALOGS, type LandingMessageKey } from "@/lib/i18n/landingMessages";

export default function LandingText({ id }: { id: LandingMessageKey }) {
  const { locale } = useI18n();
  return <>{LANDING_CATALOGS[locale][id] || LANDING_CATALOGS.he[id]}</>;
}
