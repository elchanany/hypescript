import { describe, expect, it } from "vitest";
import { localeDirection, localeFromAcceptLanguage, resolveInitialLocale } from "./config";

describe("locale negotiation", () => {
  it("honors explicit preference before browser and country", () => expect(resolveInitialLocale({ explicit: "ru", acceptLanguage: "ar", country: "IL" })).toBe("ru"));
  it("normalizes an explicit locale", () => expect(resolveInitialLocale({ explicit: "EN" })).toBe("en"));
  it("uses a supported browser language before country", () => expect(resolveInitialLocale({ acceptLanguage: "en-US,en;q=.9", country: "IL" })).toBe("en"));
  it("uses country when the browser has no supported locale", () => expect(resolveInitialLocale({ acceptLanguage: "fr-FR", country: "IN" })).toBe("hi"));
  it("falls back to Hebrew", () => expect(resolveInitialLocale({ acceptLanguage: "fr-FR", country: "FR" })).toBe("he"));
  it("honors weighted Accept-Language values", () => expect(localeFromAcceptLanguage("en;q=.4, ar;q=.9")).toBe("ar"));
  it("sets RTL only for Hebrew and Arabic", () => { expect(localeDirection("he")).toBe("rtl"); expect(localeDirection("ar")).toBe("rtl"); expect(localeDirection("ru")).toBe("ltr"); });
});
