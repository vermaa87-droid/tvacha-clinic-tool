"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/lib/language-context";

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

export function AIHighlightsSection() {
  const { t } = useLanguage();

  return (
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
              <p className="font-semibold text-text-primary mb-2">
                {h.labelKey}
              </p>
              <p className="text-text-secondary text-sm leading-relaxed max-w-[200px] mx-auto">
                {h.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
