"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import type { Patient } from "@/lib/types";
import { useLanguage } from "@/lib/language-context";
import { useRefetchOnFocus } from "@/lib/useRefetchOnFocus";
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
  const [patients, setPatients] = useState<PatientWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);

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
    fetchPatients();
  }, [fetchPatients]);

  useRefetchOnFocus(useCallback(() => { fetchPatients(true); }, [fetchPatients]));

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

  const selectClass =
    "w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors";

  if (loading) {
    return (
      <main className="space-y-8">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-primary-200 rounded w-1/3" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-primary-200 rounded-lg" />
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
        <Button variant="primary" onClick={() => { setFormError(""); setShowModal(true); }}>
          {t("patients_add")}
        </Button>
      </div>

      {/* Search + Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Input
          placeholder={t("patients_search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className={selectClass}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">{t("patients_all_statuses")}</option>
          {TREATMENT_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
        >
          <option value="">{t("patients_all_severities")}</option>
          {SEVERITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
        >
          <option value="created_at">{t("patients_sort_date")}</option>
          <option value="name">{t("patients_sort_name")}</option>
          <option value="last_visit_date">{t("patients_sort_visit")}</option>
          <option value="severity">{t("patients_sort_severity")}</option>
        </select>
      </div>

      {/* Patient Cards Grid or Empty State */}
      {filteredPatients.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <p className="text-lg">{t("patients_empty")}</p>
          <p className="text-sm mt-2">{t("patients_empty_sub")}</p>
          <Button
            variant="primary"
            className="mt-6"
            onClick={() => { setFormError(""); setShowModal(true); }}
          >
            {t("patients_add")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPatients.map((patient) => (
            <Link
              key={patient.id}
              href={`/dashboard/patients/${patient.id}`}
              className="block"
            >
              <Card hover>
                <CardBody>
                  <div className="space-y-3">
                    {/* Name + ID */}
                    <div>
                      <p className="font-bold text-text-primary text-lg">
                        {patient.name}
                      </p>
                      {patient.patient_display_id && (
                        <p className="text-sm text-text-muted">
                          {patient.patient_display_id}
                        </p>
                      )}
                    </div>

                    {/* Age, Gender */}
                    <p className="text-sm text-text-secondary">
                      {patient.age ? `${patient.age} yrs` : ""}
                      {patient.age && patient.gender ? " / " : ""}
                      {patient.gender
                        ? patient.gender.charAt(0).toUpperCase() +
                          patient.gender.slice(1)
                        : ""}
                    </p>

                    {/* Chief Complaint */}
                    {patient.chief_complaint && (
                      <p className="text-sm text-text-secondary">
                        <span className="font-medium text-text-primary">
                          {t("patients_chief_complaint")}
                        </span>{" "}
                        {patient.chief_complaint}
                      </p>
                    )}

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                      {patient.treatment_status && (
                        <Badge
                          className={
                            TREATMENT_STATUS_COLORS[
                              patient.treatment_status
                            ] || ""
                          }
                        >
                          {TREATMENT_STATUS_OPTIONS.find(
                            (o) => o.value === patient.treatment_status
                          )?.label || patient.treatment_status}
                        </Badge>
                      )}
                      {patient.severity && (
                        <Badge
                          className={
                            SEVERITY_COLORS[patient.severity] || ""
                          }
                        >
                          {SEVERITY_OPTIONS.find(
                            (o) => o.value === patient.severity
                          )?.label || patient.severity}
                        </Badge>
                      )}
                    </div>

                    {/* Last Visit + Total Visits */}
                    <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-primary-100">
                      <span>
                        {t("patients_last_visit")}{" "}
                        {patient.last_visit_date
                          ? new Date(
                              patient.last_visit_date
                            ).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "N/A"}
                      </span>
                      <span>
                        {t("patients_visits")} {patient.total_visits ?? 0}
                      </span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}

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
