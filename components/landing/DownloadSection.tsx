"use client";

import { motion } from "framer-motion";
import { Zap, Monitor, Lock, Package, Download } from "lucide-react";

const WINDOWS_DOWNLOAD_URL =
  "https://github.com/vermaa87-droid/tvacha-clinic-desktop/releases/download/v1.0.0/TvachaClinic-Setup.exe";
const ANDROID_DOWNLOAD_URL =
  "https://github.com/vermaa87-droid/tvacha-clinic-desktop/releases/download/v1.0.0-android/TvachaClinic.apk";

const features = [
  {
    icon: Zap,
    title: "Instant Launch",
    desc: "Open your clinic dashboard directly from your desktop or phone. No browser tabs to manage.",
  },
  {
    icon: Monitor,
    title: "Dedicated Workspace",
    desc: "A focused app experience without browser distractions.",
  },
  {
    icon: Lock,
    title: "Same Secure Platform",
    desc: "All your data stays on our encrypted servers. The apps are a secure window to your existing account.",
  },
  {
    icon: Package,
    title: "Lightweight",
    desc: "Both apps are under 10MB. No heavy engines bundled.",
  },
];

// Inline SVG icons — small, recognizable, gold-tinted
function WindowsIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
    </svg>
  );
}

function AndroidIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.523 15.34c-.355 0-.643-.288-.643-.643s.288-.643.643-.643.643.288.643.643-.288.643-.643.643m-11.046 0c-.355 0-.643-.288-.643-.643s.288-.643.643-.643.643.288.643.643-.288.643-.643.643m11.277-6.155l1.285-2.226a.267.267 0 00-.098-.365.267.267 0 00-.365.098l-1.301 2.253a8.07 8.07 0 00-3.275-.69 8.07 8.07 0 00-3.275.69L9.424 6.692a.267.267 0 00-.365-.098.267.267 0 00-.098.365l1.285 2.226C8.04 10.45 6.5 12.91 6.5 15.74h11c0-2.83-1.54-5.29-3.746-6.555" />
    </svg>
  );
}

interface DownloadCardProps {
  platform: "windows" | "android";
  emphasized?: boolean;
}

function DownloadCard({ platform, emphasized }: DownloadCardProps) {
  const isWindows = platform === "windows";
  const url = isWindows ? WINDOWS_DOWNLOAD_URL : ANDROID_DOWNLOAD_URL;
  const Icon = isWindows ? WindowsIcon : AndroidIcon;
  const label = isWindows ? "Download for Windows" : "Download for Android";
  const subtitle = isWindows
    ? "v1.0.0 · Windows 10/11 · ~2.5 MB"
    : "v1.0.0 · Android 7+ · ~1.5 MB";

  return (
    <motion.a
      href={url}
      download
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="group block rounded-xl p-6 transition-all duration-200"
      style={{
        background: "var(--color-card)",
        border: emphasized
          ? "1.5px solid rgba(184,147,106,0.45)"
          : "1px solid #e8dfcf",
        boxShadow: emphasized
          ? "0 10px 30px -10px rgba(184,147,106,0.25)"
          : "0 2px 8px rgba(26,22,18,0.04)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#b8936a";
        e.currentTarget.style.boxShadow = "0 12px 32px -10px rgba(184,147,106,0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = emphasized
          ? "rgba(184,147,106,0.45)"
          : "#e8dfcf";
        e.currentTarget.style.boxShadow = emphasized
          ? "0 10px 30px -10px rgba(184,147,106,0.25)"
          : "0 2px 8px rgba(26,22,18,0.04)";
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: "rgba(184,147,106,0.12)",
            border: "1px solid rgba(184,147,106,0.25)",
            color: "#b8936a",
          }}
        >
          <Icon size={26} />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-text-primary leading-tight">
            {isWindows ? "Windows Desktop" : "Android Phone"}
          </p>
          <p className="text-xs text-text-secondary font-light">{subtitle}</p>
        </div>
      </div>

      <div
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white text-sm w-full justify-center transition-colors"
        style={{ background: "#b8936a" }}
      >
        <Download size={16} />
        {label}
      </div>
    </motion.a>
  );
}

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
          {/* Left column — text + download cards */}
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
              Native Apps
            </p>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-semibold text-text-primary mb-5 leading-tight">
              Your Clinic, On Every Device
            </h2>

            <p className="text-lg text-text-secondary font-light mb-8 leading-relaxed max-w-xl">
              Get the full Tvacha Clinic experience as a native app. Fast,
              focused, and always one tap away.
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
                        <span className="text-text-secondary font-light">
                          {" "}
                          — {f.desc}
                        </span>
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Desktop: both cards side by side */}
            <motion.div
              className="hidden md:grid md:grid-cols-2 gap-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <DownloadCard platform="windows" />
              <DownloadCard platform="android" />
            </motion.div>

            {/* Mobile: Android emphasized, Windows as text link below */}
            <motion.div
              className="md:hidden space-y-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <DownloadCard platform="android" emphasized />
              <a
                href={WINDOWS_DOWNLOAD_URL}
                download
                className="block text-center text-sm font-medium py-3 transition-colors"
                style={{ color: "#8a7968" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#b8936a")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#8a7968")}
              >
                Also available for Windows →
              </a>
            </motion.div>

            <a
              href="https://www.tvacha-clinic.com"
              className="inline-block mt-6 text-sm font-light transition-colors"
              style={{ color: "#8a7968" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#b8936a")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#8a7968")}
            >
              Or continue using the web app →
            </a>
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

                <div className="space-y-2">
                  <p
                    className="text-[10px] uppercase font-semibold tracking-wider"
                    style={{ color: "#8a7968" }}
                  >
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
