"use client";

import { ReactNode, useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useIsMobile } from "@/lib/use-mobile";
import { Footer } from "@/components/layout/Footer";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface LegalPageShellProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalPageShell({ title, lastUpdated, children }: LegalPageShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <MotionConfig reducedMotion={isMobile ? "always" : "never"}>
      <main className="min-h-screen">
        {/* Mobile menu overlay */}
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
                  <span className="font-serif font-semibold text-text-primary">Menu</span>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-text-secondary hover:text-text-primary"
                  >
                    <X size={22} />
                  </button>
                </div>
                <nav className="flex flex-col gap-1 px-4 py-6">
                  {[
                    { label: "Home", href: "/" },
                    { label: "Pricing", href: "/pricing" },
                    { label: "Sign In", href: "/login" },
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
                      <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                        Get Started
                      </Link>
                    </Button>
                  </div>
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Top nav */}
        <nav
          className="border-b border-primary-200 sticky top-0 z-40"
          style={{ background: "var(--nav-bg-scrolled)" }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 flex items-center justify-between">
            <Logo />
            <div className="flex items-center gap-4 md:gap-6">
              <Link href="/" className="text-text-secondary hover:text-text-primary font-medium hidden md:block">
                Home
              </Link>
              <Link href="/pricing" className="text-text-secondary hover:text-text-primary font-medium hidden md:block">
                Pricing
              </Link>
              <Link href="/login" className="text-text-secondary hover:text-text-primary font-medium hidden md:block">
                Sign In
              </Link>
              <Button size="sm" className="bg-primary-500 hover:bg-primary-600 text-white hidden md:inline-flex">
                <Link href="/signup">Get Started</Link>
              </Button>
              <div className="hidden md:block">
                <LanguageToggle />
              </div>
              <div className="hidden md:block">
                <ThemeToggle />
              </div>
              <button
                className="md:hidden p-2 text-text-secondary hover:text-text-primary"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </nav>

        {/* Header band */}
        <section className="py-14 md:py-20" style={{ background: "var(--color-primary-50)" }}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-text-primary mb-3">
              {title}
            </h1>
            <p className="text-sm text-text-secondary font-light">Last updated: {lastUpdated}</p>
          </div>
        </section>

        {/* Body */}
        <article
          className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-12 md:py-16 legal-prose text-text-primary"
          style={{ fontFamily: "var(--font-outfit, 'Outfit'), sans-serif" }}
        >
          {children}
        </article>

        <Footer />
      </main>

      <style jsx global>{`
        .legal-prose h2 {
          font-family: "Cormorant Garamond", serif;
          font-size: 1.75rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin-top: 2.5rem;
          margin-bottom: 0.75rem;
          line-height: 1.25;
        }
        .legal-prose h3 {
          font-family: "Cormorant Garamond", serif;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .legal-prose p {
          color: var(--color-text-secondary);
          font-weight: 300;
          line-height: 1.75;
          margin-bottom: 1rem;
        }
        .legal-prose ul {
          list-style: disc;
          padding-left: 1.4rem;
          margin-bottom: 1rem;
          color: var(--color-text-secondary);
          font-weight: 300;
        }
        .legal-prose li {
          line-height: 1.75;
          margin-bottom: 0.4rem;
        }
        .legal-prose strong {
          color: var(--color-text-primary);
          font-weight: 600;
        }
        .legal-prose em {
          color: var(--color-text-primary);
          font-style: italic;
          font-weight: 500;
        }
        .legal-prose a {
          color: #b8936a;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .legal-prose a:hover {
          color: #a37d58;
        }
        .legal-prose hr {
          border: none;
          border-top: 1px solid #e8dfcf;
          margin: 2.5rem 0;
        }
      `}</style>
    </MotionConfig>
  );
}
