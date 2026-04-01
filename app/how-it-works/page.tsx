"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/layout/Logo";
import { Footer } from "@/components/layout/Footer";
import { NeuralNetworkBackground } from "@/components/NeuralNetworkBackground";
import Link from "next/link";
import {
  Brain,
  Camera,
  Layers,
  RotateCcw,
  ShieldAlert,
  ClipboardList,
  Zap,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Check,
  Menu,
  X,
} from "lucide-react";

type SectionData = {
  icon: React.ElementType;
  title: string;
  badge: string;
  summary: string;
  bullets: string[];
  accentColor: string;   // hex for inline styles
  bgColor: string;       // hex
  borderColor: string;   // hex
  Visual: () => React.ReactElement;
};

const sections: SectionData[] = [
  {
    icon: Brain,
    title: "Advanced Deep Learning Model",
    badge: "Architecture",
    summary: "50M parameter ConvNeXt trained on hundreds of thousands of skin images",
    accentColor: "#b8936a",
    bgColor: "#fdf8f3",
    borderColor: "#e8d5bc",
    bullets: [
      "50M parameter ConvNeXt architecture — one of the most advanced image classification networks available",
      "Transfer learning from ImageNet-22k for robust feature recognition out of the box",
      "Mixed precision training with gradient accumulation for optimal model convergence",
    ],
    Visual: () => (
      <div className="grid grid-cols-3 gap-3 mt-4">
        {["ImageNet-22k\nPre-training", "Skin Dataset\nFine-tuning", "Clinical\nValidation"].map((label, i) => (
          <div key={i} style={{ background: "#fff", borderColor: "#e8d5bc" }} className="border rounded-lg p-3 text-center">
            <div style={{ background: "#fdf0e0", color: "#b8936a" }} className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center font-bold text-sm">{i + 1}</div>
            <p className="text-xs font-medium whitespace-pre-line leading-relaxed" style={{ color: "#9a8a76" }}>{label}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Camera,
    title: "Smart Image Processing",
    badge: "Pre-processing",
    summary: "Auto skin detection, quality checks, and clinical-grade normalization",
    accentColor: "#4a90c4",
    bgColor: "#f3f8fd",
    borderColor: "#bcd5ea",
    bullets: [
      "Auto Skin Detection — finds and isolates the skin region using multiple color spaces, works on all skin tones (Fitzpatrick I–VI)",
      "Quality Check — automatically detects blurry, too dark, or overexposed photos and asks for a retake",
      "Clinical-Grade Normalization — bridges the gap between phone photos and clinical images using adaptive contrast enhancement",
      "Background Removal — crops out irrelevant background so the AI focuses only on your skin",
    ],
    Visual: () => (
      <div className="mt-4 flex gap-2 flex-wrap">
        {[
          { label: "Fitzpatrick I", hex: "#f5d5b8" },
          { label: "Fitzpatrick II", hex: "#e8b99a" },
          { label: "Fitzpatrick III", hex: "#c68642" },
          { label: "Fitzpatrick IV", hex: "#a0522d" },
          { label: "Fitzpatrick V", hex: "#6b3a2a" },
          { label: "Fitzpatrick VI", hex: "#3b1f15" },
        ].map(({ label, hex }) => (
          <div key={label} style={{ background: "#fff", borderColor: "#bcd5ea" }} className="flex items-center gap-1.5 border rounded-full px-3 py-1">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: hex }} />
            <span className="text-xs" style={{ color: "#9a8a76" }}>{label}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Layers,
    title: "17 Data Augmentation Strategies",
    badge: "Training Robustness",
    summary: "Trained on real-world phone photo conditions for reliable results",
    accentColor: "#7c5cbf",
    bgColor: "#f8f5fd",
    borderColor: "#d4c4ef",
    bullets: [
      "Real-world phone photo conditions: compression artifacts, low resolution, partial occlusion, varying lighting and angles",
      "Advanced blending techniques (MixUp & CutMix) create smoother, more generalizable decision boundaries",
    ],
    Visual: () => (
      <div className="mt-4 grid grid-cols-2 gap-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        {["Rotation", "Zoom", "Brightness", "Contrast", "Blur", "Crop", "MixUp", "CutMix"].map((aug) => (
          <div key={aug} style={{ background: "#fff", borderColor: "#d4c4ef", color: "#9a8a76" }} className="border rounded-lg p-2 text-center text-xs font-medium">
            {aug}
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: RotateCcw,
    title: "7-Pass Analysis Per Photo",
    badge: "Precision",
    summary: "Every photo analyzed 7 times with different orientations and adjustments",
    accentColor: "#4a9a6a",
    bgColor: "#f3fdf7",
    borderColor: "#b4dfc7",
    bullets: [
      "Every photo is analyzed 7 times with different orientations, zoom levels, and lighting adjustments",
      "Results are combined at the mathematical level for higher precision than a single pass",
      "Multi-Photo Mode — upload 3 photos from different angles for even greater accuracy",
    ],
    Visual: () => (
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div style={{ background: "#e0f5eb", borderColor: "#b4dfc7", color: "#4a9a6a" }} className="w-10 h-10 rounded-lg border flex items-center justify-center font-bold text-sm">
              {i + 1}
            </div>
            <span className="text-xs" style={{ color: "#9a8a76" }}>Pass</span>
          </div>
        ))}
        <span className="ml-1 text-sm font-semibold" style={{ color: "#4a9a6a" }}>→ Combined result</span>
      </div>
    ),
  },
  {
    icon: ShieldAlert,
    title: "Cancer Safety System",
    badge: "Safety Critical",
    summary: "2.5× cancer weighting with triple-layer detection — designed to never miss cancer",
    accentColor: "#c44a4a",
    bgColor: "#fdf3f3",
    borderColor: "#eab4b4",
    bullets: [
      "Cancer classes are weighted 2.5× during training — the AI is trained to never miss cancer",
      "Triple-layer cancer detection: individual class check, grouped probability check, and uncertainty flagging",
      "If combined cancer probability exceeds 15%, you're alerted even if the top result is benign",
      "Low-confidence results return \"Uncertain — See a Doctor\" rather than a wrong answer",
    ],
    Visual: () => (
      <div className="mt-4 space-y-2">
        {[
          { label: "Layer 1: Individual class check", pct: 85 },
          { label: "Layer 2: Grouped probability check", pct: 92 },
          { label: "Layer 3: Uncertainty flagging", pct: 100 },
        ].map(({ label, pct }) => (
          <div key={label}>
            <div className="flex justify-between text-xs mb-1" style={{ color: "#9a8a76" }}>
              <span>{label}</span>
              <span className="font-semibold" style={{ color: "#c44a4a" }}>{pct}% coverage</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "#f5d5d5" }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#c44a4a" }} />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: ClipboardList,
    title: "Clinical Questionnaire",
    badge: "Optional",
    summary: "5 quick questions that adjust AI predictions using Bayesian statistics",
    accentColor: "#3a9a8a",
    bgColor: "#f3fdfb",
    borderColor: "#b4dfd8",
    bullets: [
      "5 quick questions: skin type, age, body location, duration, and symptoms",
      "Adjusts AI predictions using Bayesian statistics based on real clinical data",
      "Example: a changing or growing lesion on sun-exposed skin in a fair-skinned adult increases melanoma weighting",
    ],
    Visual: () => (
      <div className="mt-4 flex gap-3 flex-wrap">
        {["Skin Type", "Age", "Body Location", "Duration", "Symptoms"].map((q, i) => (
          <div key={i} style={{ background: "#fff", borderColor: "#b4dfd8" }} className="flex items-center gap-2 border rounded-lg px-3 py-2">
            <span style={{ background: "#d5f0ec", color: "#3a9a8a" }} className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
            <span className="text-sm font-medium" style={{ color: "#1a1612" }}>{q}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Zap,
    title: "Smart Training Pipeline",
    badge: "Training",
    summary: "Focal Loss, balanced sampling, EMA, and early stopping for a robust model",
    accentColor: "#c47a3a",
    bgColor: "#fdf8f0",
    borderColor: "#e8ceaa",
    bullets: [
      "Focal Loss focuses the AI on the hardest-to-distinguish conditions",
      "Balanced class sampling ensures rare conditions are learned equally well",
      "Exponential Moving Average smooths model weights for better generalization",
      "Early stopping prevents overfitting — the AI knows when to stop learning",
    ],
    Visual: () => (
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          { name: "Focal Loss", desc: "Focuses on hard cases" },
          { name: "Balanced Sampling", desc: "Rare conditions covered" },
          { name: "EMA Weights", desc: "Smooth generalization" },
          { name: "Early Stopping", desc: "Prevents overfitting" },
        ].map(({ name, desc }) => (
          <div key={name} style={{ background: "#fff", borderColor: "#e8ceaa" }} className="border rounded-lg p-3">
            <p className="text-sm font-semibold" style={{ color: "#1a1612" }}>{name}</p>
            <p className="text-xs mt-0.5" style={{ color: "#9a8a76" }}>{desc}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: BarChart3,
    title: "Evaluation & Transparency",
    badge: "Accountability",
    summary: "Per-condition precision, recall, and F1 scores — no black box",
    accentColor: "#5a6abf",
    bgColor: "#f5f5fd",
    borderColor: "#c4c8ef",
    bullets: [
      "Evaluated using balanced accuracy across all 13 conditions",
      "Per-condition precision, recall, and F1 scores tracked independently",
      "Dedicated cancer detection rate monitoring",
      "Confidence scores shown for every prediction — no black box",
    ],
    Visual: () => (
      <div className="mt-4">
        <div className="flex gap-3 flex-wrap">
          {["Precision", "Recall", "F1 Score", "Confidence"].map((metric) => (
            <div key={metric} style={{ background: "#e8eaf5", color: "#5a6abf", borderColor: "#c4c8ef" }} className="border px-3 py-1.5 rounded-full text-sm font-semibold">
              {metric}
            </div>
          ))}
        </div>
        <p className="text-xs mt-3" style={{ color: "#9a8a76" }}>Every prediction includes a confidence score so doctors always know how certain the AI is.</p>
      </div>
    ),
  },
];

function SectionCard({ section, index }: { section: SectionData; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = section.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: "easeOut" }}
      style={{ background: section.bgColor, borderColor: section.borderColor }}
      className="border rounded-xl overflow-hidden"
    >
      <button className="w-full text-left p-4 md:p-6" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "#fff", border: `1.5px solid ${section.borderColor}` }}
            >
              <Icon size={22} style={{ color: section.accentColor }} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="text-lg font-serif font-bold" style={{ color: "#1a1612" }}>{section.title}</h3>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: `${section.accentColor}20`, color: section.accentColor }}
                >
                  {section.badge}
                </span>
              </div>
              <p className="text-sm" style={{ color: "#9a8a76" }}>{section.summary}</p>
            </div>
          </div>
          <div className="flex-shrink-0 mt-1" style={{ color: "#9a8a76" }}>
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="px-4 md:px-6 pb-4 md:pb-6"
        >
          <div className="space-y-2 pt-4" style={{ borderTop: `1px solid ${section.borderColor}` }}>
            {section.bullets.map((bullet, i) => (
              <div key={i} className="flex items-start gap-3">
                <Check size={16} className="flex-shrink-0 mt-0.5" style={{ color: section.accentColor }} />
                <p className="text-sm leading-relaxed" style={{ color: "#1a1612" }}>{bullet}</p>
              </div>
            ))}
          </div>
          <section.Visual />
        </motion.div>
      )}
    </motion.div>
  );
}

export default function HowItWorksPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
                  { label: "How Our AI Works", href: "/how-it-works" },
                  { label: "Pricing", href: "/pricing" },
                  { label: "Sign In", href: "/login" },
                ].map(({ label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-lg font-medium transition-colors"
                    style={{ color: "#9a8a76" }}
                  >
                    {label}
                  </Link>
                ))}
                <div className="mt-4 px-4">
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center text-sm font-semibold px-4 py-3 rounded-lg text-white transition-colors"
                    style={{ background: "#b8936a" }}
                  >
                    Get Started
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
            <Link href="/pricing" className="font-medium transition-colors text-sm hidden md:block" style={{ color: "#9a8a76" }}>
              Pricing
            </Link>
            <Link href="/login" className="font-medium transition-colors text-sm hidden md:block" style={{ color: "#9a8a76" }}>
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors text-white hidden md:block"
              style={{ background: "#b8936a" }}
            >
              Get Started
            </Link>
            <button
              className="md:hidden p-2"
              style={{ color: "#9a8a76" }}
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* Full-page Neural Network Background wrapper */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        <NeuralNetworkBackground />
        <div style={{ position: "relative", zIndex: 1 }}>

          {/* Hero */}
          <section className="py-20" style={{ background: "linear-gradient(to bottom, rgba(237,233,225,0.7), rgba(242,239,233,0.3))" }}>
            <div className="max-w-3xl mx-auto px-6 md:px-8 text-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <div
                  className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-1.5 rounded-full mb-6"
                  style={{ background: "#e8d5bc", color: "#b8936a" }}
                >
                  <Brain size={14} /> Clinical-Grade AI
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-bold mb-5 leading-tight" style={{ color: "#1a1612" }}>
                  How Our AI Works
                </h1>
                <p className="text-lg font-light leading-relaxed max-w-2xl mx-auto" style={{ color: "#9a8a76" }}>
                  A transparent look at the deep learning architecture, safety systems, and clinical reasoning behind Tvacha&apos;s skin AI — built specifically for Indian dermatology.
                </p>
              </motion.div>

              {/* Stat pills */}
              <motion.div
                className="flex flex-wrap justify-center gap-3 mt-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                {[
                  { value: "50M", label: "Parameters" },
                  { value: "5 Cr+", label: "Training Images" },
                  { value: "7×", label: "Per-Photo Passes" },
                  { value: "2.5×", label: "Cancer Safety Weight" },
                ].map(({ value, label }) => (
                  <div
                    key={label}
                    className="rounded-lg px-5 py-3 text-center"
                    style={{ background: "rgba(255,255,255,0.85)", border: "1px solid #e8e0d0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", backdropFilter: "blur(4px)" }}
                  >
                    <p className="text-2xl font-bold" style={{ color: "#b8936a" }}>{value}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#9a8a76" }}>{label}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* Pipeline flow */}
          <section className="py-10">
            <div className="max-w-4xl mx-auto px-6 md:px-8">
              <motion.div
                className="flex flex-wrap items-center justify-center gap-2"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                {["Photo Upload", "Quality Check", "Skin Detection", "7-Pass Analysis", "Questionnaire", "Prediction + Confidence"].map((step, i, arr) => (
                  <div key={step} className="flex items-center gap-2">
                    <div
                      className="rounded-lg px-4 py-2 text-sm font-medium text-center whitespace-nowrap"
                      style={{ background: "rgba(255,255,255,0.85)", border: "1px solid #e8e0d0", color: "#1a1612", boxShadow: "0 2px 6px rgba(0,0,0,0.04)", backdropFilter: "blur(4px)" }}
                    >
                      {step}
                    </div>
                    {i < arr.length - 1 && (
                      <span className="font-bold text-lg hidden md:block" style={{ color: "#b8936a" }}>→</span>
                    )}
                  </div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* Sections */}
          <section className="py-16">
            <div className="max-w-3xl mx-auto px-6 md:px-8">
              <motion.p
                className="text-center text-sm mb-8"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                style={{ color: "#9a8a76" }}
              >
                Click any section to expand the details.
              </motion.p>
              <div className="space-y-4">
                {sections.map((section, i) => (
                  <SectionCard key={section.title} section={section} index={i} />
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-20 text-white text-center" style={{ background: "rgba(184,147,106,0.95)" }}>
            <motion.div
              className="max-w-2xl mx-auto px-6"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-serif font-bold mb-4">Ready to try it yourself?</h2>
              <p className="text-lg mb-8" style={{ opacity: 0.9 }}>Start a 2-week free trial — no credit card required.</p>
              <Link
                href="/signup"
                className="inline-block font-semibold px-8 py-3 rounded-lg transition-colors"
                style={{ background: "#fff", color: "#b8936a" }}
              >
                Start Free Trial
              </Link>
            </motion.div>
          </section>

          <Footer />
        </div>
      </div>
    </main>
  );
}
