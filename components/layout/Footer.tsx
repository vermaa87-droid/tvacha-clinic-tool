"use client";

import Link from "next/link";
import { Mail, Phone, MessageCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-primary-50 border-t border-primary-200 mt-20">
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-serif font-semibold text-lg text-text-primary mb-4">
              Tvacha Clinic Tool
            </h3>
            <p className="text-text-secondary text-sm mb-4">
              Intelligent Dermatology Infrastructure
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
                <MessageCircle size={14} /> WhatsApp Us
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-text-primary mb-3">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/pricing"
                  className="text-text-secondary hover:text-primary-500 text-sm"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/demo"
                  className="text-text-secondary hover:text-primary-500 text-sm"
                >
                  See Demo
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-text-primary mb-3">Company</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-text-secondary hover:text-primary-500 text-sm"
                >
                  About
                </Link>
              </li>
              <li>
                <a
                  href="mailto:contact@tvacha-clinic.com"
                  className="text-text-secondary hover:text-primary-500 text-sm"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-text-primary mb-3">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-text-secondary hover:text-primary-500 text-sm"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-text-secondary hover:text-primary-500 text-sm"
                >
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-primary-200 pt-8 text-center">
          <p className="text-text-secondary text-sm">
            &copy; 2026 Tvacha Clinic Tool by NIDAAN. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
