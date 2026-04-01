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
        <span key={i} style={{ display: "inline-block", overflow: "hidden", marginRight: "0.3em" }}>
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
    <section className="min-h-screen bg-gradient-to-b from-primary-50 to-primary-100 flex items-center relative overflow-hidden">
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
              <span className="badge">Clinical Intelligence Platform</span>
            </motion.div>

            <TextReveal
              text={t("hero_title")}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-text-primary mb-6 leading-tight"
              delay={0.2}
            />

            <motion.p
              className="text-xl text-text-secondary mb-8 font-light"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.9 }}
            >
              {t("hero_subtitle")}
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-3 sm:gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 200, delay: 1.1 }}
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="relative overflow-hidden rounded-lg">
                <Button size="lg" className="bg-primary-500 hover:bg-primary-600 relative overflow-hidden group">
                  <Link href="/signup" className="flex items-center gap-2 relative z-10">
                    {t("hero_cta_trial")} <ArrowRight size={20} />
                  </Link>
                  <span className="absolute inset-0 bg-primary-700 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
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
                className="text-sm text-primary-500 hover:text-primary-600 font-medium underline underline-offset-4 transition-colors"
              >
                {t("hero_how_ai")}
              </Link>
            </motion.div>
          </div>

          <motion.div
            className="relative"
            ref={mockupRef}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease }}
            style={{ willChange: "transform" }}
          >
            <div className="bg-surface border border-primary-200 rounded-lg shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-semibold">Today&apos;s Patients</h3>
                <span className="text-2xl font-bold text-primary-500">12</span>
              </div>
              <div className="border-t border-primary-200 pt-4">
                <h4 className="text-sm font-semibold text-text-primary mb-3">Case Queue</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Fungal</span>
                    <span className="font-semibold">8 cases</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Bacterial</span>
                    <span className="font-semibold">5 cases</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Complex</span>
                    <span className="font-semibold">3 cases</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute right-0 bottom-0 w-32 h-48 bg-surface border border-primary-200 rounded-lg shadow-lg p-4 transform translate-x-12 translate-y-12 hidden md:block">
              <h4 className="text-xs font-semibold text-text-primary mb-3">My Patients</h4>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary-200 rounded-full" />
                  <span>Rajesh K.</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-secondary-400 rounded-full" />
                  <span>Priya S.</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary-300 rounded-full" />
                  <span>Amit P.</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
