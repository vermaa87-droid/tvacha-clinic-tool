"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/layout/Logo";
import { Footer } from "@/components/layout/Footer";
import { NeuralNetworkBackground } from "@/components/NeuralNetworkBackground";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import {
  Layers,
  RotateCcw,
  Zap,
  BarChart3,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────── */
/*  Expandable wrapper – smooth height animation                            */
/* ────────────────────────────────────────────────────────────────────────── */

function Expandable({
  expanded,
  children,
  onCollapse,
}: {
  expanded: boolean;
  children: React.ReactNode;
  onCollapse: () => void;
}) {
  return (
    <AnimatePresence initial={false}>
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="overflow-hidden"
        >
          <div className="pt-6" style={{ borderTop: "1px solid #e8e0d0" }}>
            {children}
            <button
              onClick={onCollapse}
              className="mt-5 text-xs font-medium hover:underline"
              style={{ color: "#9a8a76" }}
            >
              Show less &uarr;
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Pattern A – "Hero Feature" card (full-width, big heading, mini visual)  */
/* ────────────────────────────────────────────────────────────────────────── */

function HeroCard({
  title,
  subtitle,
  paragraphs,
  Visual,
  borderAccent,
  delay,
}: {
  title: string;
  subtitle: string;
  paragraphs: string[];
  Visual: React.ReactNode;
  borderAccent?: string;
  delay?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: delay || 0, ease: "easeOut" }}
      className="rounded-xl overflow-hidden transition-shadow duration-300"
      style={{
        background: expanded ? "#fff" : "rgba(255,255,255,0.85)",
        border: "1px solid #e8e0d0",
        borderLeft: borderAccent ? `4px solid ${borderAccent}` : "1px solid #e8e0d0",
        boxShadow: expanded ? "0 8px 32px rgba(0,0,0,0.06)" : "0 2px 8px rgba(0,0,0,0.03)",
      }}
    >
      <button className="w-full text-left p-6 md:p-8" onClick={() => setExpanded(!expanded)}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-2xl md:text-3xl font-serif font-bold mb-2" style={{ color: "#1a1612" }}>
              {title}
            </h3>
            <p className="text-sm italic leading-relaxed" style={{ color: "#9a8a76" }}>
              {subtitle}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block flex-shrink-0">{Visual}</div>
            <ChevronDown
              size={20}
              className="flex-shrink-0 transition-transform duration-300"
              style={{ color: "#9a8a76", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
            />
          </div>
        </div>
      </button>

      <div className="px-6 md:px-8 pb-6 md:pb-8">
        <Expandable expanded={expanded} onCollapse={() => setExpanded(false)}>
          <div className="space-y-4 max-w-2xl">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed" style={{ color: "#1a1612" }}>{p}</p>
            ))}
          </div>
          <div className="md:hidden mt-4">{Visual}</div>
        </Expandable>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Pattern B – Side-by-side compact cards                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function CompactCard({
  Icon,
  title,
  subtitle,
  paragraphs,
  delay,
}: {
  Icon: React.ElementType;
  title: string;
  subtitle: string;
  paragraphs: string[];
  delay?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: delay || 0, ease: "easeOut" }}
      className="rounded-xl overflow-hidden transition-shadow duration-300"
      style={{
        background: expanded ? "#fff" : "rgba(255,255,255,0.7)",
        border: "1px solid #e8e0d0",
        boxShadow: expanded ? "0 8px 24px rgba(0,0,0,0.06)" : "0 1px 4px rgba(0,0,0,0.02)",
      }}
    >
      <button className="w-full text-left p-5 md:p-6" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <Icon size={18} style={{ color: "#b8936a" }} className="flex-shrink-0" />
              <h3 className="text-lg font-serif font-bold" style={{ color: "#1a1612" }}>{title}</h3>
            </div>
            <p className="text-sm" style={{ color: "#9a8a76" }}>{subtitle}</p>
          </div>
          <ChevronDown
            size={18}
            className="flex-shrink-0 mt-1 transition-transform duration-300"
            style={{ color: "#9a8a76", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
          />
        </div>
      </button>

      <div className="px-5 md:px-6 pb-5 md:pb-6">
        <Expandable expanded={expanded} onCollapse={() => setExpanded(false)}>
          <div className="space-y-3">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed" style={{ color: "#1a1612" }}>{p}</p>
            ))}
          </div>
        </Expandable>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Pattern C – Timeline / numbered step                                    */
/* ────────────────────────────────────────────────────────────────────────── */

function TimelineCard({
  num,
  title,
  subtitle,
  paragraphs,
  isLast,
  tinted,
  borderAccent,
  Visual,
  delay,
}: {
  num: string;
  title: string;
  subtitle: string;
  paragraphs: string[];
  isLast?: boolean;
  tinted?: boolean;
  borderAccent?: string;
  Visual?: React.ReactNode;
  delay?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: delay || 0, ease: "easeOut" }}
      className="flex gap-5 md:gap-8"
    >
      {/* Number + line */}
      <div className="flex flex-col items-center flex-shrink-0">
        <span className="text-4xl md:text-5xl font-serif font-bold select-none" style={{ color: "#e0d5c4" }}>
          {num}
        </span>
        {!isLast && <div className="flex-1 w-px mt-2" style={{ background: "#e0d5c4" }} />}
      </div>

      {/* Content */}
      <div
        className="flex-1 rounded-xl overflow-hidden mb-6 transition-shadow duration-300"
        style={{
          background: tinted ? "#fef5f5" : expanded ? "#fff" : "rgba(255,255,255,0.7)",
          border: "1px solid #e8e0d0",
          borderLeft: borderAccent ? `4px solid ${borderAccent}` : "1px solid #e8e0d0",
          boxShadow: expanded ? "0 8px 24px rgba(0,0,0,0.06)" : "0 1px 4px rgba(0,0,0,0.02)",
        }}
      >
        <button className="w-full text-left p-5 md:p-6" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-serif font-bold mb-1" style={{ color: "#1a1612" }}>{title}</h3>
              <p className="text-sm italic" style={{ color: "#9a8a76" }}>{subtitle}</p>
            </div>
            <ChevronDown
              size={18}
              className="flex-shrink-0 mt-1 transition-transform duration-300"
              style={{ color: "#9a8a76", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
            />
          </div>
        </button>

        <div className="px-5 md:px-6 pb-5 md:pb-6">
          <Expandable expanded={expanded} onCollapse={() => setExpanded(false)}>
            <div className="space-y-3">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed" style={{ color: "#1a1612" }}>{p}</p>
              ))}
            </div>
            {Visual && <div className="mt-4">{Visual}</div>}
          </Expandable>
        </div>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Section group heading                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

