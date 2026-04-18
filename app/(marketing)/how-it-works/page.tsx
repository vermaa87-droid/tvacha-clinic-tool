"use client";

import { useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { useIsMobile } from "@/lib/use-mobile";
import { Logo } from "@/components/layout/Logo";
import { Footer } from "@/components/layout/Footer";
import { NeuralNetworkBackground } from "@/components/NeuralNetworkBackground";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  Layers,
  RotateCcw,
  Zap,
  BarChart3,
  Menu,
  X,
  Shield,
  ArrowRight,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────── */
/*  Editorial section divider — uppercase label + extending line             */
/* ────────────────────────────────────────────────────────────────────────── */

function SectionDivider({
  label,
  desc,
  topClass = "mt-28",
}: {
  label: string;
  desc: string;
  topClass?: string;
}) {
  return (
    <motion.div
      className={`mb-12 ${topClass}`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-4 mb-3">
        <span
          className="text-xs font-bold uppercase whitespace-nowrap"
          style={{ color: "#2d4a3e", letterSpacing: "0.2em" }}
        >
          {label}
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--color-primary-200)" }} />
      </div>
      <p className="text-sm max-w-xl leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
        {desc}
      </p>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Deep Learning Pipeline visual                                             */
/* ────────────────────────────────────────────────────────────────────────── */

function DeepLearningPipeline() {
  const steps = [
    { title: "ImageNet-22k", sub: "Pre-training", desc: "22k classes · rich visual features", bg: "var(--color-surface)" },
    { title: "Skin Dataset", sub: "Fine-tuning", desc: "5 Cr+ dermoscopy images", bg: "var(--color-surface)" },
    { title: "Clinical", sub: "Validation", desc: "Real-world accuracy testing", bg: "var(--color-surface)" },
  ];
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--color-card)", border: "1px solid var(--color-primary-200)" }}>
      <p
        className="text-[10px] font-semibold uppercase mb-4"
        style={{ color: "var(--color-text-secondary)", letterSpacing: "0.12em" }}
      >
        Model Architecture Pipeline
      </p>
      <div className="flex items-stretch flex-wrap gap-y-2 overflow-x-auto">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center">
            <div
              className="px-3.5 py-2.5 rounded-lg text-center"
              style={{ background: step.bg, border: "1px solid var(--color-primary-200)" }}
            >
              <p className="text-xs font-bold" style={{ color: "#b8936a" }}>{step.title}</p>
              <p className="text-[10px] font-semibold" style={{ color: "var(--color-text-muted)" }}>{step.sub}</p>
              <p className="text-[9px] mt-1" style={{ color: "var(--color-text-secondary)" }}>{step.desc}</p>
            </div>
            {i < steps.length - 1 && (
              <div className="px-2">
                <ArrowRight size={13} style={{ color: "#c8b898" }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--color-primary-200)" }}>
        <p className="text-xs font-bold" style={{ color: "#b8936a" }}>50M parameters · ConvNeXt architecture</p>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
          Mixed precision training · Gradient accumulation
        </p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Fitzpatrick + Processing Stages visual                                   */
/* ────────────────────────────────────────────────────────────────────────── */

function ImageProcessingVisual() {
  const tones = [
    { hex: "#f5d5b8", label: "I" },
    { hex: "#e8b891", label: "II" },
    { hex: "#c68642", label: "III" },
    { hex: "#a0522d", label: "IV" },
    { hex: "#6b3a2a", label: "V" },
    { hex: "#3b1f15", label: "VI" },
  ];
  const stages = ["Detect", "Quality Check", "Normalize", "Enhance"];
  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4" style={{ background: "var(--color-card)", border: "1px solid var(--color-primary-200)" }}>
        <p
          className="text-[10px] font-semibold uppercase mb-3"
          style={{ color: "var(--color-text-secondary)", letterSpacing: "0.12em" }}
        >
          Fitzpatrick Scale I–VI Coverage
        </p>
        <div className="flex items-center gap-2.5 overflow-x-auto">
          {tones.map(({ hex, label }) => (
            <div key={hex} className="flex flex-col items-center gap-1">
              <div className="w-7 h-7 rounded-full shadow-sm" style={{ background: hex }} />
              <span className="text-[8px] font-medium" style={{ color: "var(--color-text-secondary)" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl p-4" style={{ background: "var(--color-card)", border: "1px solid var(--color-primary-200)" }}>
        <p
          className="text-[10px] font-semibold uppercase mb-3"
          style={{ color: "var(--color-text-secondary)", letterSpacing: "0.12em" }}
        >
          Processing Stages
        </p>
        <div className="flex items-center gap-2 flex-wrap overflow-x-auto">
          {stages.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="px-2.5 py-1.5 rounded-md"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-primary-200)" }}
              >
                <p className="text-[10px] font-bold" style={{ color: "#b8936a" }}>{s}</p>
              </div>
              {i < stages.length - 1 && <ArrowRight size={10} style={{ color: "#c8b898" }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  7-Pass Ensemble visual                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

function SevenPassVisual() {
  const heights = [58, 72, 54, 80, 66, 74, 86];
  return (
    <div
      className="mt-5 rounded-xl p-5"
      style={{ background: "var(--color-card)", border: "1px solid var(--color-primary-200)" }}
    >
      <p
        className="text-[10px] font-semibold uppercase mb-4"
        style={{ color: "var(--color-text-secondary)", letterSpacing: "0.12em" }}
      >
        7-Pass Ensemble Analysis
      </p>
      <div className="flex items-end gap-2 overflow-x-auto">
        <div className="flex items-end gap-1.5 h-14 flex-1">
          {heights.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-sm"
                style={{ height: `${h}%`, background: "var(--color-primary-200)", minHeight: "8px" }}
              />
              <span className="text-[8px] font-medium" style={{ color: "var(--color-text-secondary)" }}>P{i + 1}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pb-5 flex-shrink-0">
          <ArrowRight size={14} style={{ color: "#c8b898" }} />
          <div
            className="px-3 py-2.5 rounded-lg text-center"
            style={{ background: "var(--color-surface)", border: "1.5px solid #b8936a" }}
          >
            <p className="text-[10px] font-bold" style={{ color: "#b8936a" }}>Combined</p>
            <p className="text-[9px]" style={{ color: "var(--color-text-secondary)" }}>Ensemble</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Augmentation strategies visual                                           */
/* ────────────────────────────────────────────────────────────────────────── */

function AugmentationVisual() {
  const strategies = [
    "Rotation", "Flip", "Zoom", "Brightness", "Contrast",
    "Blur", "Crop", "Color Jitter", "MixUp", "CutMix", "+ 7 more",
  ];
  return (
    <div
      className="mt-4 rounded-xl p-4"
      style={{ background: "var(--color-card)", border: "1px solid var(--color-primary-200)" }}
    >
      <p
        className="text-[10px] font-semibold uppercase mb-3"
        style={{ color: "var(--color-text-secondary)", letterSpacing: "0.12em" }}
      >
        17 Augmentation Strategies
      </p>
      <div className="flex flex-wrap gap-1.5">
        {strategies.map((s, i) => (
          <span
            key={i}
            className="text-[10px] font-medium px-2 py-1 rounded"
            style={{
              background: i === strategies.length - 1 ? "var(--color-surface)" : "rgba(184,147,106,0.1)",
              color: i === strategies.length - 1 ? "#b8936a" : "var(--color-text-muted)",
              border: i === strategies.length - 1 ? "1px solid var(--color-primary-200)" : "none",
            }}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Page                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

export default function HowItWorksPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  return (
    <MotionConfig reducedMotion={isMobile ? "always" : "never"}>
    <main className="min-h-screen" style={{ background: "transparent", position: "relative" }}>
      <NeuralNetworkBackground />
      <div style={{ position: "relative", zIndex: 1 }}>

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
              className="fixed top-0 right-0 h-full w-72 z-50 flex flex-col shadow-2xl md:hidden"
              style={{ background: "var(--color-surface)" }}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
            >
              <div
                className="flex items-center justify-between px-6 py-5"
                style={{ borderBottom: "1px solid var(--color-primary-200)" }}
              >
                <span className="font-serif font-semibold" style={{ color: "var(--color-text-primary)" }}>Menu</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2" style={{ color: "var(--color-text-secondary)" }}>
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
                    className="px-4 py-3 rounded-lg font-medium"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {label}
                  </Link>
                ))}
                <div className="mt-4 px-4">
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center text-sm font-semibold px-4 py-3 rounded-lg text-white"
                    style={{ background: "#b8936a" }}
                  >
                    {t("nav_getstarted")}
                  </Link>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Navbar */}
      <nav
        className="sticky top-0 z-40 will-change-transform [contain:layout_paint]"
        style={{
          background: "var(--nav-bg-scrolled)",
          borderBottom: "1px solid var(--color-primary-200)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4 md:gap-6">
            <Link href="/pricing" className="font-medium text-sm hidden md:block" style={{ color: "var(--color-text-secondary)" }}>
              {t("nav_pricing")}
            </Link>
            <Link href="/login" className="font-medium text-sm hidden md:block" style={{ color: "var(--color-text-secondary)" }}>
              {t("nav_signin")}
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold px-4 py-2 rounded-lg text-white hidden md:block"
              style={{ background: "#b8936a" }}
            >
              {t("nav_getstarted")}
            </Link>
            <LanguageToggle />
            <ThemeToggle />
            <button
              className="md:hidden p-2"
              style={{ color: "var(--color-text-secondary)" }}
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <section
          className="py-24 md:py-32"
          style={{ background: "var(--color-primary-50)" }}
        >
          <div className="max-w-3xl mx-auto px-6 md:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1
                className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-serif font-bold mb-5 leading-tight"
                style={{ color: "var(--color-text-primary)" }}
              >
                {t("hiw_title")}
              </h1>
              <p className="text-lg font-light leading-relaxed max-w-2xl mx-auto" style={{ color: "var(--color-text-secondary)" }}>
                {t("hiw_subtitle")}
              </p>
            </motion.div>

            {/* Hero-sized typographic stat callouts — no pills, no borders */}
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-16 mt-14"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {[
                { value: "50M", label: t("hiw_stat_params") },
                { value: "5 Cr+", label: t("hiw_stat_images") },
                { value: "7×", label: t("hiw_stat_passes") },
                { value: "2.5×", label: t("hiw_stat_cancer") },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p
                    className="text-3xl sm:text-5xl md:text-6xl font-serif font-bold leading-none"
                    style={{ color: "#b8936a" }}
                  >
                    {value}
                  </p>
                  <p
                    className="text-xs font-semibold uppercase mt-3"
                    style={{ color: "var(--color-text-secondary)", letterSpacing: "0.14em" }}
                  >
                    {label}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>
      </div>

      {/* ── Architecture + Training sections ── */}
      <div
        className="max-w-4xl mx-auto px-6 md:px-8 pt-12 pb-28"
        style={{ position: "relative", zIndex: 1 }}
      >

        {/* ARCHITECTURE */}
        <SectionDivider
          label={t("hiw_s1_badge")}
          desc={t("hiw_s1_summary")}
          topClass="mt-0"
        />

        <div className="space-y-6">

          {/* Advanced Deep Learning Model */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="rounded-2xl p-7 md:p-9"
            style={{
              background: "var(--color-card)",
              border: "1px solid var(--color-primary-200)",
              borderLeft: "4px solid #b8936a",
              boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
            }}
          >
            <h3 className="text-2xl md:text-3xl font-serif font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
              {t("hiw_s1_title")}
            </h3>
            <p className="text-sm italic mb-6" style={{ color: "var(--color-text-secondary)" }}>{t("hiw_s1_b1")}</p>
            <div className="grid md:grid-cols-2 gap-6 items-start">
              <div className="space-y-3">
                {[t("hiw_s1_b2"), t("hiw_s1_b3")].map((p, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: "#b8936a" }}
                    />
                    <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-primary)" }}>{p}</p>
                  </div>
                ))}
              </div>
              <DeepLearningPipeline />
            </div>
          </motion.div>

          {/* Smart Image Processing */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="rounded-2xl p-7 md:p-9"
            style={{
              background: "var(--color-card)",
              border: "1px solid var(--color-primary-200)",
              borderLeft: "4px solid #b8936a",
              boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
            }}
          >
            <h3 className="text-2xl md:text-3xl font-serif font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
              {t("hiw_s2_title")}
            </h3>
            <p className="text-sm italic mb-6" style={{ color: "var(--color-text-secondary)" }}>{t("hiw_s2_summary")}</p>
            <div className="grid md:grid-cols-2 gap-6 items-start">
              <div className="space-y-3">
                {[t("hiw_s2_b1"), t("hiw_s2_b2"), t("hiw_s2_b3"), t("hiw_s2_b4")].map((p, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: "#b8936a" }}
                    />
                    <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-primary)" }}>{p}</p>
                  </div>
                ))}
              </div>
              <ImageProcessingVisual />
            </div>
          </motion.div>
        </div>

        {/* TRAINING */}
        <SectionDivider
          label={t("hiw_s7_badge")}
          desc={t("hiw_s3_summary")}
        />

        {/* Asymmetric staggered layout */}
        <div className="space-y-5">

          {/* Row 1: 7-Pass (col-2, featured) + Smart Training Pipeline (col-1) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

            {/* 7-Pass Analysis Per Photo — featured */}
            <motion.div
              className="lg:col-span-2"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div
                className="rounded-2xl p-6 md:p-8"
                style={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-primary-200)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                }}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <RotateCcw size={20} style={{ color: "#b8936a" }} />
                  <h3 className="text-xl font-serif font-bold" style={{ color: "var(--color-text-primary)" }}>
                    {t("hiw_s4_title")}
                  </h3>
                </div>
                <p className="text-sm mb-3" style={{ color: "var(--color-text-secondary)" }}>{t("hiw_s4_b1")}</p>
                <div className="space-y-1.5">
                  {[t("hiw_s4_b2"), t("hiw_s4_b3")].map((p, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#b8936a" }} />
                      <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-primary)" }}>{p}</p>
                    </div>
                  ))}
                </div>
                <SevenPassVisual />
              </div>
            </motion.div>

            {/* Smart Training Pipeline */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            >
              <div
                className="rounded-2xl p-6"
                style={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-primary-200)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                }}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <Zap size={18} style={{ color: "#b8936a" }} />
                  <h3 className="text-lg font-serif font-bold" style={{ color: "var(--color-text-primary)" }}>
                    {t("hiw_s7_title")}
                  </h3>
                </div>
                <p className="text-xs mb-4" style={{ color: "var(--color-text-secondary)" }}>{t("hiw_s7_summary")}</p>
                <div className="space-y-3">
                  {[t("hiw_s7_b1"), t("hiw_s7_b2"), t("hiw_s7_b3"), t("hiw_s7_b4")].map((p, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#b8936a" }} />
                      <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-primary)" }}>{p}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Row 2: 17 Data Augmentation (col-1) + Evaluation (col-2, featured) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

            {/* 17 Data Augmentation Strategies */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: 0.05, ease: "easeOut" }}
            >
              <div
                className="rounded-2xl p-6"
                style={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-primary-200)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                }}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <Layers size={18} style={{ color: "#b8936a" }} />
                  <h3 className="text-lg font-serif font-bold" style={{ color: "var(--color-text-primary)" }}>
                    {t("hiw_s3_title")}
                  </h3>
                </div>
                <p className="text-xs mb-4" style={{ color: "var(--color-text-secondary)" }}>{t("hiw_s3_summary")}</p>
                <div className="space-y-3">
                  {[t("hiw_s3_b1"), t("hiw_s3_b2")].map((p, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#b8936a" }} />
                      <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-primary)" }}>{p}</p>
                    </div>
                  ))}
                </div>
                <AugmentationVisual />
              </div>
            </motion.div>

            {/* Evaluation & Transparency — featured */}
            <motion.div
              className="lg:col-span-2"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            >
              <div
                className="rounded-2xl p-6 md:p-8"
                style={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-primary-200)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                }}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <BarChart3 size={20} style={{ color: "#b8936a" }} />
                  <h3 className="text-xl font-serif font-bold" style={{ color: "var(--color-text-primary)" }}>
                    {t("hiw_s8_title")}
                  </h3>
                </div>
                <p className="text-sm mb-5" style={{ color: "var(--color-text-secondary)" }}>{t("hiw_s8_summary")}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[t("hiw_s8_b1"), t("hiw_s8_b2"), t("hiw_s8_b3"), t("hiw_s8_b4")].map((p, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-3 rounded-xl"
                      style={{
                        background: "rgba(184,147,106,0.06)",
                        border: "1px solid rgba(184,147,106,0.15)",
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#b8936a" }} />
                      <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-primary)" }}>{p}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm mt-4 italic" style={{ color: "var(--color-text-secondary)" }}>{t("hiw_s8_footer")}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Safety Critical — visually distinct section ── */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          background: "rgba(45,74,62,0.045)",
          borderTop: "1px solid rgba(45,74,62,0.1)",
          borderBottom: "1px solid rgba(45,74,62,0.1)",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 md:px-8 py-20">

          {/* Section label — same editorial style */}
          <motion.div
            className="mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-4 mb-3">
              <span
                className="text-xs font-bold uppercase whitespace-nowrap"
                style={{ color: "#2d4a3e", letterSpacing: "0.2em" }}
              >
                {t("hiw_s5_badge")}
              </span>
              <div className="flex-1 h-px" style={{ background: "var(--color-primary-200)" }} />
            </div>
            <p className="text-sm max-w-xl leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              {t("hiw_s5_summary")}
            </p>
          </motion.div>

          <div className="space-y-8">

            {/* 01 — Cancer Safety System */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-6 md:gap-8"
            >
              <div className="flex-shrink-0 pt-1">
                <span
                  className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold select-none"
                  style={{ color: "#b8936a", lineHeight: 1 }}
                >
                  01
                </span>
              </div>
              <div
                className="flex-1 rounded-2xl p-4 sm:p-6 md:p-8"
                style={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-primary-200)",
                  borderLeft: "4px solid #c44a4a",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                }}
              >
                <div className="flex items-start gap-3 mb-5">
                  <Shield
                    size={22}
                    style={{ color: "#c44a4a", flexShrink: 0, marginTop: 3 }}
                  />
                  <div>
                    <h3
                      className="text-xl md:text-2xl font-serif font-bold"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {t("hiw_s5_title")}
                    </h3>
                  </div>
                </div>

                {/* Safety claim callout — most prominent element */}
                <div
                  className="p-4 rounded-xl mb-5"
                  style={{
                    background: "rgba(196,74,74,0.06)",
                    border: "1px solid rgba(196,74,74,0.2)",
                  }}
                >
                  <p className="text-base font-bold mb-1.5" style={{ color: "#c44a4a" }}>
                    2.5× cancer weighting · Triple-layer detection
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                    {t("hiw_s5_b1")}
                  </p>
                </div>

                <div className="space-y-3">
                  {[t("hiw_s5_b2"), t("hiw_s5_b3"), t("hiw_s5_b4")].map((p, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: "#c44a4a" }}
                      />
                      <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-primary)" }}>{p}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* 02 — Clinical Questionnaire */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-6 md:gap-8"
            >
              <div className="flex-shrink-0 pt-1">
                <span
                  className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold select-none"
                  style={{ color: "#b8936a", lineHeight: 1 }}
                >
                  02
                </span>
              </div>
              <div
                className="flex-1 rounded-2xl p-4 sm:p-6 md:p-8"
                style={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-primary-200)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                }}
              >
                <h3
                  className="text-xl md:text-2xl font-serif font-bold mb-2"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {t("hiw_s6_title")}
                </h3>
                <p className="text-sm italic mb-5" style={{ color: "var(--color-text-secondary)" }}>
                  {t("hiw_s6_summary")}
                </p>
                <div className="space-y-3 mb-5">
                  {[t("hiw_s6_b1"), t("hiw_s6_b2"), t("hiw_s6_b3")].map((p, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: "#b8936a" }}
                      />
                      <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-primary)" }}>{p}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[t("hiw_s6_q1"), t("hiw_s6_q2"), t("hiw_s6_q3"), t("hiw_s6_q4"), t("hiw_s6_q5")].map((q, i) => (
                    <span
                      key={i}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full"
                      style={{ background: "var(--color-surface)", color: "var(--color-text-muted)" }}
                    >
                      {q}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Footer CTA ── */}
      <section
        className="py-24 text-white text-center"
        style={{ background: "rgba(184,147,106,0.95)", position: "relative", zIndex: 1 }}
      >
        <motion.div
          className="max-w-2xl mx-auto px-6"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-serif font-bold mb-4">{t("hiw_bottom_title")}</h2>
          <p className="text-lg mb-8" style={{ opacity: 0.9 }}>{t("hiw_bottom_subtitle")}</p>
          <Link
            href="/signup"
            className="inline-block font-semibold px-8 py-3.5 rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ background: "#7a5c35" }}
          >
            {t("hiw_cta_trial")}
          </Link>
          <p className="text-sm mt-3" style={{ opacity: 0.7 }}>No credit card required</p>
        </motion.div>
      </section>

      <div style={{ position: "relative", zIndex: 1 }}><Footer /></div>
      </div>
    </main>
    </MotionConfig>
  );
}
