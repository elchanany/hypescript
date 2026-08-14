import type { Metadata, Viewport } from "next";
import "./globals.css";
import ChunkReload from "@/components/ChunkReload";
import ToastHost from "@/components/ToastHost";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { BRAND_NAME, BRAND_PATHS, BRAND_TAGLINE_EN, BRAND_TAGLINE_HE } from "@/lib/brand/assets";
import CookieConsent from "@/components/CookieConsent";
import GlobalTooltip from "@/components/GlobalTooltip";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: `${BRAND_NAME} — ${BRAND_TAGLINE_HE}`,
    template: `%s · ${BRAND_NAME}`,
  },
  description: BRAND_TAGLINE_HE,
  applicationName: BRAND_NAME,
  icons: {
    icon: [
      { url: BRAND_PATHS.favicon16, sizes: "16x16", type: "image/png" },
      { url: BRAND_PATHS.favicon32, sizes: "32x32", type: "image/png" },
      { url: BRAND_PATHS.icons[192], sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: BRAND_PATHS.appleTouch, sizes: "180x180" }],
    shortcut: BRAND_PATHS.favicon32,
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: BRAND_NAME,
    description: BRAND_TAGLINE_EN,
    siteName: BRAND_NAME,
    images: [{ url: BRAND_PATHS.openGraph, width: 1200, height: 630, alt: BRAND_NAME }],
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_NAME,
    description: BRAND_TAGLINE_EN,
    images: [BRAND_PATHS.twitter],
  },
  appleWebApp: {
    capable: true,
    title: BRAND_NAME,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07111D" },
    { media: "(prefers-color-scheme: light)", color: "#F5F8F7" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        {/* Prevent theme flash before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('hs_theme')||'light';var d=m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);var c=document.cookie.match(/(?:^|; )hs_locale=([^;]+)/);var l=localStorage.getItem('hs_locale')||(c&&c[1])||'he';var rtl=l==='he'||l==='ar';document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.style.colorScheme=d?'dark':'light';document.documentElement.dataset.locale=l;document.documentElement.lang=l;document.documentElement.dir=rtl?'rtl':'ltr';}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <I18nProvider>
          <ThemeProvider>
            <ChunkReload />
            {children}
            <GlobalTooltip />
            <ToastHost />
            <CookieConsent />
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
