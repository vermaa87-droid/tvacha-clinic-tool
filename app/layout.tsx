import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/SmoothScroll";
import { CustomCursor } from "@/components/CustomCursor";
import { FloralVineBackground } from "@/components/FloralVineBackground";
import { AuthProvider } from "@/components/AuthProvider";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { LanguageProvider } from "@/lib/language-context";
import { ThemeProvider } from "@/lib/theme-context";

const outfit = Outfit({ subsets: ["latin"] });

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
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={outfit.className}>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <ServiceWorkerRegistrar />
              <SmoothScroll>
                <FloralVineBackground />
                <CustomCursor />
                <div style={{ position: "relative", zIndex: 1 }}>
                  {children}
                </div>
              </SmoothScroll>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
