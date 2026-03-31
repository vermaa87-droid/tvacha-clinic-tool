"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Check } from "lucide-react";
import Link from "next/link";

const features = [
  "Unlimited patients",
  "AI pre-screening",
  "Prescription templates",
  "Analytics dashboard",
  "AI case queue (coming soon)",
  "Appointment management",
  "Patient messaging",
  "24/7 support",
];

function CountUp({ target, duration = 2, prefix = "", suffix = "" }: { target: number; duration?: number; prefix?: string; suffix?: string }) {
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

export function PricingSection() {
  return (
    <section className="py-24 bg-primary-100">
      <div className="max-w-4xl mx-auto px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 className="text-4xl font-serif font-bold text-text-primary mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-text-secondary font-light">
            One plan that grows with your practice
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-3xl font-serif font-bold text-text-primary">
                    Professional Plan
                  </h3>
                  <p className="text-text-secondary mt-2">
                    Perfect for clinics and GP practices
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-5xl font-bold text-primary-500">
                    ₹<CountUp target={2000} />
                  </span>
                  <p className="text-text-secondary text-sm">/month</p>
                </div>
              </div>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="bg-success-bg border border-success-text border-opacity-30 rounded-lg p-4 text-center">
                <p className="font-semibold text-success-text">
                  2 weeks free trial • No credit card required
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {features.map((feature, idx) => (
                  <motion.div
                    key={idx}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                  >
                    <Check size={20} className="text-success-text flex-shrink-0" />
                    <span className="text-text-primary">{feature}</span>
                  </motion.div>
                ))}
              </div>

              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  size="lg"
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold relative overflow-hidden group"
                >
                  <Link href="/signup" className="relative z-10">Start Your Free Trial</Link>
                  <span className="absolute inset-0 bg-primary-700 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
                </Button>
              </motion.div>
            </CardBody>
          </Card>
        </motion.div>

        <motion.div
          className="mt-16 bg-surface border border-primary-200 rounded-lg p-8 grid grid-cols-3 gap-8 text-center"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
          <div>
            <p className="text-4xl font-bold text-primary-500">
              <CountUp target={800} suffix="+" />
            </p>
            <p className="text-text-secondary mt-2">Active Doctors</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-primary-500">
              <CountUp target={50} suffix="k+" />
            </p>
            <p className="text-text-secondary mt-2">Cases Reviewed</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-primary-500">
              <CountUp target={14} suffix=" days" />
            </p>
            <p className="text-text-secondary mt-2">Free Trial</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
