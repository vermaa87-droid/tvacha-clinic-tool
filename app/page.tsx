"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Logo } from "@/components/layout/Logo";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

const testimonials = [
  { name: "Dr. Sharma", location: "Delhi Clinic", text: "This platform has transformed how I manage cases. The AI pre-screening saves me hours daily, and the earning potential is fantastic." },
  { name: "Dr. Patel", location: "Mumbai Medical Center", text: "The prescription templates alone are worth it. I see twice as many patients now without any drop in care quality." },
  { name: "Dr. Singh", location: "Bangalore Healthcare", text: "Finally a tool built for Indian dermatologists. The case queue and analytics have completely changed my practice." },
];

export default function Home() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <motion.nav
        className="sticky top-0 z-40 transition-all duration-300"
        style={{
          backgroundColor: scrolled ? "rgba(250,248,244,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? "1px solid #e8e0d0" : "1px solid transparent",
          boxShadow: scrolled ? "0 1px 20px rgba(26,22,18,0.04)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Logo />
          </motion.div>
          <div className="flex items-center gap-6">
            {["Pricing", "Sign In"].map((label, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
              >
                <Link
                  href={label === "Pricing" ? "/pricing" : "/login"}
                  className="text-text-secondary hover:text-text-primary font-medium transition-colors"
                >
                  {label}
                </Link>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.36 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button size="sm" className="bg-primary-500 hover:bg-primary-600 text-white">
                <Link href="/signup">Get Started</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.nav>

      <HeroSection />
      <FeaturesSection />
      <PricingSection />

      {/* Testimonials Section */}
      <section className="py-20 bg-primary-50">
        <div className="max-w-7xl mx-auto px-8">
          <motion.h2
            className="text-3xl font-serif font-bold text-text-primary text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            Trusted by 800+ Doctors
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                className="bg-surface border border-primary-200 rounded-lg p-6"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
                whileHover={{ y: -4, boxShadow: "0 8px 30px rgba(26,22,18,0.08)" }}
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <span key={j} className="text-primary-500">★</span>
                  ))}
                </div>
                <p className="text-text-secondary mb-4">&ldquo;{t.text}&rdquo;</p>
                <div>
                  <p className="font-semibold text-text-primary">{t.name}</p>
                  <p className="text-sm text-text-muted">{t.location}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-500 text-white relative overflow-hidden">
        <div className="float-element absolute top-8 right-16 w-32 h-32 rounded-full border border-white opacity-10" style={{ animationDelay: "1s" }} />
        <div className="float-element absolute bottom-8 left-16 w-20 h-20 rounded-full border border-white opacity-10" style={{ animationDelay: "3s" }} />
        <motion.div
          className="max-w-4xl mx-auto px-8 text-center relative z-10"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 className="text-4xl font-serif font-bold mb-6">
            Ready to Transform Your Practice?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Start your 2-week free trial today. No credit card required.
          </p>
          <div className="flex gap-4 justify-center">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                variant="secondary"
                className="bg-surface text-primary-500 hover:bg-primary-50"
              >
                <Link href="/signup">Start Free Trial</Link>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-white text-white hover:bg-surface hover:bg-opacity-10"
              >
                See Demo
              </Button>
            </motion.div>
          </div>
          <p className="mt-6 text-sm opacity-75 flex items-center justify-center gap-2">
            <span style={{ color: "#d4b896" }}>&#10003;</span>
            Every doctor verified against the National Medical Commission registry
          </p>
        </motion.div>
      </section>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <Footer />
      </motion.div>
    </main>
  );
}
