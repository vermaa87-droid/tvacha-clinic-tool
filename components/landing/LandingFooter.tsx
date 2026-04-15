"use client";

import { motion } from "framer-motion";
import { Footer } from "@/components/layout/Footer";

/**
 * Thin client wrapper that preserves the fade-in framer-motion wrapper the
 * landing page used to render around <Footer/>. Kept as its own island so
 * app/(marketing)/page.tsx can stay a server component.
 */
export function LandingFooter() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <Footer />
    </motion.div>
  );
}
