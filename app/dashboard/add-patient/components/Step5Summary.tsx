"use client";

import { CheckCircle, Camera, ClipboardList, FileText, UserPlus } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";
import type { SavedPatient } from "../wizard-types";

interface Step5SummaryProps {
  savedPatient: SavedPatient;
  onAddAnother: () => void;
}

export function Step5Summary({ savedPatient, onAddAnother }: Step5SummaryProps) {
  const { t } = useLanguage();

  return (
    <div className="max-w-lg mx-auto text-center">
      {/* Success icon */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: "rgba(74,154,74,0.12)" }}
      >
        <CheckCircle size={32} style={{ color: "#4a9a4a" }} />
      </div>

      <h2 className="text-2xl font-serif font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
        {t("ap_s5_title")}
      </h2>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
        {t("ap_s5_subtitle")}
      </p>

      {/* Summary card */}
      <div
        className="rounded-2xl p-6 mb-6 text-left"
        style={{ background: "var(--color-card)", border: "1px solid var(--color-primary-200)", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle size={18} style={{ color: "#4a9a4a" }} />
          <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{t("ap_s5_registered")}</span>
        </div>

        <div className="space-y-1.5 mb-5">
          <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
            <span style={{ color: "var(--color-text-secondary)" }}>{t("ap_s5_name")} </span>
            <strong>{savedPatient.name}</strong>
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
            <span style={{ color: "var(--color-text-secondary)" }}>{t("ap_s5_id")} </span>
            <strong>{savedPatient.patient_display_id}</strong>
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
            <span style={{ color: "var(--color-text-secondary)" }}>{t("ap_s5_phone")} </span>
            <strong>+91 {savedPatient.phone}</strong>
          </p>
        </div>

        <div className="space-y-2 mb-5">
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-primary)" }}>
            <Camera size={15} style={{ color: "#b8936a" }} />
            <span>{savedPatient.photoCount} {t("ap_s5_photos_uploaded")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-primary)" }}>
            <ClipboardList size={15} style={{ color: "#b8936a" }} />
            <span>{t("ap_s5_screening_done")}</span>
          </div>
          {savedPatient.recordCount > 0 && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-primary)" }}>
              <FileText size={15} style={{ color: "#b8936a" }} />
              <span>{savedPatient.recordCount} {t("ap_s5_records_uploaded")}</span>
            </div>
          )}
        </div>

        {/* What's next */}
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-primary-200)" }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: "#b8936a" }}>
            {t("ap_s5_whats_next")}
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {t("ap_s5_next_desc")}
          </p>
        </div>
      </div>

      {savedPatient.photoUploadFailed > 0 && (
        <div
          className="rounded-xl px-4 py-3 mb-5 text-sm text-left"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", color: "#d97706" }}
        >
          {t("ap_s5_upload_fail").replace("{count}", String(savedPatient.photoUploadFailed))}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          type="button"
          onClick={onAddAnother}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold border min-h-[44px] transition-colors"
          style={{ borderColor: "#b8936a", color: "#b8936a", background: "transparent" }}
        >
          <UserPlus size={16} />
          {t("ap_s5_add_another")}
        </button>
        <Link
          href="/dashboard/ready-for-diagnosis"
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white min-h-[44px]"
          style={{ background: "#b8936a" }}
        >
          Review Patient
        </Link>
      </div>
    </div>
  );
}
