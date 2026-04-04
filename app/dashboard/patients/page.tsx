"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import type { Patient } from "@/lib/types";
import { useLanguage } from "@/lib/language-context";
import { useRefreshTick } from "@/lib/RefreshContext";
import { Search, Users, MoreHorizontal } from "lucide-react";
import {
  GENDER_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  FITZPATRICK_OPTIONS,
  SEVERITY_OPTIONS,
  SEVERITY_COLORS,
  TREATMENT_STATUS_OPTIONS,
  TREATMENT_STATUS_COLORS,
} from "@/lib/constants";

interface PatientWithDetails extends Patient {
  patient_display_id: string | null;
  chief_complaint: string | null;
  current_diagnosis: string | null;
  treatment_status: string | null;
  severity: string | null;
  total_visits: number | null;
  last_visit_date: string | null;
  blood_group: string | null;
  chronic_conditions: string[] | null;
  family_history: string | null;
}

type SortKey = "name" | "created_at" | "last_visit_date" | "severity";

const SEVERITY_ORDER: Record<string, number> = {
  mild: 1,
  moderate: 2,
  severe: 3,
  critical: 4,
};

const INITIAL_FORM = {
  name: "",
  age: "",
  gender: "",
  phone: "",
  email: "",
  blood_group: "",
  fitzpatrick_type: "",
  chief_complaint: "",
  city: "",
  state: "",
  allergies: "",
  chronic_conditions: "",
  family_history: "",
};

