"use client";

import { motion } from "framer-motion";
import { Zap, FileText, Users, TrendingUp, BarChart3 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { useLanguage } from "@/lib/language-context";

export function FeaturesSection() {
  const { t } = useLanguage();

  const features = [
    { icon: Zap, title: t("feature_1_title"), description: t("feature_1_desc") },
    { icon: FileText, title: t("feature_2_title"), description: t("feature_2_desc") },
    { icon: Users, title: t("feature_3_title"), description: t("feature_3_desc") },
    { icon: TrendingUp, title: t("feature_4_title"), description: t("feature_4_desc") },
    { icon: BarChart3, title: t("feature_5_title"), description: t("feature_5_desc") },
  ];

  return (
    <section className="py-24" style={{ background: "transparent" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-text-primary mb-4">
            {t("features_title")}
          </h2>
          <p className="text-xl text-text-secondary font-light">
            {t("features_subtitle")}
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
