"use client";

import Link from "next/link";
import { Mail, Phone, MessageCircle } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-primary-50 border-t border-primary-200 mt-20">
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-serif font-semibold text-lg text-text-primary mb-4">
              Tvacha Clinic Tool
            </h3>
            <p className="text-text-secondary text-sm mb-4">
              {t("footer_tagline")}
            </p>
            <div className="space-y-2">
              <a
                href="mailto:support@tvacha-clinic.com"
                className="flex items-center gap-2 text-text-secondary hover:text-primary-500 text-sm transition-colors"
              >
                <Mail size={14} /> support@tvacha-clinic.com
              </a>
              <a
                href="tel:+917881154003"
                className="flex items-center gap-2 text-text-secondary hover:text-primary-500 text-sm transition-colors"
              >
                <Phone size={14} /> +91 7881154003
              </a>
              <a
                href="https://wa.me/917881154003"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-text-secondary hover:text-primary-500 text-sm transition-colors"
              >
                <MessageCircle size={14} /> {t("footer_whatsapp")}
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-text-primary mb-3">{t("footer_product")}</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/pricing" className="text-text-secondary hover:text-primary-500 text-sm">
                  {t("footer_pricing")}
                </Link>
              </li>
              <li>
                <Link href="/demo" className="text-text-secondary hover:text-primary-500 text-sm">
                  {t("footer_demo")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-text-primary mb-3">{t("footer_company")}</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-text-secondary hover:text-primary-500 text-sm">
                  {t("footer_about")}
                </Link>
              </li>
              <li>
                <a href="mailto:contact@tvacha-clinic.com" className="text-text-secondary hover:text-primary-500 text-sm">
                  {t("footer_contact_link")}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-text-primary mb-3">{t("footer_legal")}</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-text-secondary hover:text-primary-500 text-sm">
                  {t("footer_privacy")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-text-secondary hover:text-primary-500 text-sm">
                  {t("footer_terms")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-primary-200 pt-8 text-center">
          <p className="text-text-secondary text-sm">
            &copy; 2026 Tvacha Clinic Tool. {t("footer_rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
