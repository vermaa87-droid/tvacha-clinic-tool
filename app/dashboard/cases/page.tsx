"use client";

import { Button } from "@/components/ui/Button";
import { Stethoscope } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";

export default function CasesPage() {
  const { t } = useLanguage();

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-4xl font-serif font-bold text-text-primary">{t("cases_title")}</h1>
        <p className="text-text-secondary mt-2">{t("cases_subtitle")}</p>
      </div>

      <div
        className="rounded-xl border p-4 sm:p-8"
        style={{
          background: "var(--color-card)",
          borderColor: "rgba(184,147,106,0.25)",
        }}
      >
        <div className="flex items-center gap-3 mb-5">
          <Stethoscope size={26} className="text-primary-500 flex-shrink-0" />
          <h2 className="text-base sm:text-xl font-serif font-semibold text-primary-500 uppercase tracking-widest break-words">
            {t("cases_coming_title")}
          </h2>
        </div>

        <p className="text-text-secondary leading-relaxed mb-4">
          {t("cases_coming_desc1")}{" "}
          <strong className="text-text-primary">{t("cases_approve")}</strong>,{" "}
          <strong className="text-text-primary">{t("cases_correct")}</strong>, or{" "}
          <strong className="text-text-primary">{t("cases_flag")}</strong>{" "}
          {t("cases_coming_desc1b")}
        </p>

        <p className="text-text-secondary leading-relaxed mb-6">
          {t("cases_coming_desc2")}{" "}
          <strong className="text-text-primary">{t("cases_prescription_templates")}</strong>{" "}
          and{" "}
          <strong className="text-text-primary">{t("cases_my_patients")}</strong>{" "}
          {t("cases_coming_desc2b")}
        </p>

        <div
          className="rounded-lg p-4 mb-6"
          style={{ background: "rgba(184,147,106,0.07)", border: "1px solid rgba(184,147,106,0.15)" }}
        >
          <p className="text-xs font-semibold text-primary-500 uppercase tracking-widest mb-3">
            {t("cases_what_happens")}
          </p>
          <div className="space-y-2">
            {(["cases_item_1", "cases_item_2", "cases_item_3", "cases_item_4"] as const).map((key) => (
              <div key={key} className="flex gap-2 text-sm text-text-secondary">
                <span className="text-primary-500 flex-shrink-0">◆</span>
                <span>{t(key)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Button className="bg-primary-500 hover:bg-primary-600 text-white">
            <Link href="/dashboard/prescriptions">{t("cases_cta_prescriptions")}</Link>
          </Button>
          <Button variant="outline" className="border-primary-500 text-primary-500">
            <Link href="/dashboard/patients">{t("cases_cta_patients")}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
