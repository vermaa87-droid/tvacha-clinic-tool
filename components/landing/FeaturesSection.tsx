"use client";

import { motion } from "framer-motion";
import { Zap, FileText, Users, BarChart3, Activity, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

const ease: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

function CaseQueueMockup() {
  const cases = [
    { color: "#d97706", patient: "Meera R.", label: "Fungal · Moderate", time: "9:15 AM" },
    { color: "#2d4a3e", patient: "Vikram S.", label: "Bacterial · Mild", time: "9:42 AM" },
    { color: "#dc2626", patient: "Ananya P.", label: "Complex · Severe", time: "10:05 AM" },
  ];
  return (
    <div className="rounded-xl border border-primary-200 overflow-hidden">
      <div
        className="px-4 py-2.5 border-b border-primary-200 flex items-center justify-between"
        style={{ background: "#ede8e0" }}
      >
        <span className="text-xs font-semibold text-text-primary">Today&apos;s Queue</span>
        <span className="text-xs font-bold text-primary-500">16 patients</span>
      </div>
      <div className="p-3 space-y-1.5" style={{ background: "#f4f0ea" }}>
        {cases.map((c, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2 px-3 rounded-lg"
            style={{ background: "rgba(255,255,255,0.55)" }}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
              <div>
                <p className="text-xs font-medium text-text-primary leading-tight">{c.patient}</p>
                <p className="text-text-muted leading-tight" style={{ fontSize: "10px" }}>{c.label}</p>
              </div>
            </div>
            <span className="text-text-muted" style={{ fontSize: "10px" }}>{c.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrescriptionMockup() {
  return (
    <div className="rounded-lg border border-primary-200 overflow-hidden">
      <div
        className="px-3 py-2 border-b border-primary-200 flex items-center justify-between"
        style={{ background: "#ede8e0" }}
      >
        <span className="text-[10px] font-semibold text-text-primary">Rx — Tinea Versicolor</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-600 font-medium">
          Template
        </span>
      </div>
      <div className="p-3" style={{ background: "#f4f0ea" }}>
        <div className="space-y-1.5 mb-3">
          {["Tab. Fluconazole 150mg · 1×wk × 4wks", "Oint. Clotrimazole 1% · BD × 3wks"].map((drug, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-300 flex-shrink-0" />
              <span className="text-text-secondary" style={{ fontSize: "10px" }}>{drug}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <div
            className="px-2.5 py-1 rounded text-[10px] font-semibold text-white flex items-center gap-1"
            style={{ background: "#7a5c35" }}
          >
            Generate <ArrowRight size={9} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PatientListMockup() {
  const patients = [
    { initials: "SR", name: "Sunita R.", status: "Follow-up in 3 days", color: "#d97706" },
    { initials: "KM", name: "Karan M.", status: "Treatment complete", color: "#2d4a3e" },
    { initials: "NB", name: "Nisha B.", status: "Photo review due", color: "#b8936a" },
  ];
  return (
    <div className="rounded-lg border border-primary-200 overflow-hidden">
      <div
        className="px-3 py-2 border-b border-primary-200 flex items-center justify-between"
        style={{ background: "#ede8e0" }}
      >
        <span className="text-[10px] font-semibold text-text-primary">My Patients</span>
        <span className="text-[10px] text-primary-500 font-medium">24 total</span>
      </div>
      <div className="p-2.5 space-y-1.5" style={{ background: "#f4f0ea" }}>
        {patients.map((p, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 py-1.5 px-2 rounded-md"
            style={{ background: "rgba(255,255,255,0.55)" }}
          >
            <div
              className="w-6 h-6 rounded-full bg-primary-300 flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{ fontSize: "8px" }}
            >
              {p.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-text-primary leading-tight">{p.name}</p>
              <p className="text-[9px] leading-tight" style={{ color: p.color }}>{p.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsMockup() {
  const bars = [
    { label: "Aug", pct: 45 },
    { label: "Sep", pct: 65 },
    { label: "Oct", pct: 52 },
    { label: "Nov", pct: 82, highlight: true },
    { label: "Dec", pct: 70 },
  ];
  return (
    <div className="rounded-lg border border-primary-200 overflow-hidden">
      <div
        className="px-3 py-2 border-b border-primary-200 flex items-center justify-between"
        style={{ background: "#ede8e0" }}
      >
        <span className="text-[10px] font-semibold text-text-primary">Monthly Visits</span>
        <span className="text-[10px] text-primary-500 font-medium">2024–25</span>
      </div>
      <div className="p-3" style={{ background: "#f4f0ea" }}>
        <div className="flex items-end justify-between gap-1.5 h-12 mb-2">
          {bars.map((b, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className="w-full rounded-t-sm"
                style={{
                  height: `${b.pct}%`,
                  background: b.highlight ? "#b8936a" : "#d4b896",
                  minHeight: "4px",
                }}
              />
              <span className="text-text-muted" style={{ fontSize: "8px" }}>{b.label}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-primary-200 pt-2 space-y-1">
          <p className="text-text-muted" style={{ fontSize: "9px" }}>
            148 patients seen · 12 avg/week
          </p>
          <p className="text-text-muted" style={{ fontSize: "9px" }}>
            Top condition:{" "}
            <span className="text-text-secondary font-medium">Tinea Versicolor</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export function FeaturesSection() {
  const { t } = useLanguage();

  return (
    <section className="py-24" style={{ background: "transparent" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">

        {/* Section header — left-aligned, editorial */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p
            className="text-xs font-semibold uppercase mb-4"
            style={{ color: "#2d4a3e", letterSpacing: "0.18em" }}
          >
            The Platform
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-text-primary mb-4 max-w-2xl">
            {t("features_title")}
          </h2>
          <p className="text-lg text-text-secondary font-light max-w-xl">
            {t("features_subtitle")}
          </p>
        </motion.div>

        {/* Row 1: AI Case Sorting (2/3) + Prescription Templates (1/3) */}
        <div className="grid lg:grid-cols-3 gap-5 mb-5 items-start">

          {/* AI Case Sorting — wide card with internal side-by-side layout */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, ease }}
          >
            <div
              className="rounded-2xl border border-primary-200 p-7"
              style={{ background: "linear-gradient(135deg, #f9f6f0 0%, #f2ebe0 100%)" }}
            >
              <div className="flex items-center gap-3 mb-5">
                <Zap size={28} style={{ color: "#b8936a" }} />
                <h3 className="font-serif font-bold text-text-primary text-xl">
                  {t("feature_1_title")}
                </h3>
              </div>
              <div className="grid md:grid-cols-2 gap-6 items-start">
                <p className="text-text-secondary leading-relaxed">
                  {t("feature_1_desc")}
                </p>
                <div className="hidden md:block">
                  <CaseQueueMockup />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Prescription Templates */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.1, ease }}
          >
            <div
              className="rounded-2xl border border-primary-200 p-6"
              style={{ background: "#f9f6f0" }}
            >
              <FileText size={26} className="block mb-4" style={{ color: "#b8936a" }} />
              <h3 className="font-serif font-semibold text-text-primary mb-2">
                {t("feature_2_title")}
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed mb-4">
                {t("feature_2_desc")}
              </p>
              <PrescriptionMockup />
            </div>
          </motion.div>
        </div>

        {/* Row 2: Three equal cards */}
        <div className="grid lg:grid-cols-3 gap-5 items-start">

          {/* My Patients */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.05, ease }}
          >
            <div
              className="rounded-2xl border border-primary-200 p-6"
              style={{ background: "#f9f6f0" }}
            >
              <Users size={26} className="block mb-4" style={{ color: "#b8936a" }} />
              <h3 className="font-serif font-semibold text-text-primary mb-2">
                {t("feature_3_title")}
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed mb-4">
                {t("feature_3_desc")}
              </p>
              <PatientListMockup />
            </div>
          </motion.div>

          {/* Clinic Analytics */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.1, ease }}
          >
            <div
              className="rounded-2xl border border-primary-200 p-6"
              style={{ background: "#f9f6f0" }}
            >
              <BarChart3 size={26} className="block mb-4" style={{ color: "#b8936a" }} />
              <h3 className="font-serif font-semibold text-text-primary mb-2">
                {t("feature_5_title")}
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed mb-4">
                {t("feature_5_desc")}
              </p>
              <AnalyticsMockup />
            </div>
          </motion.div>

          {/* AI Case Queue */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.15, ease }}
          >
            <div
              className="rounded-2xl border p-6"
              style={{
                background: "linear-gradient(135deg, #f2ece3 0%, #ede4d4 100%)",
                borderColor: "rgba(184,147,106,0.35)",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <Activity size={26} style={{ color: "#b8936a" }} />
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-serif font-semibold text-text-primary">
                    {t("feature_4_title")}
                  </h3>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: "rgba(45,74,62,0.12)", color: "#2d4a3e", letterSpacing: "0.04em" }}
                  >
                    Phased Rollout
                  </span>
                </div>
              </div>
              <p className="text-text-secondary text-sm leading-relaxed mb-5">
                {t("feature_4_desc")}
              </p>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