export default function PatientsPage() {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const refreshTick = useRefreshTick();
  const [patients, setPatients] = useState<PatientWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);
  const [patientToDelete, setPatientToDelete] = useState<PatientWithDetails | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Search & filter state
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("created_at");

  const fetchPatients = useCallback(async (silent?: boolean) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("linked_doctor_id", user.id)
        .neq("treatment_status", "pending_diagnosis")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      if (data) {
        setPatients(data as PatientWithDetails[]);
      }
    } catch (err) {
      console.error("[patients] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPatients(refreshTick > 0);
  }, [fetchPatients, refreshTick]);

  // Realtime: sync across devices (requires Supabase Realtime enabled for patients table)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("patients-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "patients", filter: `linked_doctor_id=eq.${user.id}` }, () => { fetchPatients(true); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchPatients]);

  // Filtered + sorted patients
  const filteredPatients = useMemo(() => {
    let result = [...patients];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.phone?.toLowerCase().includes(q) ||
          p.patient_display_id?.toLowerCase().includes(q)
      );
    }

    // Treatment status filter
    if (filterStatus) {
      result = result.filter((p) => p.treatment_status === filterStatus);
    }

    // Severity filter
    if (filterSeverity) {
      result = result.filter((p) => p.severity === filterSeverity);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "created_at":
          return (
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
          );
        case "last_visit_date":
          return (
            new Date(b.last_visit_date || 0).getTime() -
            new Date(a.last_visit_date || 0).getTime()
          );
        case "severity":
          return (
            (SEVERITY_ORDER[b.severity || ""] || 0) -
            (SEVERITY_ORDER[a.severity || ""] || 0)
          );
        default:
          return 0;
      }
    });

    return result;
  }, [patients, search, filterStatus, filterSeverity, sortBy]);

  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormError("");

    // Validate required fields
    const missing: string[] = [];
    if (!form.name.trim()) missing.push("Patient name");
    if (!form.age) missing.push("Age");
    if (!form.gender) missing.push("Gender");
    if (!form.phone.trim()) missing.push("Phone number");
    if (missing.length > 0) {
      setFormError(`Please fill in: ${missing.join(", ")}`);
      return;
    }

    // Phone validation
    const phoneDigits = form.phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10 && !(phoneDigits.length === 12 && phoneDigits.startsWith("91"))) {
      setFormError("Please enter a valid 10-digit phone number.");
      return;
    }

    try {
      setSubmitting(true);

      const patientDisplayId =
        "TVP-" + String(patients.length + 1).padStart(4, "0");

      const allergiesArr = form.allergies
        ? form.allergies
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const chronicArr = form.chronic_conditions
        ? form.chronic_conditions
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const res = await fetch("/api/patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          age: form.age ? parseInt(form.age, 10) : null,
          gender: form.gender || null,
          phone: form.phone || null,
          email: form.email || null,
          blood_group: form.blood_group || null,
          fitzpatrick_type: form.fitzpatrick_type
            ? parseInt(form.fitzpatrick_type, 10)
            : null,
          chief_complaint: form.chief_complaint || null,
          city: form.city || null,
          state: form.state || null,
          allergies: allergiesArr.length > 0 ? allergiesArr : null,
          chronic_conditions: chronicArr.length > 0 ? chronicArr : null,
          family_history: form.family_history || null,
          patient_display_id: patientDisplayId,
          linked_doctor_id: user.id,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to add patient");
      }

      setForm(INITIAL_FORM);
      setShowModal(false);
      await fetchPatients();
    } catch (err) {
      console.error("[patients] insert error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlinkPatient = async () => {
    if (!patientToDelete) return;
    setDeleteLoading(true);
    try {
      await supabase
        .from("patients")
        .update({ linked_doctor_id: null })
        .eq("id", patientToDelete.id);
      setPatientToDelete(null);
      await fetchPatients();
    } catch (err) {
      console.error("[patients] unlink error:", err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filterSelectClass =
    "w-full px-4 py-2.5 text-sm rounded-lg outline-none transition-all text-[#3d2e22] bg-[#faf6f0] border border-[#b8936a]/40 focus:border-[#b8936a] focus:ring-2 focus:ring-[#b8936a]/15 appearance-none cursor-pointer";
  const filterSelectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23b8936a' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: "right 0.75rem center",
    backgroundRepeat: "no-repeat" as const,
    backgroundSize: "1.25em 1.25em",
    paddingRight: "2.5rem",
  };
  const selectClass =
    "w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors";

  if (loading) {
    return (
      <main className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-10 bg-primary-200 rounded w-48 animate-pulse" />
            <div className="h-4 bg-primary-100 rounded w-64 animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-primary-200 rounded-lg animate-pulse" />
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-52 bg-primary-200 rounded-xl animate-pulse"
              style={{ borderLeft: "3px solid rgba(184,147,106,0.25)" }} />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold text-text-primary">
            {t("patients_title")}
          </h1>
          <p className="text-text-secondary mt-2">
            {t("patients_subtitle")}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => { setFormError(""); setShowModal(true); }}
          className="w-full md:w-auto bg-[#7a5c35] hover:bg-[#5c4527] text-white tracking-wide"
        >
          {t("patients_add")}
        </Button>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Search — always full width */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#b8936a" }} />
          <input
            type="text"
            placeholder={t("patients_search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg outline-none transition-all text-[#3d2e22] placeholder-[#c0b0a0] bg-[#faf6f0] border border-[#b8936a]/40 focus:border-[#b8936a] focus:ring-2 focus:ring-[#b8936a]/15"
          />
        </div>

        {/* Dropdowns: 2-col on mobile, 3-col row on lg */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
          <select className={filterSelectClass} style={filterSelectStyle} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">{t("patients_all_statuses")}</option>
            {TREATMENT_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select className={filterSelectClass} style={filterSelectStyle} value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
            <option value="">{t("patients_all_severities")}</option>
            {SEVERITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select className={`${filterSelectClass} col-span-2 lg:col-span-1`} style={filterSelectStyle} value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
            <option value="created_at">{t("patients_sort_date")}</option>
            <option value="name">{t("patients_sort_name")}</option>
            <option value="last_visit_date">{t("patients_sort_visit")}</option>
            <option value="severity">{t("patients_sort_severity")}</option>
          </select>
        </div>
      </div>

      {/* Patient Cards Grid or Empty State */}
      {filteredPatients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
            style={{ background: "#f0e8d8" }}>
            <Users size={28} style={{ color: "#b8936a", opacity: 0.6 }} />
          </div>
          <h3 className="text-xl font-serif font-semibold text-text-primary mb-1">{t("patients_empty")}</h3>
          <p className="text-sm text-text-muted mb-6 max-w-xs">{t("patients_empty_sub")}</p>
          <Button
            variant="primary"
            onClick={() => { setFormError(""); setShowModal(true); }}
            className="bg-[#7a5c35] hover:bg-[#5c4527] text-white tracking-wide"
          >
            {t("patients_add")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredPatients.map((patient) => {
            const initials = (() => {
              const parts = (patient.name || "").trim().split(/\s+/).filter(Boolean);
              if (parts.length === 0) return "?";
              if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
              return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
            })();
            return (
              <Link key={patient.id} href={`/dashboard/patients/${patient.id}`} className="block group">
                <div
                  className="relative flex flex-col h-full rounded-xl bg-[#faf8f4] overflow-hidden transition-all duration-200 shadow-[0_1px_4px_rgba(90,60,20,0.05)] group-hover:shadow-[0_8px_24px_rgba(90,60,20,0.13)] group-hover:-translate-y-0.5"
                  style={{ border: "1px solid rgba(184,147,106,0.2)" }}
                >
                  {/* Left accent border */}
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#b8936a] group-hover:bg-[#2d4a3e] transition-colors duration-200" />

                  {/* Overflow/delete button — hidden until hover */}
                  <button
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1.5 rounded-full hover:bg-red-50 z-10"
                    style={{ color: "#c0b0a0" }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPatientToDelete(patient); }}
                    title="Remove patient"
                  >
                    <MoreHorizontal size={15} />
                  </button>

                  <div className="flex flex-col flex-1 pl-5 pr-4 pt-4 pb-4 gap-3">
                    {/* Top: Avatar + Name + ID */}
                    <div className="flex items-start gap-3 pr-6">
                      <div
                        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm select-none"
                        style={{ background: "#b8936a" }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="font-serif font-bold text-[#2d1f14] text-xl leading-tight truncate capitalize"
                          title={patient.name}
                        >
                          {patient.name}
                        </p>
                        {patient.patient_display_id && (
                          <p className="text-xs mt-0.5" style={{ color: "#a09080" }}>
                            {patient.patient_display_id}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Middle: Age/Gender + Chief Complaint */}
                    <div className="space-y-1.5">
                      {(patient.age || patient.gender) && (
                        <p className="text-sm" style={{ color: "#6b5544" }}>
                          {patient.age ? `${patient.age} yrs` : ""}
                          {patient.age && patient.gender ? " · " : ""}
                          {patient.gender
                            ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)
                            : ""}
                        </p>
                      )}
                      {patient.current_diagnosis && (
                        <p className="text-sm" style={{ color: "#8a7060" }}>
                          <span className="font-medium" style={{ color: "#5c4030" }}>
                            Classification:
                          </span>{" "}
                          {patient.current_diagnosis}
                        </p>
                      )}
                      {patient.chief_complaint && (
                        <p className="text-sm line-clamp-2" style={{ color: "#8a7060" }}>
                          <span className="font-medium" style={{ color: "#5c4030" }}>
                            {t("patients_chief_complaint")}
                          </span>{" "}
                          {patient.chief_complaint}
                        </p>
                      )}
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Divider */}
                    <div style={{ borderTop: "1px solid rgba(184,147,106,0.15)" }} />

                    {/* Bottom: Badges + Visit info */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {patient.treatment_status && (
                          <Badge className={TREATMENT_STATUS_COLORS[patient.treatment_status] || ""}>
                            {TREATMENT_STATUS_OPTIONS.find((o) => o.value === patient.treatment_status)?.label || patient.treatment_status}
                          </Badge>
                        )}
                        {patient.severity && (
                          <Badge className={SEVERITY_COLORS[patient.severity] || ""}>
                            {SEVERITY_OPTIONS.find((o) => o.value === patient.severity)?.label || patient.severity}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs" style={{ color: "#a09080" }}>
                          {patient.last_visit_date
                            ? new Date(patient.last_visit_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                            : t("patients_last_visit") + " N/A"}
                        </p>
                        <p className="text-xs" style={{ color: "#b8a090" }}>
                          {patient.total_visits ?? 0} {t("patients_visits")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!patientToDelete}
        onClose={() => setPatientToDelete(null)}
        title="Remove Patient"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPatientToDelete(null)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleUnlinkPatient}
              loading={deleteLoading}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="text-text-secondary">
          Remove <span className="font-semibold text-text-primary">{patientToDelete?.name}</span>? This will unlink them from your clinic.
        </p>
      </Modal>

      {/* Add Patient Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={t("patients_modal_title")}
        size="xl"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              disabled={submitting}
            >
              {t("common_cancel")}
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={submitting}
            >
              {t("patients_save")}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t("patients_form_name")}
              name="name"
              placeholder="Patient full name"
              value={form.name}
              onChange={handleFormChange}
              required
            />
            <Input
              label={t("patients_form_age")}
              name="age"
              type="number"
              placeholder="Age"
              value={form.age}
              onChange={handleFormChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-text-primary mb-2">
                {t("patients_form_gender")}
              </label>
              <select
                name="gender"
                className={selectClass}
                value={form.gender}
                onChange={handleFormChange}
                required
              >
                <option value="">{t("patients_form_gender_placeholder")}</option>
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label={t("patients_form_phone")}
              name="phone"
              type="tel"
              placeholder="Phone number"
              maxLength={15}
              value={form.phone}
              onChange={handleFormChange}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t("patients_form_email")}
              name="email"
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={handleFormChange}
            />
            <div className="w-full">
              <label className="block text-sm font-medium text-text-primary mb-2">
                {t("patients_form_blood_group")}
              </label>
              <select
                name="blood_group"
                className={selectClass}
                value={form.blood_group}
                onChange={handleFormChange}
              >
                <option value="">{t("patients_form_blood_group_placeholder")}</option>
                {BLOOD_GROUP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-text-primary mb-2">
                {t("patients_form_fitzpatrick")}
              </label>
              <select
                name="fitzpatrick_type"
                className={selectClass}
                value={form.fitzpatrick_type}
                onChange={handleFormChange}
              >
                <option value="">{t("patients_form_fitzpatrick_placeholder")}</option>
                {FITZPATRICK_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label={t("patients_form_chief_complaint")}
              name="chief_complaint"
              placeholder={t("patients_form_chief_complaint_placeholder")}
              value={form.chief_complaint}
              onChange={handleFormChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t("patients_form_city")}
              name="city"
              placeholder="City"
              value={form.city}
              onChange={handleFormChange}
            />
            <Input
              label={t("patients_form_state")}
              name="state"
              placeholder="State"
              value={form.state}
              onChange={handleFormChange}
            />
          </div>

          <Input
            label={t("patients_form_allergies")}
            name="allergies"
            placeholder={t("patients_form_allergies_placeholder")}
            value={form.allergies}
            onChange={handleFormChange}
            helpText={t("patients_form_allergies_help")}
          />

          <Input
            label={t("patients_form_chronic")}
            name="chronic_conditions"
            placeholder={t("patients_form_chronic_placeholder")}
            value={form.chronic_conditions}
            onChange={handleFormChange}
            helpText={t("patients_form_allergies_help")}
          />

          <Textarea
            label={t("patients_form_family")}
            name="family_history"
            placeholder={t("patients_form_family_placeholder")}
            value={form.family_history}
            onChange={handleFormChange}
            rows={3}
          />
        </form>
      </Modal>
    </main>
  );
}
