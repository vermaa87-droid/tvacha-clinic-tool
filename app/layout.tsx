import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/SmoothScroll";
import { CustomCursor } from "@/components/CustomCursor";
import { AuthProvider } from "@/components/AuthProvider";
import { LanguageProvider } from "@/lib/language-context";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Tvacha Clinic Tool",
    template: "%s | Tvacha Clinic Tool",
  },
  description: "AI pre-screening, patient management, and analytics for dermatologists and GP clinics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={outfit.className}>
        <LanguageProvider>
          <AuthProvider>
            <SmoothScroll>
              <CustomCursor />
              {children}
            </SmoothScroll>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
