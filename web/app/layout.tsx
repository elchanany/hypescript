import type { Metadata, Viewport } from "next";
import "./globals.css";
import ChunkReload from "@/components/ChunkReload";
import ToastHost from "@/components/ToastHost";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { BRAND_NAME, BRAND_PATHS, BRAND_TAGLINE_EN, BRAND_TAGLINE_HE } from "@/lib/brand/assets";

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
    { media: "(prefers-color-scheme: dark)", color: "#111317" },
    { media: "(prefers-color-scheme: light)", color: "#F6F7F9" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        {/* Prevent theme flash before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('hs_theme')||'light';var d=m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <ChunkReload />
          {children}
          <ToastHost />
        </ThemeProvider>
      </body>
    </html>
  );
}
