import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/SmoothScroll";
import { CustomCursor } from "@/components/CustomCursor";
import { AuthProvider } from "@/components/AuthProvider";

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
      <body className={outfit.className}>
        <AuthProvider>
          <SmoothScroll>
            <CustomCursor />
            {children}
          </SmoothScroll>
        </AuthProvider>
      </body>
    </html>
  );
}
