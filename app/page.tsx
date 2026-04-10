"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { useIsMobile } from "@/lib/use-mobile";
import { createPortal } from "react-dom";
import { Menu, X, Play } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { Button } from "@/components/ui/Button";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useLanguage } from "@/lib/language-context";
import Link from "next/link";

const highlights = [
  {
    stat: "5 Crore+",
    labelKey: "Training Images" as const,
    desc: "Deep learning engine trained on over 5 crore dermatological images from global datasets.",
  },
  {
    stat: "5 Lakh+",
    labelKey: "Indian Skin Images" as const,
    desc: "Fine-tuned specifically on Indian skin tones (Fitzpatrick IV\u2013VI) for accurate diagnosis across all complexions.",
  },
  {
    stat: "25+",
    labelKey: "Skin Conditions" as const,
    desc: "Covers the most common conditions seen in Indian OPDs \u2014 from tinea to psoriasis to acne.",
  },
];

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <MotionConfig reducedMotion={isMobile ? "always" : "never"}>
    <main className="min-h-screen">
      {/* Navigation */}
      <motion.nav
        className="sticky top-0 z-40 transition-all duration-300"
        style={{
          backgroundColor: scrolled ? "var(--nav-bg-scrolled)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? "1px solid var(--nav-border-scrolled)" : "1px solid transparent",
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
            {["How Our AI Works", "Pricing", "Sign In"].map((label, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
              >
                <Link
                  href={label === "Pricing" ? "/pricing" : label === "Sign In" ? "/login" : "/how-it-works"}
                  className="text-text-secondary hover:text-text-primary font-medium transition-colors hidden md:block text-sm"
                >
                  {label === "How Our AI Works" ? t("nav_how_ai_works") : label === "Pricing" ? t("nav_pricing") : t("nav_signin")}
                </Link>
              </motion.div>
            ))}
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
              <Button size="sm" className="bg-primary-500 hover:bg-primary-600 text-white hidden md:inline-flex">
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

      {/* Mobile overlay menu */}
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
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-text-secondary hover:text-text-primary">
                  <X size={22} />
                </button>
              </div>
              <nav className="flex flex-col gap-1 px-4 py-6">
                {[
                  { label: t("nav_how_ai_works"), href: "/how-it-works" },
                  { label: t("nav_pricing"), href: "/pricing" },
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
                    <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>{t("nav_getstarted")}</Link>
                  </Button>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <HeroSection onShowDemo={() => setShowDemo(true)} />
      <FeaturesSection />
      <PricingSection />

      {/* AI & Technology Section */}
      <section className="py-20" style={{ background: "transparent" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <motion.h2
            className="text-3xl font-serif font-bold text-text-primary text-center mb-4"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {t("ai_section_title")}
          </motion.h2>
          <motion.p
            className="text-text-secondary text-center mb-12 text-lg font-light max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {t("ai_section_subtitle")}
          </motion.p>
          <div className="flex flex-col md:flex-row items-stretch justify-center mt-12 max-w-3xl mx-auto divide-y md:divide-y-0 md:divide-x divide-primary-200">
            {highlights.map((h, i) => (
              <motion.div
                key={i}
                className="flex-1 text-center px-8 py-8"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
              >
                <p
                  className="text-5xl font-serif font-bold leading-none mb-2"
                  style={{ color: "#b8936a" }}
                >
                  {h.stat}
                </p>
                <p className="font-semibold text-text-primary mb-2">{h.labelKey}</p>
                <p className="text-text-secondary text-sm leading-relaxed max-w-[200px] mx-auto">
                  {h.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-500 text-white relative overflow-hidden">
        <div className="float-element absolute top-8 right-16 w-32 h-32 rounded-full border border-white opacity-10" style={{ animationDelay: "1s" }} />
        <div className="float-element absolute bottom-8 left-16 w-20 h-20 rounded-full border border-white opacity-10" style={{ animationDelay: "3s" }} />
        <motion.div
          className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 text-center relative z-10"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 className="text-4xl font-serif font-bold mb-6">
            {t("cta_title")}
          </h2>
          <p className="text-xl mb-8 opacity-90">
            {t("cta_subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                variant="secondary"
                className="bg-[#7a5c35] text-white hover:bg-white hover:text-primary-600 transition-colors"
              >
                <Link href="/signup">{t("cta_trial")}</Link>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <button
                type="button"
                onClick={() => setShowDemo(true)}
                className="flex items-center gap-2 px-8 py-4 text-lg font-medium rounded-lg border-2 border-white text-white hover:bg-white/10 transition-colors"
              >
                <Play size={18} /> {t("cta_demo")}
              </button>
            </motion.div>
          </div>
          <p className="mt-6 text-sm opacity-75 flex items-center justify-center gap-2">
            <span style={{ color: "#d4b896" }}>&#10003;</span>
            {t("cta_verified")}
          </p>
        </motion.div>
      </section>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <Footer />
      </motion.div>
    </main>

    {/* Demo Video Modal */}
    {showDemo && createPortal(
      <div
        style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.88)" }}
        onClick={() => setShowDemo(false)}
      >
        <div
          style={{ position: "relative", width: "100%", maxWidth: 800, borderRadius: 16, overflow: "hidden", background: "#000", border: "1px solid rgba(184,147,106,0.3)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setShowDemo(false)}
            style={{ position: "absolute", top: 12, right: 12, zIndex: 10, padding: 8, borderRadius: 9999, background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", cursor: "pointer", display: "flex" }}
          >
            <X size={20} />
          </button>
          <div style={{ aspectRatio: "16/9", width: "100%", background: "#000" }}>
            <video
              controls
              autoPlay
              muted
              playsInline
              style={{ width: "100%", height: "100%" }}
              src="https://hvqeeokspruhbqdbrswg.supabase.co/storage/v1/object/public/assets/demo-video.mp4"
              onError={(e) => {
                const el = e.currentTarget;
                el.style.display = "none";
                const fallback = document.createElement("div");
                fallback.style.cssText = "display:flex;align-items:center;justify-content:center;height:100%;color:#b8936a;font-size:16px;font-family:Outfit,sans-serif;text-align:center;padding:20px";
                fallback.textContent = "Demo video loading failed. Please try again later.";
                el.parentElement?.appendChild(fallback);
              }}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </div>,
      document.body
    )}

    </MotionConfig>
  );
}
