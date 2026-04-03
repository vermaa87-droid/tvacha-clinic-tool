
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";

function CountUp({
  target,
  duration = 2,
  prefix = "",
  suffix = "",
}: {
  target: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [inView, target, duration]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString("en-IN")}{suffix}
    </span>
  );
}

const features = [
  "Unlimited patients",
  "AI pre-screening",
  "Prescription templates",
  "Analytics dashboard",
  "AI case queue (phased rollout)",
  "Appointment management",
  "Patient messaging",
  "24/7 support",
];

export function PricingSection() {
  const { t } = useLanguage();

  return (
    <section className="py-24" style={{ background: "transparent" }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-text-primary mb-4">
            {t("pricing_title")}
          </h2>
          <p className="text-xl text-text-secondary font-light">
            {t("pricing_subtitle")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Premium card — warm ivory bg, gold top accent, elevated shadow */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "#f9f6f0",
              border: "1px solid rgba(184,147,106,0.28)",
              boxShadow: "0 4px 28px rgba(26,22,18,0.09), 0 1px 4px rgba(26,22,18,0.04)",
            }}
          >
            {/* Gold top accent line */}
            <div
              className="h-1 w-full"
              style={{ background: "linear-gradient(90deg, #b8936a 0%, #d4b896 50%, #b8936a 100%)" }}
            />

            {/* Header */}
            <div
              className="px-7 pt-7 pb-6 md:px-10 md:pt-9"
              style={{ borderBottom: "1px solid rgba(184,147,106,0.15)" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-3xl font-serif font-bold text-text-primary">
                    {t("pricing_plan_name")}
                  </h3>
                  <p className="text-text-secondary mt-2">{t("pricing_plan_desc")}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary-500">
                    ₹<CountUp target={2000} />
                  </span>
                  <p className="text-text-secondary text-sm">{t("pricing_monthly")}</p>
                </div>
              </div>
            </div>

            {/* Trial banner — full-width centered, main marketing hook */}
            <div
              className="px-7 py-4 md:px-10 text-center"
              style={{
                background: "linear-gradient(90deg, rgba(196,146,42,0.08) 0%, rgba(196,146,42,0.16) 50%, rgba(196,146,42,0.08) 100%)",
                borderBottom: "1px solid rgba(196,146,42,0.22)",
              }}
            >
              <p
                className="text-lg font-extrabold tracking-wide uppercase"
                style={{ color: "#c4922a", letterSpacing: "0.06em" }}
              >
                {t("pricing_trial_badge")}
              </p>
            </div>

            {/* Body */}
            <div className="px-7 py-7 md:px-10 md:py-9 space-y-8">
              {/* Feature checklist — gold checks, more breathing room */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                {features.map((feature, idx) => (
                  <motion.div
                    key={idx}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                  >
                    <Check
                      size={16}
                      className="flex-shrink-0"
                      style={{ color: "#b8936a" }}
                    />
                    <span className="text-text-primary">{feature}</span>
                  </motion.div>
                ))}
              </div>

              {/* CTA — deep bronze matching landing page hero */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="relative overflow-hidden rounded-lg group"
              >
                <Link
                  href="/signup"
                  className="block w-full py-3.5 text-center rounded-lg font-semibold text-white relative z-10"
                  style={{ background: "#7a5c35" }}
                >
                  {t("pricing_cta")}
                </Link>
                <span className="absolute inset-0 rounded-lg bg-[#5c4527] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
