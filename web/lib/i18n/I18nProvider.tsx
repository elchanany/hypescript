"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ADDRESS_STORAGE_KEY, DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_STORAGE_KEY, isLocale, localeDirection, normalizedAddressForm, resolveInitialLocale, type AddressForm, type AppLocale } from "./config";
import { MESSAGE_CATALOGS, type MessageKey } from "./messages";

type I18nContextValue = {
  locale: AppLocale;
  dir: "rtl" | "ltr";
  addressForm: AddressForm;
  setLocale: (locale: AppLocale) => void;
  setAddressForm: (form: AddressForm) => void;
  t: (key: MessageKey) => string;
  addressed: (keys: { male: MessageKey; female: MessageKey; plural: MessageKey }) => string;
};

const Context = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  dir: "rtl",
  addressForm: "unspecified",
  setLocale: () => {},
  setAddressForm: () => {},
  t: (key) => MESSAGE_CATALOGS.he[key],
  addressed: (keys) => MESSAGE_CATALOGS.he[keys.plural],
});

function applyDocument(locale: AppLocale) {
  document.documentElement.lang = locale;
  document.documentElement.dir = localeDirection(locale);
  document.documentElement.dataset.locale = locale;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(DEFAULT_LOCALE);
  const [addressForm, setAddressFormState] = useState<AddressForm>("unspecified");

  useEffect(() => {
    const cookieLocale = document.cookie.match(/(?:^|; )hs_locale=([^;]+)/)?.[1] || null;
    const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
    const nextLocale = resolveInitialLocale({ explicit: savedLocale || cookieLocale, acceptLanguage: navigator.languages?.join(",") || navigator.language });
    const savedAddress = normalizedAddressForm(localStorage.getItem(ADDRESS_STORAGE_KEY));
    setLocaleState(nextLocale);
    setAddressFormState(savedAddress);
    applyDocument(nextLocale);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/preferences", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((preferences) => {
        if (!preferences) return;
        if (isLocale(preferences.locale)) {
          setLocaleState(preferences.locale);
          localStorage.setItem(LOCALE_STORAGE_KEY, preferences.locale);
          document.cookie = `${LOCALE_COOKIE}=${preferences.locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
          applyDocument(preferences.locale);
        }
        if (preferences.addressForm) {
          const nextAddress = normalizedAddressForm(preferences.addressForm);
          setAddressFormState(nextAddress);
          localStorage.setItem(ADDRESS_STORAGE_KEY, nextAddress);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const setLocale = (next: AppLocale) => {
    setLocaleState(next);
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
    document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    applyDocument(next);
  };
  const setAddressForm = (next: AddressForm) => {
    setAddressFormState(next);
    localStorage.setItem(ADDRESS_STORAGE_KEY, next);
  };

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    dir: localeDirection(locale),
    addressForm,
    setLocale,
    setAddressForm,
    t: (key) => MESSAGE_CATALOGS[locale][key] || MESSAGE_CATALOGS.he[key],
    addressed: (keys) => MESSAGE_CATALOGS[locale][addressForm === "male" ? keys.male : addressForm === "female" ? keys.female : keys.plural],
  }), [locale, addressForm]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useI18n() { return useContext(Context); }
