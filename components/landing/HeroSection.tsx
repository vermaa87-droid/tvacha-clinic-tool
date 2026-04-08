"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";

const ease: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

function TextReveal({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const words = text.split(" ");
  return (
    <h1 className={className}>
      {words.map((word, i) => (
        <span key={i} style={{ display: "inline-block", marginRight: "0.3em" }}>
          <motion.span
            style={{ display: "inline-block" }}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.55, delay: delay + i * 0.05, ease }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}

export function HeroSection() {
  const { t } = useLanguage();
  const mockupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Skip parallax on mobile — saves a scroll listener + RAF per scroll
    const isTouch = window.matchMedia("(hover: none)").matches || window.innerWidth < 768;
    if (isTouch) return;

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (mockupRef.current) {
            const scrollY = window.scrollY;
            mockupRef.current.style.transform = `translateY(${scrollY * 0.12}px)`;
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="min-h-screen flex items-center relative overflow-hidden" style={{ background: "transparent" }}>
      <div className="float-element absolute top-24 left-8 w-16 h-16 rounded-full border-2 border-primary-500 opacity-5" style={{ animationDelay: "0s" }} />
      <div className="float-element absolute bottom-32 left-24 w-8 h-8 rounded-full bg-primary-500 opacity-5" style={{ animationDelay: "2s" }} />
      <div className="float-element absolute top-1/3 right-8 w-24 h-24 rounded-full border border-primary-500 opacity-5" style={{ animationDelay: "4s" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-12 md:py-20 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mb-4"
            >
              <span
                className="inline-block text-xs font-semibold uppercase"
                style={{ color: "#2d4a3e", letterSpacing: "0.18em" }}
              >
                Clinical Intelligence Platform
              </span>
            </motion.div>

            <TextReveal
              text={t("hero_title")}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-text-primary mb-6 leading-tight"
              delay={0.2}
            />

            <motion.p
              className="text-lg mb-8 font-light leading-relaxed"
              style={{ color: "#c4a46b" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.9 }}
            >
              AI pre-screening. Patient management. Prescription templates. Clinic analytics. All for ₹2,000/month.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-3 sm:gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 200, delay: 1.1 }}
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="relative overflow-hidden rounded-lg">
                <Button size="lg" className="bg-[#7a5c35] hover:bg-[#7a5c35] relative overflow-hidden group">
                  <Link href="/signup" className="flex items-center gap-2 relative z-10">
                    {t("hero_cta_trial")} <ArrowRight size={20} />
                  </Link>
                  <span className="absolute inset-0 bg-[#5c4527] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" size="lg" className="border-2 border-primary-500">
                  {t("hero_cta_demo")}
                </Button>
              </motion.div>
            </motion.div>

            <motion.div
              className="flex flex-wrap items-center gap-4 mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.3 }}
            >
              <p className="text-text-muted text-sm">{t("hero_trial_note")}</p>
              <Link
                href="/how-it-works"
                className="text-sm font-medium underline underline-offset-4 transition-colors"
                style={{ color: "#2d4a3e" }}
              >
                {t("hero_how_ai")}
              </Link>
            </motion.div>
          </div>

          <motion.div
            className="relative pb-16 md:pb-0 hidden md:block"
            ref={mockupRef}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease }}
            style={{ willChange: "transform" }}
          >
            <div className="border border-primary-200 rounded-lg shadow-2xl p-6 space-y-4" style={{ background: "var(--color-card)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-semibold text-text-primary">Today&apos;s Patients</h3>
                  <p className="text-xs mt-0.5" style={{ color: "#2d4a3e" }}>3 pending reviews</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-primary-500">12</span>
                  <p className="text-xs text-text-muted">seen today</p>
                </div>
              </div>
              <div className="border-t border-primary-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-text-primary">Case Queue</h4>
                  <span className="text-xs text-text-muted">AI pre-screened</span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#d97706" }} />
                      <span className="text-sm text-text-secondary">Fungal</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-text-primary">8 cases</span>
                      <div className="w-12 h-1.5 bg-primary-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: "67%", background: "#d97706" }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#2d4a3e" }} />
                      <span className="text-sm text-text-secondary">Bacterial</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-text-primary">5 cases</span>
                      <div className="w-12 h-1.5 bg-primary-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: "42%", background: "#2d4a3e" }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#dc2626" }} />
                      <span className="text-sm text-text-secondary">Complex</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-text-primary">3 cases</span>
                      <div className="w-12 h-1.5 bg-primary-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: "25%", background: "#dc2626" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute right-0 bottom-0 w-44 border border-primary-200 rounded-lg shadow-lg p-4 transform translate-x-2 translate-y-14 md:translate-x-12 md:translate-y-12" style={{ background: "var(--color-card)" }}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-text-primary">My Patients</h4>
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "rgba(45,74,62,0.1)", color: "#2d4a3e" }}>24 total</span>
              </div>
              <ul className="space-y-2.5 text-xs">
                <li className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-primary-400 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ fontSize: "9px" }}>RK</div>
                  <div>
                    <p className="font-medium text-text-primary leading-tight">Rajesh K.</p>
                    <p className="text-text-muted leading-tight" style={{ fontSize: "9px" }}>Last visit: 2d ago</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-primary-300 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ fontSize: "9px" }}>PS</div>
                  <div>
                    <p className="font-medium text-text-primary leading-tight">Priya S.</p>
                    <p className="text-text-muted leading-tight" style={{ fontSize: "9px" }}>Follow-up pending</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-primary-200 rounded-full flex items-center justify-center font-bold flex-shrink-0" style={{ fontSize: "9px", color: "var(--sidebar-active-color)" }}>AP</div>
                  <div>
                    <p className="font-medium text-text-primary leading-tight">Amit P.</p>
                    <p className="text-text-muted leading-tight" style={{ fontSize: "9px" }}>New patient</p>
                  </div>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
