"use client";

import { motion } from "framer-motion";
import { Zap, Monitor, Lock, Package, Download } from "lucide-react";

const DOWNLOAD_URL =
  "https://github.com/vermaa87-droid/tvacha-clinic-desktop/releases/download/v1.0.0/TvachaClinic-Setup.exe";

const features = [
  {
    icon: Zap,
    title: "Instant Launch",
    desc: "Open your clinic dashboard directly from your desktop. No browser tabs.",
  },
  {
    icon: Monitor,
    title: "Full-Screen Focus",
    desc: "A dedicated workspace without browser distractions.",
  },
  {
    icon: Lock,
    title: "Same Secure Platform",
    desc: "Your data stays on our encrypted servers. The desktop app is a secure window to your existing account.",
  },
  {
    icon: Package,
    title: "Lightweight Install",
    desc: "Under 10MB. Uses your system's built-in WebView — no heavy browser bundled.",
  },
];

export function DownloadSection() {
  return (
    <section
      id="download"
      className="py-20 md:py-24 relative overflow-hidden"
      style={{ background: "transparent" }}
    >
      {/* Subtle golden glow backdrop */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 70% 50%, rgba(184,147,106,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Left column — text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <p
              className="text-xs font-medium uppercase mb-4"
              style={{
                color: "#b8936a",
                letterSpacing: "0.2em",
                fontFamily: "var(--font-outfit, 'Outfit'), sans-serif",
              }}
            >
              Desktop App
            </p>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-semibold text-text-primary mb-5 leading-tight">
              Your Clinic, On Your Desktop
            </h2>

            <p className="text-lg text-text-secondary font-light mb-8 leading-relaxed max-w-xl">
              Get the full Tvacha Clinic experience as a native Windows
              application. Fast, focused, and always one click away.
            </p>

            <div className="space-y-5 mb-10">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={f.title}
                    className="flex items-start gap-4"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                  >
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        background: "rgba(184,147,106,0.12)",
                        border: "1px solid rgba(184,147,106,0.25)",
                      }}
                    >
                      <Icon size={18} style={{ color: "#b8936a" }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-text-primary">
                        <span className="font-semibold">{f.title}</span>
                        <span className="text-text-secondary font-light"> — {f.desc}</span>
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <motion.a
                href={DOWNLOAD_URL}
                download
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-3 px-8 py-3 rounded-xl font-semibold text-white transition-colors"
                style={{ background: "#b8936a" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#a37d58")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#b8936a")}
              >
                <Download size={20} />
                Download for Windows
              </motion.a>

              <p className="mt-4 text-sm text-text-secondary font-light">
                v1.0.0 · Windows 10/11 · ~2.5 MB
              </p>

              <p className="mt-2 text-sm md:hidden" style={{ color: "#8a7968" }}>
                Available for Windows desktop computers
              </p>

              <a
                href="https://www.tvacha-clinic.com"
                className="inline-block mt-3 text-sm font-light transition-colors"
                style={{ color: "#8a7968" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#b8936a")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#8a7968")}
              >
                Or continue using the web app →
              </a>
            </motion.div>
          </motion.div>

          {/* Right column — desktop app mockup */}
          <motion.div
            className="relative order-first md:order-last"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            {/* Golden glow behind mockup */}
            <div
              className="absolute -inset-8 pointer-events-none hidden md:block"
              style={{
                background:
                  "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(184,147,106,0.18) 0%, transparent 70%)",
                filter: "blur(40px)",
              }}
            />

            <div
              className="relative rounded-xl overflow-hidden md:rotate-1"
              style={{
                background: "#faf8f4",
                border: "1px solid rgba(184,147,106,0.25)",
                boxShadow:
                  "0 25px 50px -12px rgba(26,22,18,0.25), 0 8px 20px -6px rgba(184,147,106,0.15)",
              }}
            >
              {/* Title bar */}
              <div
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  background: "#2d4a3e",
                  borderBottom: "1px solid rgba(184,147,106,0.2)",
                }}
              >
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
                </div>
                <p
                  className="text-xs font-medium flex-1 text-center"
                  style={{ color: "#faf8f4", letterSpacing: "0.05em" }}
                >
                  Tvacha Clinic
                </p>
                <div className="w-12" />
              </div>

              {/* Mock dashboard content */}
              <div className="p-4 md:p-6 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="font-serif font-semibold text-lg"
                      style={{ color: "#2d4a3e" }}
                    >
                      Good morning, Dr. Sharma
                    </p>
                    <p className="text-xs" style={{ color: "#8a7968" }}>
                      You have 4 cases awaiting review
                    </p>
                  </div>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{
                      background: "rgba(184,147,106,0.15)",
                      color: "#b8936a",
                      border: "1px solid rgba(184,147,106,0.3)",
                    }}
                  >
                    DS
                  </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Today", value: "12" },
                    { label: "Queue", value: "4" },
                    { label: "Pending", value: "7" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg p-2.5"
                      style={{
                        background: "rgba(184,147,106,0.08)",
                        border: "1px solid rgba(184,147,106,0.15)",
                      }}
                    >
                      <p className="text-xl font-serif font-bold" style={{ color: "#b8936a" }}>
                        {stat.value}
                      </p>
                      <p className="text-[10px]" style={{ color: "#8a7968" }}>
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Case queue preview */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: "#8a7968" }}>
                    Case Queue
                  </p>
                  {[
                    { name: "Priya M.", cond: "Acne vulgaris", severity: "Moderate" },
                    { name: "Rajesh K.", cond: "Tinea corporis", severity: "Mild" },
                    { name: "Anita S.", cond: "Psoriasis", severity: "Severe" },
                  ].map((c) => (
                    <div
                      key={c.name}
                      className="flex items-center justify-between rounded-md p-2.5"
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e8dfcf",
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-semibold"
                          style={{
                            background: "rgba(45,74,62,0.1)",
                            color: "#2d4a3e",
                          }}
                        >
                          {c.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: "#3d3229" }}>
                            {c.name}
                          </p>
                          <p className="text-[10px] truncate" style={{ color: "#8a7968" }}>
                            {c.cond}
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-[9px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
                        style={{
                          background: "rgba(184,147,106,0.15)",
                          color: "#b8936a",
                        }}
                      >
                        {c.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
