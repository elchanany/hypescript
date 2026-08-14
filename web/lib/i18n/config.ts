export const SUPPORTED_LOCALES = ["he", "en", "ar", "ru", "hi"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export type AddressForm = "male" | "female" | "plural" | "unspecified";

export const DEFAULT_LOCALE: AppLocale = "he";
export const LOCALE_COOKIE = "hs_locale";
export const LOCALE_STORAGE_KEY = "hs_locale";
export const ADDRESS_STORAGE_KEY = "hs_address_form";

const RTL = new Set<AppLocale>(["he", "ar"]);
const COUNTRY_LOCALE: Record<string, AppLocale> = {
  IL: "he",
  AE: "ar", BH: "ar", DZ: "ar", EG: "ar", IQ: "ar", JO: "ar", KW: "ar",
  LB: "ar", LY: "ar", MA: "ar", OM: "ar", PS: "ar", QA: "ar", SA: "ar",
  SD: "ar", SY: "ar", TN: "ar", YE: "ar",
  RU: "ru", BY: "ru", KZ: "ru", KG: "ru",
  IN: "hi",
};

export function isLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value.toLowerCase() as AppLocale);
}

export function localeDirection(locale: AppLocale): "rtl" | "ltr" {
  return RTL.has(locale) ? "rtl" : "ltr";
}

export function localeFromAcceptLanguage(header: string | null | undefined): AppLocale | null {
  if (!header) return null;
  const candidates = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qRaw = params.find((param) => param.trim().startsWith("q="))?.split("=")[1];
      return { locale: tag.toLowerCase().split("-")[0], q: qRaw ? Number(qRaw) : 1 };
    })
    .filter((item) => Number.isFinite(item.q))
    .sort((a, b) => b.q - a.q);
  return (candidates.find((item) => isLocale(item.locale))?.locale as AppLocale | undefined) ?? null;
}

export function resolveInitialLocale(input: {
  explicit?: string | null;
  profile?: string | null;
  acceptLanguage?: string | null;
  country?: string | null;
}): AppLocale {
  if (isLocale(input.explicit)) return input.explicit.toLowerCase() as AppLocale;
  if (isLocale(input.profile)) return input.profile.toLowerCase() as AppLocale;
  const browserLocale = localeFromAcceptLanguage(input.acceptLanguage);
  if (browserLocale) return browserLocale;
  const countryLocale = COUNTRY_LOCALE[String(input.country || "").toUpperCase()];
  return countryLocale || DEFAULT_LOCALE;
}

export function normalizedAddressForm(value: unknown): AddressForm {
  return value === "male" || value === "female" || value === "plural" || value === "unspecified"
    ? value
    : "unspecified";
}
