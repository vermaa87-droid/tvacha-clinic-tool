import type { Metadata, Viewport } from "next";
import { Outfit, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { LanguageProvider } from "@/lib/language-context";
import { ThemeProvider } from "@/lib/theme-context";

const outfit = Outfit({ subsets: ["latin"], display: "swap" });

// Self-hosted via next/font so the browser picks it up for Devanagari glyphs
// without a render-blocking external stylesheet request.
const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-devanagari",
  display: "swap",
});

// Derived once so the preconnect link has a known origin at build time.
const supabaseOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
})();

export const metadata: Metadata = {
  title: {
    default: "Tvacha Clinic",
    template: "%s | Tvacha Clinic",
  },
  openGraph: {
    title: "Tvacha Clinic",
    description: "AI pre-screening, patient management, and analytics for dermatologists and GP clinics",
    siteName: "Tvacha Clinic",
  },
  description: "AI pre-screening, patient management, and analytics for dermatologists and GP clinics",
  applicationName: "Tvacha Clinic",
  appleWebApp: {
    capable: true,
    title: "Tvacha Clinic",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#b8936a",
  width: "device-width",
  initialScale: 1,
};

// Inline script to prevent flash of wrong theme on load
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('tvacha-theme');
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {supabaseOrigin && (
          <>
            <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        )}
      </head>
      <body className={`${outfit.className} ${notoDevanagari.variable}`}>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <ServiceWorkerRegistrar />
              {children}
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
