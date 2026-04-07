"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, AlertTriangle, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import { TagInput } from "./TagInput";
import type { PatientFormData } from "../wizard-types";
import { BLOOD_GROUP_OPTIONS } from "@/lib/constants";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
];

const CHRONIC_OPTIONS = [
  "Diabetes", "Hypertension", "Asthma", "Thyroid Disorder", "Heart Disease", "None",
];

const selectClass =
  "w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors";
const inputClass =
  "w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors";

interface DuplicatePatient {
  id: string;
  name: string;
  patient_display_id: string;
}

interface FormErrors {
  fullName?: string;
  phone?: string;
}

interface Step3DetailsProps {
  data: PatientFormData;
  onChange: (updated: PatientFormData) => void;
  saveError: string | null;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
}

export function Step3Details({
  data,
  onChange,
  saveError,
  saving,
  onBack,
  onSave,
}: Step3DetailsProps) {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const [errors, setErrors] = useState<FormErrors>({});
  const [duplicate, setDuplicate] = useState<DuplicatePatient | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const recordInputRef = useRef<HTMLInputElement>(null);
  const [recordPreviews, setRecordPreviews] = useState<(string | null)[]>([]);

  useEffect(() => {
    const urls = data.medicalRecords.map((f) =>
      f.type.startsWith("image/") ? URL.createObjectURL(f) : null
    );
    setRecordPreviews(urls);
    return () => {
      urls.forEach((u) => { if (u) URL.revokeObjectURL(u); });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.medicalRecords]);

  const set = <K extends keyof PatientFormData>(field: K, value: PatientFormData[K]) => {
    onChange({ ...data, [field]: value });
    if (field === "fullName" || field === "phone") {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePhoneBlur = async () => {
    if (!user || data.phone.length !== 10) return;
    setCheckingDuplicate(true);
    try {
      const { data: result } = await supabase
        .from("patients")
        .select("id, name, patient_display_id")
        .eq("phone", data.phone)
        .eq("linked_doctor_id", user.id)
        .limit(1);
      setDuplicate(result && result.length > 0 ? (result[0] as DuplicatePatient) : null);
    } catch {
      // best-effort
    } finally {
      setCheckingDuplicate(false);
    }
  };

  const toggleChronic = (condition: string) => {
    const current = data.chronicConditions;
    if (condition === "None") {
      set("chronicConditions", current.includes("None") ? [] : ["None"]);
    } else {
      const without = current.filter((c) => c !== "None");
      const updated = without.includes(condition)
        ? without.filter((c) => c !== condition)
        : [...without, condition];
      set("chronicConditions", updated);
    }
  };

  const handleRecordFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      set("medicalRecords", [...data.medicalRecords, ...files]);
    }
    e.target.value = "";
  };

  const removeRecord = (index: number) => {
    set("medicalRecords", data.medicalRecords.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!data.fullName.trim()) e.fullName = t("ap_s3_name_error");
    if (!/^\d{10}$/.test(data.phone)) e.phone = t("ap_s3_phone_error");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (validate()) onSave();
  };

  const sectionLabel = (text: string) => (
    <div className="flex items-center gap-3 mb-4 mt-6 first:mt-0">
      <div className="flex-1 h-px" style={{ background: "var(--color-primary-200)" }} />
      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#b8936a" }}>
        {text}
      </span>
      <div className="flex-1 h-px" style={{ background: "var(--color-primary-200)" }} />
    </div>
  );

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
      <h2 className="text-2xl font-serif font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
        {t("ap_s3_title")}
      </h2>
      <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
        {t("ap_s3_subtitle")}
      </p>

      {saveError && (
        <div
          className="flex items-start gap-3 rounded-xl p-4 mb-6"
          style={{ background: "#fef2f2", border: "1px solid #fca5a5" }}
        >
          <AlertTriangle size={18} style={{ color: "#c44a4a", flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#c44a4a" }}>
              {t("ap_s3_save_error")}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{saveError}</p>
          </div>
        </div>
      )}

      {/* ── Personal Information ── */}
      {sectionLabel(t("ap_s3_personal"))}

      <div className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--color-text-primary)" }}>
            {t("ap_s3_full_name")} <span style={{ color: "#c44a4a" }}>*</span>
          </label>
          <input
            type="text"
            value={data.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            placeholder={t("ap_s3_name_placeholder")}
            className={inputClass}
          />
          {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--color-text-primary)" }}>
            {t("ap_s3_phone")} <span style={{ color: "#c44a4a" }}>*</span>
          </label>
          <div className="flex">
            <span
              className="flex items-center px-3 rounded-l-lg border border-r-0 border-primary-200 text-sm font-medium flex-shrink-0"
              style={{ background: "var(--color-surface)", color: "#5c3d18" }}
            >
              +91
            </span>
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
              onBlur={handlePhoneBlur}
              placeholder="9876543210"
              maxLength={10}
              className="flex-1 px-4 py-2.5 border border-primary-200 rounded-r-lg bg-surface text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
            />
          </div>
          {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
          {checkingDuplicate && (
            <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>{t("ap_s3_checking_dup")}</p>
          )}
          {duplicate && (
            <div
              className="flex items-start gap-2 rounded-lg px-3 py-2.5 mt-2"
              style={{ background: "#fffbeb", border: "1px solid #fbbf24" }}
            >
              <AlertTriangle size={16} style={{ color: "#d97706", flexShrink: 0, marginTop: 1 }} />
              <p className="text-sm" style={{ color: "#92400e" }}>
                {t("ap_s3_dup_exists")}{" "}
                <strong>{duplicate.name}</strong>{" "}
                ({duplicate.patient_display_id}).{" "}
                <a
                  href={`/dashboard/patients/${duplicate.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold"
                >
                  {t("ap_s3_dup_view")}
                </a>{" "}
                {t("ap_s3_dup_continue")}
              </p>
            </div>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--color-text-primary)" }}>
            {t("ap_s3_email")} <span className="text-xs font-normal" style={{ color: "var(--color-text-secondary)" }}>({t("ap_s3_optional")})</span>
          </label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="patient@email.com"
            className={inputClass}
          />
        </div>

        {/* DOB */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--color-text-primary)" }}>
            {t("ap_s3_dob")} <span className="text-xs font-normal" style={{ color: "var(--color-text-secondary)" }}>({t("ap_s3_optional")})</span>
          </label>
          <input
            type="date"
            value={data.dob}
            onChange={(e) => set("dob", e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--color-text-primary)" }}>
            {t("ap_s3_address")} <span className="text-xs font-normal" style={{ color: "var(--color-text-secondary)" }}>({t("ap_s3_optional")})</span>
          </label>
          <textarea
            rows={2}
            value={data.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder={t("ap_s3_address_placeholder")}
            className={inputClass}
          />
        </div>

        {/* City + State */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--color-text-primary)" }}>
              {t("ap_s3_city")} <span className="text-xs font-normal" style={{ color: "var(--color-text-secondary)" }}>({t("ap_s3_optional")})</span>
            </label>
            <input
              type="text"
              value={data.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder={t("ap_s3_city")}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--color-text-primary)" }}>
              {t("ap_s3_state")} <span className="text-xs font-normal" style={{ color: "var(--color-text-secondary)" }}>({t("ap_s3_optional")})</span>
            </label>
            <select value={data.state} onChange={(e) => set("state", e.target.value)} className={selectClass}>
              <option value="">{t("ap_s3_state_placeholder")}</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Blood Group */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--color-text-primary)" }}>
            {t("ap_s3_blood_group")} <span className="text-xs font-normal" style={{ color: "var(--color-text-secondary)" }}>({t("ap_s3_optional")})</span>
          </label>
          <select value={data.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)} className={selectClass} style={{ maxWidth: 200 }}>
            <option value="">{t("ap_s3_blood_placeholder")}</option>
            {BLOOD_GROUP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Medical History ── */}
      {sectionLabel(t("ap_s3_medical_history"))}

      <div className="space-y-5">
        {/* Allergies */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--color-text-primary)" }}>
            {t("ap_s3_allergies")} <span className="text-xs font-normal" style={{ color: "var(--color-text-secondary)" }}>({t("ap_s3_optional")})</span>
          </label>
          <TagInput
            tags={data.allergies}
            onAdd={(tag) => set("allergies", [...data.allergies, tag])}
            onRemove={(tag) => set("allergies", data.allergies.filter((a) => a !== tag))}
            placeholder={t("ap_s3_allergies_placeholder")}
            enterHint={t("ap_s3_press_enter")}
          />
        </div>

        {/* Chronic Conditions */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
            {t("ap_s3_chronic")} <span className="text-xs font-normal" style={{ color: "var(--color-text-secondary)" }}>({t("ap_s3_optional")})</span>
          </label>
          <div className="flex flex-wrap gap-3">
            {CHRONIC_OPTIONS.map((condition) => {
              const checked = data.chronicConditions.includes(condition);
              return (
                <label
                  key={condition}
                  className="flex items-center gap-2 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleChronic(condition)}
                    className="w-4 h-4 rounded accent-primary-500"
                  />
                  <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>{condition}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Current Medications */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--color-text-primary)" }}>
            {t("ap_s3_medications")} <span className="text-xs font-normal" style={{ color: "var(--color-text-secondary)" }}>({t("ap_s3_optional")})</span>
          </label>
          <textarea
            rows={3}
            value={data.currentMedications}
            onChange={(e) => set("currentMedications", e.target.value)}
            placeholder={t("ap_s3_medications_placeholder")}
            className={inputClass}
          />
        </div>
      </div>

      {/* ── Previous Medical Records ── */}
      {sectionLabel(t("ap_s3_records"))}

      <div>
        <input
          ref={recordInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={handleRecordFiles}
        />

        {data.medicalRecords.length === 0 ? (
          <button
            type="button"
            onClick={() => recordInputRef.current?.click()}
            className="w-full flex flex-col items-center gap-2 rounded-xl py-6 px-4 transition-colors hover:bg-amber-50"
            style={{ border: "2px dashed #b8936a", background: "#fef9f4" }}
          >
            <Upload size={22} style={{ color: "#b8936a" }} />
            <span className="text-sm font-medium" style={{ color: "#b8936a" }}>
              {t("ap_s3_upload_records")}
            </span>
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              {t("ap_s3_upload_hint")}
            </span>
          </button>
        ) : (
          <div
            className="rounded-xl p-3"
            style={{ border: "2px dashed #b8936a", background: "#fef9f4" }}
          >
            <div
              className={`grid gap-2 ${
                data.medicalRecords.length === 1
                  ? "grid-cols-1"
                  : data.medicalRecords.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-3"
              }`}
            >
              {data.medicalRecords.map((file, idx) => {
                const preview = recordPreviews[idx];
                const isImage = file.type.startsWith("image/");
                return (
                  <div
                    key={idx}
                    className="relative rounded-lg overflow-hidden"
                    style={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-primary-200)",
                      aspectRatio: isImage ? "1 / 1" : undefined,
                    }}
                  >
                    {isImage && preview ? (
                      <img
                        src={preview}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1.5 p-3 min-h-[80px]">
                        <FileText size={22} style={{ color: "#b8936a", flexShrink: 0 }} />
                        <span
                          className="text-xs text-center font-medium leading-tight"
                          style={{ color: "var(--color-text-primary)", wordBreak: "break-word" }}
                        >
                          {file.name}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeRecord(idx)}
                      aria-label={`Remove ${file.name}`}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                      style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
                    >
                      <X size={12} />
                    </button>
                    {isImage && (
                      <div
                        className="absolute bottom-0 left-0 right-0 px-2 py-1 text-xs truncate"
                        style={{
                          background: "rgba(0,0,0,0.45)",
                          color: "#fff",
                          fontSize: "0.65rem",
                        }}
                      >
                        {file.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => recordInputRef.current?.click()}
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-amber-100"
              style={{ color: "#b8936a" }}
            >
              <Upload size={14} />
              {t("ap_s3_add_more")}
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-10">
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="px-6 py-3 rounded-lg font-semibold border transition-colors min-h-[44px]"
          style={{ borderColor: "#b8936a", color: "#b8936a", background: "transparent", opacity: saving ? 0.5 : 1 }}
        >
          {t("ap_s3_back")}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-8 py-3 rounded-lg font-semibold text-white flex items-center gap-2 min-h-[44px]"
          style={{ background: "#b8936a", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? (
            <>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              {t("ap_s3_saving")}
            </>
          ) : (
            t("ap_s3_save")
          )}
        </button>
      </div>
    </form>
  );
}
