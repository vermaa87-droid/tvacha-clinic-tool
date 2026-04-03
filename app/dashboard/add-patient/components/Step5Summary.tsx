"use client";

import { CheckCircle, Camera, ClipboardList, FileText, UserPlus } from "lucide-react";
import Link from "next/link";
import type { SavedPatient } from "../wizard-types";

interface Step5SummaryProps {
  savedPatient: SavedPatient;
  onAddAnother: () => void;
}

export function Step5Summary({ savedPatient, onAddAnother }: Step5SummaryProps) {
  return (
    <div className="max-w-lg mx-auto text-center">
      {/* Success icon */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: "rgba(74,154,74,0.12)" }}
      >
        <CheckCircle size={32} style={{ color: "#4a9a4a" }} />
      </div>

      <h2 className="text-2xl font-serif font-bold mb-2" style={{ color: "#1a1612" }}>
        Patient Registered Successfully!
      </h2>
      <p className="text-sm mb-8" style={{ color: "#9a8a76" }}>
        The patient&apos;s record has been created and saved.
      </p>

      {/* Summary card */}
      <div
        className="rounded-2xl p-6 mb-6 text-left"
        style={{ background: "#fff", border: "1px solid #e8e0d0", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle size={18} style={{ color: "#4a9a4a" }} />
          <span className="font-semibold" style={{ color: "#1a1612" }}>Patient Registered</span>
        </div>

        <div className="space-y-1.5 mb-5">
          <p className="text-sm" style={{ color: "#1a1612" }}>
            <span style={{ color: "#9a8a76" }}>Name: </span>
            <strong>{savedPatient.name}</strong>
          </p>
          <p className="text-sm" style={{ color: "#1a1612" }}>
            <span style={{ color: "#9a8a76" }}>ID: </span>
            <strong>{savedPatient.patient_display_id}</strong>
          </p>
          <p className="text-sm" style={{ color: "#1a1612" }}>
            <span style={{ color: "#9a8a76" }}>Phone: </span>
            <strong>+91 {savedPatient.phone}</strong>
          </p>
        </div>

        <div className="space-y-2 mb-5">
          <div className="flex items-center gap-2 text-sm" style={{ color: "#1a1612" }}>
            <Camera size={15} style={{ color: "#b8936a" }} />
            <span>{savedPatient.photoCount} photo{savedPatient.photoCount !== 1 ? "s" : ""} uploaded</span>
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ color: "#1a1612" }}>
            <ClipboardList size={15} style={{ color: "#b8936a" }} />
            <span>Screening questions answered</span>
          </div>
          {savedPatient.recordCount > 0 && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "#1a1612" }}>
              <FileText size={15} style={{ color: "#b8936a" }} />
              <span>{savedPatient.recordCount} medical record{savedPatient.recordCount !== 1 ? "s" : ""} uploaded</span>
            </div>
          )}
        </div>

        {/* What's next */}
        <div
          className="rounded-xl p-4"
          style={{ background: "#fef9f0", border: "1px solid #f0e0c0" }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: "#b8936a" }}>
            What&apos;s next
          </p>
          <p className="text-sm" style={{ color: "#9a8a76" }}>
            The doctor can review this patient from My Patients and write a prescription.
          </p>
        </div>
      </div>

      {savedPatient.photoUploadFailed > 0 && (
        <div
          className="rounded-xl px-4 py-3 mb-5 text-sm text-left"
          style={{ background: "#fffbeb", border: "1px solid #fbbf24", color: "#92400e" }}
        >
          Note: {savedPatient.photoUploadFailed} photo(s) failed to upload. Upload them from the
          patient&apos;s profile page.
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
          Add Another Patient
        </button>
        <Link
          href={`/dashboard/patients/${savedPatient.id}`}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white min-h-[44px]"
          style={{ background: "#b8936a" }}
        >
          View Patient →
        </Link>
      </div>
    </div>
  );
}
