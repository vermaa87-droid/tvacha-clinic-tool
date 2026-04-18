"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useLanguage } from "@/lib/language-context";

/**
 * Client island that owns the scroll-shadow nav state and the mobile-menu
 * overlay. Extracted from the landing page so app/(marketing)/page.tsx can be
 * a server component.
 */
export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.nav
        className="sticky top-0 z-40 transition-all duration-300"
        style={{
          backgroundColor: scrolled ? "var(--nav-bg-scrolled)" : "transparent",
          borderBottom: scrolled
            ? "1px solid var(--nav-border-scrolled)"
            : "1px solid transparent",
          boxShadow: scrolled ? "var(--nav-shadow-scrolled)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Logo />
          </motion.div>
          <div className="flex items-center gap-4">
            {["How Our AI Works", "Pricing", "Download", "Sign In"].map(
              (label, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
                >
                  <Link
                    href={
                      label === "Pricing"
                        ? "/pricing"
                        : label === "Sign In"
                        ? "/login"
                        : label === "Download"
                        ? "/#download"
                        : "/how-it-works"
                    }
                    className="text-text-secondary hover:text-text-primary font-medium transition-colors hidden md:block text-sm"
                  >
                    {label === "How Our AI Works"
                      ? t("nav_how_ai_works")
                      : label === "Pricing"
                      ? t("nav_pricing")
                      : label === "Download"
                      ? "Download"
                      : t("nav_signin")}
                  </Link>
                </motion.div>
              )
            )}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.44 }}
              className="hidden md:block"
            >
              <LanguageToggle />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.48 }}
              className="hidden md:block"
            >
              <ThemeToggle />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.52 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                size="sm"
                className="bg-primary-500 hover:bg-primary-600 text-white hidden md:inline-flex"
              >
                <Link href="/signup">{t("nav_getstarted")}</Link>
              </Button>
            </motion.div>
            <button
              className="md:hidden p-2 text-text-secondary hover:text-text-primary"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-50 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              className="fixed top-0 right-0 h-full w-72 bg-primary-50 z-50 flex flex-col shadow-2xl md:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-primary-200">
                <span className="font-serif font-semibold text-text-primary">
                  Menu
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-text-secondary hover:text-text-primary"
                >
                  <X size={22} />
                </button>
              </div>
              <nav className="flex flex-col gap-1 px-4 py-6">
                {[
                  { label: t("nav_how_ai_works"), href: "/how-it-works" },
                  { label: t("nav_pricing"), href: "/pricing" },
                  { label: "Download", href: "/#download" },
                  { label: t("nav_signin"), href: "/login" },
                ].map(({ label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-primary-100 rounded-lg font-medium transition-colors"
                  >
                    {label}
                  </Link>
                ))}
                <div className="mt-4 px-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <LanguageToggle />
                    <ThemeToggle />
                  </div>
                  <Button className="w-full bg-primary-500 hover:bg-primary-600 text-white">
                    <Link
                      href="/signup"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t("nav_getstarted")}
                    </Link>
                  </Button>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
