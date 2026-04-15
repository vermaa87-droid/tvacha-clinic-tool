"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/lib/language-context";
import { useDemoModal } from "@/components/landing/DemoModalProvider";

/**
 * Gold-on-gold closing CTA section with the "Watch Demo" trigger. Opens the
 * demo modal via DemoModalProvider context — same modal the Hero's Play
 * button opens.
 */
export function CtaSection() {
  const { t } = useLanguage();
  const { openDemo } = useDemoModal();

  return (
    <section className="py-20 bg-primary-500 text-white relative overflow-hidden">
      <div
        className="float-element absolute top-8 right-16 w-32 h-32 rounded-full border border-white opacity-10"
        style={{ animationDelay: "1s" }}
      />
      <div
        className="float-element absolute bottom-8 left-16 w-20 h-20 rounded-full border border-white opacity-10"
        style={{ animationDelay: "3s" }}
      />
      <motion.div
        className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 text-center relative z-10"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <h2 className="text-4xl font-serif font-bold mb-6">{t("cta_title")}</h2>
        <p className="text-xl mb-8 opacity-90">{t("cta_subtitle")}</p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              size="lg"
              variant="secondary"
              className="bg-[#7a5c35] text-white hover:bg-white hover:text-primary-600 transition-colors"
            >
              <Link href="/signup">{t("cta_trial")}</Link>
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <button
              type="button"
              onClick={openDemo}
              className="flex items-center gap-2 px-8 py-4 text-lg font-medium rounded-lg border-2 border-white text-white hover:bg-white/10 transition-colors"
            >
              <Play size={18} /> {t("cta_demo")}
            </button>
          </motion.div>
        </div>
        <p className="mt-6 text-sm opacity-75 flex items-center justify-center gap-2">
          <span style={{ color: "#d4b896" }}>&#10003;</span>
          {t("cta_verified")}
        </p>
      </motion.div>
    </section>
  );
}