function GroupHeading({ label, desc }: { label: string; desc: string }) {
  return (
    <motion.div
      className="mb-8 mt-16 first:mt-0"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: "#b8936a" }}>
        {label}
      </p>
      <p className="text-sm max-w-xl" style={{ color: "#9a8a76" }}>{desc}</p>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Mini visuals (styled-div illustrations for Hero cards)                  */
/* ────────────────────────────────────────────────────────────────────────── */

function NeuralNetVisual() {
  return (
    <div className="flex items-center gap-1.5">
      {["Input", "Hidden", "Output"].map((label, i) => (
        <div key={label} className="flex items-center gap-1.5">
          <div
            className="px-2.5 py-1.5 rounded text-xs font-semibold"
            style={{ background: "#fdf0e0", color: "#b8936a", border: "1px solid #e8d5bc" }}
          >
            {label}
          </div>
          {i < 2 && (
            <svg width="20" height="12" viewBox="0 0 20 12">
              <line x1="0" y1="3" x2="14" y2="3" stroke="#e8d5bc" strokeWidth="1.5" />
              <line x1="0" y1="9" x2="14" y2="9" stroke="#e8d5bc" strokeWidth="1.5" />
              <line x1="0" y1="6" x2="18" y2="6" stroke="#b8936a" strokeWidth="1.5" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

function ShieldVisual() {
  return (
    <div className="flex items-center justify-center" style={{ width: 56, height: 56 }}>
      <svg viewBox="0 0 48 48" width="48" height="48" fill="none">
        <path d="M24 4 L42 12 L42 24 C42 36 24 44 24 44 C24 44 6 36 6 24 L6 12 Z" fill="#fef5f5" stroke="#e8a0a0" strokeWidth="2" />
        <text x="24" y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill="#c44a4a">×2.5</text>
      </svg>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Page                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

export default function HowItWorksPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <main className="min-h-screen" style={{ background: "#f2efe9" }}>
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
              style={{ background: "#f5f2ed" }}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
            >
              <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid #e8e0d0" }}>
                <span className="font-serif font-semibold" style={{ color: "#1a1612" }}>Menu</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2" style={{ color: "#9a8a76" }}>
                  <X size={22} />
                </button>
              </div>
              <nav className="flex flex-col gap-1 px-4 py-6">
                {[
                  { label: t("nav_how_ai_works"), href: "/how-it-works" },
                  { label: t("nav_pricing"), href: "/pricing" },
                  { label: t("nav_signin"), href: "/login" },
                ].map(({ label, href }) => (
                  <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg font-medium" style={{ color: "#9a8a76" }}>
                    {label}
                  </Link>
                ))}
                <div className="mt-4 px-4">
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="block w-full text-center text-sm font-semibold px-4 py-3 rounded-lg text-white" style={{ background: "#b8936a" }}>
                    {t("nav_getstarted")}
                  </Link>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Navbar */}
      <nav className="sticky top-0 z-40" style={{ background: "rgba(250,248,244,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e8e0d0" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-4 flex items-center justify-between">
          <Link href="/"><Logo /></Link>
          <div className="flex items-center gap-4 md:gap-6">
            <Link href="/pricing" className="font-medium text-sm hidden md:block" style={{ color: "#9a8a76" }}>{t("nav_pricing")}</Link>
            <Link href="/login" className="font-medium text-sm hidden md:block" style={{ color: "#9a8a76" }}>{t("nav_signin")}</Link>
            <Link href="/signup" className="text-sm font-semibold px-4 py-2 rounded-lg text-white hidden md:block" style={{ background: "#b8936a" }}>{t("nav_getstarted")}</Link>
            <LanguageToggle />
            <button className="md:hidden p-2" style={{ color: "#9a8a76" }} onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero with neural net background (hero-only, not full page) */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        <NeuralNetworkBackground />
        <div style={{ position: "relative", zIndex: 1 }}>
          <section className="py-20 md:py-28" style={{ background: "linear-gradient(to bottom, rgba(237,233,225,0.65), rgba(242,239,233,0.25))" }}>
            <div className="max-w-3xl mx-auto px-6 md:px-8 text-center">
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-serif font-bold mb-5 leading-tight" style={{ color: "#1a1612" }}>
                  {t("hiw_title")}
                </h1>
                <p className="text-lg font-light leading-relaxed max-w-2xl mx-auto" style={{ color: "#9a8a76" }}>
                  {t("hiw_subtitle")}
                </p>
              </motion.div>

              <motion.div className="flex flex-wrap justify-center gap-3 mt-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
                {[
                  { value: "50M", label: t("hiw_stat_params") },
                  { value: "5 Cr+", label: t("hiw_stat_images") },
                  { value: "7×", label: t("hiw_stat_passes") },
                  { value: "2.5×", label: t("hiw_stat_cancer") },
                ].map(({ value, label }) => (
                  <div key={label} className="rounded-lg px-5 py-3 text-center" style={{ background: "rgba(255,255,255,0.85)", border: "1px solid #e8e0d0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                    <p className="text-2xl font-bold" style={{ color: "#b8936a" }}>{value}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#9a8a76" }}>{label}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </section>
        </div>
      </div>

      {/* Content sections – no background animation below hero */}
      <div className="max-w-4xl mx-auto px-6 md:px-8 pb-20">

        {/* ── Group 1: The AI Engine ── */}
        <GroupHeading
          label={t("hiw_s1_badge")}
          desc={t("hiw_s1_summary")}
        />

        <div className="space-y-5">
          <HeroCard
            title={t("hiw_s1_title")}
            subtitle={t("hiw_s1_b1")}
            paragraphs={[t("hiw_s1_b2"), t("hiw_s1_b3")]}
            Visual={<NeuralNetVisual />}
            borderAccent="#b8936a"
            delay={0.1}
          />
          <HeroCard
            title={t("hiw_s2_title")}
            subtitle={t("hiw_s2_summary")}
            paragraphs={[t("hiw_s2_b1"), t("hiw_s2_b2"), t("hiw_s2_b3"), t("hiw_s2_b4")]}
            Visual={
              <div className="flex gap-1">
                {["#f5d5b8", "#c68642", "#a0522d", "#6b3a2a", "#3b1f15"].map((hex) => (
                  <div key={hex} className="w-4 h-4 rounded-full" style={{ background: hex }} />
                ))}
              </div>
            }
            borderAccent="#b8936a"
            delay={0.15}
          />
        </div>

        {/* ── Group 2: How We Train It ── */}
        <GroupHeading
          label={t("hiw_s7_badge")}
          desc={t("hiw_s3_summary")}
        />

        <div className="grid md:grid-cols-2 gap-5">
          <CompactCard
            Icon={Layers}
            title={t("hiw_s3_title")}
            subtitle={t("hiw_s3_summary")}
            paragraphs={[t("hiw_s3_b1"), t("hiw_s3_b2")]}
            delay={0.1}
          />
          <CompactCard
            Icon={RotateCcw}
            title={t("hiw_s4_title")}
            subtitle={t("hiw_s4_summary")}
            paragraphs={[t("hiw_s4_b1"), t("hiw_s4_b2"), t("hiw_s4_b3")]}
            delay={0.15}
          />
          <CompactCard
            Icon={Zap}
            title={t("hiw_s7_title")}
            subtitle={t("hiw_s7_summary")}
            paragraphs={[t("hiw_s7_b1"), t("hiw_s7_b2"), t("hiw_s7_b3"), t("hiw_s7_b4")]}
            delay={0.2}
          />
          <CompactCard
            Icon={BarChart3}
            title={t("hiw_s8_title")}
            subtitle={t("hiw_s8_summary")}
            paragraphs={[t("hiw_s8_b1"), t("hiw_s8_b2"), t("hiw_s8_b3"), t("hiw_s8_b4"), t("hiw_s8_footer")]}
            delay={0.25}
          />
        </div>

        {/* ── Group 3: Safety & Accuracy ── */}
        <GroupHeading
          label={t("hiw_s5_badge")}
          desc={t("hiw_s5_summary")}
        />

        <div>
          <TimelineCard
            num="01"
            title={t("hiw_s5_title")}
            subtitle={t("hiw_s5_summary")}
            paragraphs={[t("hiw_s5_b1"), t("hiw_s5_b2"), t("hiw_s5_b3"), t("hiw_s5_b4")]}
            tinted
            borderAccent="#c44a4a"
            Visual={<ShieldVisual />}
            delay={0.1}
          />
          <TimelineCard
            num="02"
            title={t("hiw_s6_title")}
            subtitle={t("hiw_s6_summary")}
            paragraphs={[t("hiw_s6_b1"), t("hiw_s6_b2"), t("hiw_s6_b3")]}
            Visual={
              <div className="flex gap-2 flex-wrap">
                {[t("hiw_s6_q1"), t("hiw_s6_q2"), t("hiw_s6_q3"), t("hiw_s6_q4"), t("hiw_s6_q5")].map((q, i) => (
                  <span key={i} className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: "#f0ebe3", color: "#9a8a76" }}>
                    {q}
                  </span>
                ))}
              </div>
            }
            isLast
            delay={0.15}
          />
        </div>
      </div>

      {/* CTA */}
      <section className="py-20 text-white text-center" style={{ background: "rgba(184,147,106,0.95)" }}>
        <motion.div className="max-w-2xl mx-auto px-6" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <h2 className="text-3xl font-serif font-bold mb-4">{t("hiw_bottom_title")}</h2>
          <p className="text-lg mb-8" style={{ opacity: 0.9 }}>{t("hiw_bottom_subtitle")}</p>
          <Link href="/signup" className="inline-block font-semibold px-8 py-3 rounded-lg transition-colors" style={{ background: "#fff", color: "#b8936a" }}>
            {t("hiw_cta_trial")}
          </Link>
        </motion.div>
      </section>

      <Footer />
    </main>
  );
}
