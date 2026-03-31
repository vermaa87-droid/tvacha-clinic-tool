"use client";

import { motion } from "framer-motion";
import { Zap, FileText, Users, TrendingUp, BarChart3 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";

const features = [
  {
    icon: Zap,
    title: "AI-Assisted Case Sorting",
    description:
      "Patients automatically grouped by condition type: fungal, bacterial, viral, complex. Each with name, date, severity, history.",
  },
  {
    icon: FileText,
    title: "Ready Prescription Templates",
    description:
      "Pre-built templates for common conditions. One tap to generate. Doctors can add custom templates. Auto-fills clinic details.",
  },
  {
    icon: Users,
    title: "My Patients Dashboard",
    description:
      "Remote monitoring tab. See daily photos submitted by patients. Message patients. Track progress with before/after timeline.",
  },
  {
    icon: TrendingUp,
    title: "AI Case Queue (Coming Soon)",
    description:
      "Receive AI-screened cases from the Tvacha consumer app. Approve or correct the AI diagnosis, assign a prescription, and earn per case reviewed.",
  },
  {
    icon: BarChart3,
    title: "Clinic Analytics",
    description:
      "Patients cured, patients seen, average disease, consult time tracking, seasonal trends, monthly performance reports.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-primary-50">
      <div className="max-w-7xl mx-auto px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 className="text-4xl font-serif font-bold text-text-primary mb-4">
            Powerful Features for Modern Clinics
          </h2>
          <p className="text-xl text-text-secondary font-light">
            Everything you need to streamline patient care and grow your practice
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: idx * 0.1, ease: "easeOut" }}
                whileHover={{ y: -8 }}
              >
                <Card hover>
                  <CardBody>
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary-100 rounded-lg transition-colors group-hover:bg-primary-200">
                        <Icon size={24} className="text-primary-500" />
                      </div>
                      <div>
                        <h3 className="font-serif font-semibold text-text-primary mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-text-secondary text-sm leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
