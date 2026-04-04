"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import type { PrescriptionTemplate, Prescription, Medicine, Patient } from "@/lib/types";
import { useLanguage } from "@/lib/language-context";
import { useRefreshTick } from "@/lib/RefreshContext";
import { Badge } from "@/components/ui/Badge";
import { format } from "date-fns";
import { Pencil, PenLine, X } from "lucide-react";
import {
  COMMON_MEDICINES,
  FREQUENCY_OPTIONS,
  MEDICATION_CATEGORY_OPTIONS,
} from "@/lib/constants";

/* ------------------------------------------------------------------ */
/*  Template edit form (kept from original)                           */
/* ------------------------------------------------------------------ */

interface TemplateForm {
  name: string;
  condition: string;
  condition_display: string;
  category: string;
  medicines_text: string;
  special_instructions: string;
  follow_up_days: string;
}

const emptyTemplateForm: TemplateForm = {
  name: "",
  condition: "",
  condition_display: "",
  category: "fungal",
  medicines_text: "",
  special_instructions: "",
  follow_up_days: "",
};

function medicinesToText(medicines: Medicine[]): string {
  return medicines
    .map((m) => [m.name, m.dosage, m.frequency, m.duration].filter(Boolean).join(", "))
    .join("\n");
}

function textToMedicines(text: string): Medicine[] {
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(",").map((s) => s.trim());
      return {
        name: parts[0] || line,
        dosage: parts[1] || "",
        frequency: parts[2] || "",
        duration: parts[3] || "",
      };
    });
}

/* ------------------------------------------------------------------ */
/*  Prescription form medicine row                                    */
/* ------------------------------------------------------------------ */

interface MedicineRow {
  name: string;
  category: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const emptyMedicineRow: MedicineRow = {
  name: "",
  category: "oral_tablet",
  dosage: "",
  frequency: "once_daily",
  duration: "",
  instructions: "",
};

/* ------------------------------------------------------------------ */
/*  Medicine Autocomplete                                             */
/* ------------------------------------------------------------------ */

function MedicineAutocomplete({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = value.trim()
    ? COMMON_MEDICINES.filter((m) =>
        m.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8)
    : [];

  const showDropdown = open && filtered.length > 0;

  const select = (med: string) => {
    onChange(med);
    setOpen(false);
    setHighlightIdx(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((p) => (p < filtered.length - 1 ? p + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((p) => (p > 0 ? p - 1 : filtered.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIdx >= 0 && highlightIdx < filtered.length) {
        select(filtered[highlightIdx]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        className="w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
        placeholder="Medicine name"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlightIdx(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {showDropdown && (
        <ul className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-surface border border-primary-200 rounded-lg shadow-lg">
          {filtered.map((med, idx) => (
            <li
              key={med}
              className={`px-4 py-2 text-sm cursor-pointer ${
                idx === highlightIdx
                  ? "bg-primary-100 text-primary-700"
                  : "text-text-primary hover:bg-primary-50"
              }`}
              onMouseDown={() => select(med)}
              onMouseEnter={() => setHighlightIdx(idx)}
            >
              {med}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Select helper classes                                             */
/* ------------------------------------------------------------------ */

const selectClasses =
  "w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500";

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */

export default function PrescriptionsPage() {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const refreshTick = useRefreshTick();

  // Data
  const [templates, setTemplates] = useState<PrescriptionTemplate[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // Template edit modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PrescriptionTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState<TemplateForm>(emptyTemplateForm);
  const [templateSaving, setTemplateSaving] = useState(false);

  // View prescription modal
  const [viewRx, setViewRx] = useState<Prescription | null>(null);

  // Create prescription modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [rxDiagnosis, setRxDiagnosis] = useState("");
  const [rxMedicines, setRxMedicines] = useState<MedicineRow[]>([{ ...emptyMedicineRow }]);
  const [rxInstructions, setRxInstructions] = useState("");
  const [rxFollowUpDate, setRxFollowUpDate] = useState("");
  const [rxFollowUpNotes, setRxFollowUpNotes] = useState("");
  const [rxSaving, setRxSaving] = useState(false);

  /* ---- Fetch data ---- */

  const fetchPrescriptions = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("prescriptions")
        .select("*, patients(name, age, gender)")
        .eq("doctor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setPrescriptions((data as Prescription[]) || []);
    } catch (err) {
      console.error("[prescriptions] fetch error:", err);
    }
  }, [user]);

  const fetchAll = useCallback(async (silent?: boolean) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const [templatesRes, , patientsRes] = await Promise.all([
        supabase
          .from("prescription_templates")
          .select("*")
          .or(`is_system.eq.true,doctor_id.eq.${user.id}`)
          .order("usage_count", { ascending: false }),
        fetchPrescriptions(),
        supabase
          .from("patients")
          .select("*")
          .eq("linked_doctor_id", user.id)
          .order("name"),
      ]);
      setTemplates((templatesRes.data as PrescriptionTemplate[]) || []);
      setPatients((patientsRes.data as Patient[]) || []);
    } catch (err) {
      console.error("[prescriptions] initial fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, fetchPrescriptions]);

  useEffect(() => {
    fetchAll(refreshTick > 0);
  }, [fetchAll, refreshTick]);


  // Realtime: sync across devices (requires Supabase Realtime enabled for prescriptions table)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("prescriptions-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "prescriptions", filter: `doctor_id=eq.${user.id}` }, () => { fetchAll(true); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchAll]);

  /* ---- Template CRUD ---- */

  const openTemplateCreate = () => {
    setEditingTemplate(null);
    setTemplateForm(emptyTemplateForm);
    setShowTemplateModal(true);
  };

  const openTemplateEdit = (template: PrescriptionTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      condition: template.condition_display || template.condition,
      condition_display: template.condition_display,
      category: template.category,
      medicines_text: medicinesToText(template.medicines),
      special_instructions: template.special_instructions || "",
      follow_up_days: template.follow_up_days?.toString() || "",
    });
    setShowTemplateModal(true);
  };

  const closeTemplateModal = () => {
    setShowTemplateModal(false);
    setEditingTemplate(null);
    setTemplateForm(emptyTemplateForm);
  };

  const handleTemplateSave = async () => {
    if (!user || !templateForm.name || !templateForm.condition) return;
    setTemplateSaving(true);

    try {
      const medicines = textToMedicines(templateForm.medicines_text);
      const templateData = {
        name: templateForm.name,
        condition: templateForm.condition.toLowerCase().replace(/\s+/g, "_"),
        condition_display: templateForm.condition,
        category: templateForm.category,
        medicines,
        special_instructions: templateForm.special_instructions || null,
        follow_up_days: templateForm.follow_up_days
          ? parseInt(templateForm.follow_up_days)
          : null,
        doctor_id: user.id,
        is_system: false,
      };

      if (editingTemplate && !editingTemplate.is_system) {
        const { data, error } = await supabase
          .from("prescription_templates")
          .update(templateData)
          .eq("id", editingTemplate.id)
          .eq("doctor_id", user.id)
          .select()
          .maybeSingle();

        if (error) console.error("[prescriptions] update error:", error);
        if (data) {
          setTemplates((prev) =>
            prev.map((t) =>
              t.id === editingTemplate.id ? (data as PrescriptionTemplate) : t
            )
          );
        }
      } else {
        const res = await fetch("/api/template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(templateData),
        });
        const body = await res.json().catch(() => ({}));

        if (!res.ok) {
          console.error("[prescriptions] save template API error:", body);
        } else if (body.data) {
          setTemplates((prev) => [body.data as PrescriptionTemplate, ...prev]);
        }
      }
    } catch (err) {
      console.error("[prescriptions] handleTemplateSave error:", err);
    } finally {
      closeTemplateModal();
      setTemplateSaving(false);
    }
  };

  /* ---- Create Prescription ---- */

  const openCreatePrescription = () => {
    setCreateStep(1);
    setSelectedPatientId("");
    setPatientSearch("");
    setSelectedTemplateId(null);
    setRxDiagnosis("");
    setRxMedicines([{ ...emptyMedicineRow }]);
    setRxInstructions("");
    setRxFollowUpDate("");
    setRxFollowUpNotes("");
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateStep(1);
  };

  const applyTemplate = (template: PrescriptionTemplate) => {
    setSelectedTemplateId(template.id);
    setRxDiagnosis(template.condition_display || template.condition);
    setRxMedicines(
      template.medicines.map((m) => ({
        name: m.name,
        category: "oral_tablet",
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions || "",
      }))
    );
    setRxInstructions(template.special_instructions || "");
    if (template.follow_up_days) {
      const d = new Date();
      d.setDate(d.getDate() + template.follow_up_days);
      setRxFollowUpDate(format(d, "yyyy-MM-dd"));
    }
    setCreateStep(3);
  };

  const updateMedicine = (idx: number, field: keyof MedicineRow, value: string) => {
    setRxMedicines((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m))
    );
  };

  const addMedicineRow = () => {
    setRxMedicines((prev) => [...prev, { ...emptyMedicineRow }]);
  };

  const removeMedicineRow = (idx: number) => {
    setRxMedicines((prev) => prev.filter((_, i) => i !== idx));
  };

  const savePrescription = async () => {
    if (!user || !selectedPatientId || !rxDiagnosis) return;
    setRxSaving(true);

    try {
      const medicines: Medicine[] = rxMedicines
        .filter((m) => m.name.trim())
        .map((m) => ({
          name: m.name,
          dosage: m.dosage,
          frequency:
            FREQUENCY_OPTIONS.find((f) => f.value === m.frequency)?.label ||
            m.frequency,
          duration: m.duration,
          instructions: m.instructions || undefined,
        }));

      const { error } = await supabase.from("prescriptions").insert({
        doctor_id: user.id,
        patient_id: selectedPatientId,
        diagnosis: rxDiagnosis,
        medicines,
        special_instructions: rxInstructions || null,
        follow_up_date: rxFollowUpDate || null,
        follow_up_notes: rxFollowUpNotes || null,
        status: "active",
        template_id: selectedTemplateId || null,
      });

      if (error) {
        console.error("[prescriptions] insert error:", error);
        return;
      }

      await fetchPrescriptions();
      closeCreateModal();
    } catch (err) {
      console.error("[prescriptions] savePrescription error:", err);
    } finally {
      setRxSaving(false);
    }
  };

  /* ---- Filtered patients for search ---- */

  const filteredPatients = patientSearch.trim()
    ? patients.filter((p) =>
        p.name.toLowerCase().includes(patientSearch.toLowerCase())
      )
    : patients;

  /* ---- Loading skeleton ---- */

  if (loading) {
    return (
      <main className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-10 bg-primary-200 rounded w-40 animate-pulse" />
            <div className="h-4 bg-primary-100 rounded w-56 animate-pulse" />
          </div>
          <div className="h-10 w-44 bg-primary-200 rounded-lg animate-pulse" />
        </div>
        <div className="h-48 bg-primary-200 rounded-xl animate-pulse" />
        <div className="grid md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-56 bg-primary-200 rounded-xl animate-pulse"
              style={{ borderLeft: "3px solid rgba(184,147,106,0.25)" }} />
          ))}
        </div>
      </main>
    );
  }

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  return (
    <main className="space-y-8">
      {/* ---------- Header ---------- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-text-primary">{t("rx_title")}</h1>
          <p className="text-text-secondary mt-2">{t("rx_subtitle")}</p>
        </div>
        <Button className="bg-[#7a5c35] hover:bg-[#5c4527] text-white tracking-wide" onClick={openCreatePrescription}>
          + {t("rx_create_rx")}
        </Button>
      </div>

      {/* ---------- Recent Prescriptions ---------- */}
      <div>
        <div className="flex items-center gap-4 mb-5">
          <h2 className="font-serif font-semibold text-2xl text-text-primary whitespace-nowrap">{t("rx_recent")}</h2>
          <div className="flex-1 h-px" style={{ background: "rgba(184,147,106,0.25)" }} />
        </div>

        {prescriptions.length === 0 ? (
          <p className="text-text-muted text-center py-8">{t("rx_no_prescriptions")}</p>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(184,147,106,0.25)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: "#e8ddd0" }}>
                  <tr>
                    {["Date", "Patient", "Diagnosis", "Medicines", "Status", ""].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left whitespace-nowrap border-b border-[#b8936a]/20"
                        style={{ fontSize: "10px", fontWeight: 600, color: "#8a7060", textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.map((rx, i) => (
                    <tr
                      key={rx.id}
                      className="group cursor-pointer transition-colors hover:bg-[#f0e8d8]"
                      style={{ background: i % 2 === 0 ? "#faf8f4" : "#f4efe6", borderBottom: "1px solid rgba(184,147,106,0.12)" }}
                      onClick={() => setViewRx(rx)}
                    >
                      <td className="py-3.5 pr-4 pl-4 whitespace-nowrap border-l-[3px] border-transparent group-hover:border-[#b8936a] transition-colors" style={{ color: "#5c4030" }}>
                        {format(new Date(rx.created_at), "dd MMM yyyy")}
                      </td>
                      <td className="py-3.5 pr-4 font-medium capitalize" style={{ color: "#2d1f14" }}>
                        {rx.patients?.name || "Unknown"}
                      </td>
                      <td className="py-3.5 pr-4" style={{ color: "#6b5544" }}>{rx.diagnosis}</td>
                      <td className="py-3.5 pr-4 text-center" style={{ color: "#8a7060" }}>{rx.medicines.length}</td>
                      <td className="py-3.5 pr-4">
                        {rx.status === "active" ? (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">Active</span>
                        ) : rx.status === "cancelled" ? (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 capitalize">{rx.status}</span>
                        ) : (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600 capitalize">{rx.status}</span>
                        )}
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="text-[#b8936a] font-medium text-xs inline-flex items-center gap-0.5 group-hover:underline">
                          View <span aria-hidden="true">→</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ---------- Template Library ---------- */}
      <div>
        <div className="flex items-center gap-4 mb-6">
          <h2 className="font-serif font-semibold text-2xl text-text-primary whitespace-nowrap">{t("rx_templates")}</h2>
          <div className="flex-1 h-px" style={{ background: "rgba(184,147,106,0.25)" }} />
          <button
            onClick={openTemplateCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-[#b8936a]/50 text-[#b8936a] hover:bg-[#faf0e4] transition-colors whitespace-nowrap"
          >
            + {t("rx_create_template")}
          </button>
        </div>

        {templates.length === 0 ? (
          <p className="text-text-muted text-center py-8">{t("rx_no_templates")}</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="relative flex flex-col rounded-xl bg-[#faf8f4] overflow-hidden transition-all duration-200 shadow-[0_1px_4px_rgba(90,60,20,0.05)] hover:shadow-[0_6px_20px_rgba(90,60,20,0.11)] hover:-translate-y-0.5"
                style={{ border: "1px solid rgba(184,147,106,0.2)" }}
              >
                {/* Left accent border */}
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#b8936a]" />

                {/* Card header */}
                <div className="pl-5 pr-4 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(184,147,106,0.15)" }}>
                  <h3 className="font-semibold text-[#2d1f14] text-base leading-tight">{template.name}</h3>
                  <div className="flex items-center gap-2">
                    {template.is_system ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[#f0e8d8] text-[#7a5c35]">System</span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium text-[#b8936a]" style={{ background: "rgba(184,147,106,0.12)" }}>Custom</span>
                    )}
                    <button
                      onClick={() => openTemplateEdit(template)}
                      className="p-1.5 rounded-md hover:bg-[#f0e8d8] transition-colors"
                      title="Edit template"
                      style={{ color: "#b8936a" }}
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>

                {/* Card body — medicines */}
                <div className="pl-5 pr-4 py-4 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#8a7060", letterSpacing: "0.12em" }}>Medicines</p>
                  <ul>
                    {template.medicines.map((med, idx) => (
                      <li key={idx}>
                        {idx > 0 && <div className="my-2.5" style={{ borderTop: "1px solid rgba(184,147,106,0.12)" }} />}
                        <p className="font-semibold text-sm" style={{ color: "#2d1f14" }}>{med.name}</p>
                        {(med.dosage || med.frequency || med.duration) && (
                          <p className="text-xs mt-0.5" style={{ color: "#8a7060" }}>
                            {[med.dosage, med.frequency, med.duration].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                  {template.special_instructions && (
                    <div className="pt-3 mt-3" style={{ borderTop: "1px solid rgba(184,147,106,0.15)" }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: "#2d4a3e" }}>{t("rx_special_instructions")}</p>
                      <p className="text-xs" style={{ color: "#8a7060" }}>{template.special_instructions}</p>
                    </div>
                  )}
                </div>

                {/* Card footer */}
                <div className="pl-5 pr-4 py-3 flex items-center justify-between" style={{ borderTop: "1px solid rgba(184,147,106,0.12)", background: "#f4efe6" }}>
                  <p className="text-xs" style={{ color: "#a09080" }}>Used {template.usage_count} times</p>
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f0e8d8] text-[#7a5c35] capitalize">{template.category}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/*  TEMPLATE EDIT/CREATE MODAL                                      */}
      {/* ================================================================ */}

      <Modal
        isOpen={showTemplateModal}
        onClose={closeTemplateModal}
        title={editingTemplate ? t("rx_edit_template") : t("rx_create_new_template")}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={closeTemplateModal}>
              Cancel
            </Button>
            <Button
              className="bg-primary-500 hover:bg-primary-600 text-white"
              onClick={handleTemplateSave}
              loading={templateSaving}
              disabled={!templateForm.name || !templateForm.condition}
            >
              {editingTemplate ? t("rx_save_changes") : t("rx_save_template")}
            </Button>
          </>
        }
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <Input
            label={t("rx_template_name")}
            placeholder="e.g., Tinea Corporis - Standard"
            value={templateForm.name}
            onChange={(e) =>
              setTemplateForm((p) => ({ ...p, name: e.target.value }))
            }
          />
          <Input
            label={t("rx_condition")}
            placeholder="e.g., Tinea Corporis"
            value={templateForm.condition}
            onChange={(e) =>
              setTemplateForm((p) => ({ ...p, condition: e.target.value }))
            }
          />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              {t("rx_category")}
            </label>
            <select
              className={selectClasses}
              value={templateForm.category}
              onChange={(e) =>
                setTemplateForm((p) => ({ ...p, category: e.target.value }))
              }
            >
              <option value="fungal">Fungal</option>
              <option value="bacterial">Bacterial</option>
              <option value="viral">Viral</option>
              <option value="inflammatory">Inflammatory</option>
              <option value="pigmentary">Pigmentary</option>
              <option value="parasitic">Parasitic</option>
              <option value="other">Other</option>
            </select>
          </div>
          <Textarea
            label={t("rx_medicines_label")}
            placeholder={
              "Clotrimazole 1% Cream, Apply thin layer, Twice daily, 4 weeks\nFluconazole 150mg, 1 tablet, Once weekly, 2 weeks"
            }
            value={templateForm.medicines_text}
            onChange={(e) =>
              setTemplateForm((p) => ({
                ...p,
                medicines_text: e.target.value,
              }))
            }
            rows={6}
          />
          <Textarea
            label={t("rx_special_instructions")}
            placeholder={t("rx_special_instructions_placeholder")}
            value={templateForm.special_instructions}
            onChange={(e) =>
              setTemplateForm((p) => ({
                ...p,
                special_instructions: e.target.value,
              }))
            }
            rows={3}
          />
          <Input
            label={t("rx_followup_days")}
            type="number"
            placeholder="e.g., 14"
            value={templateForm.follow_up_days}
            onChange={(e) =>
              setTemplateForm((p) => ({
                ...p,
                follow_up_days: e.target.value,
              }))
            }
          />
        </div>
      </Modal>

      {/* ================================================================ */}
      {/*  VIEW PRESCRIPTION MODAL                                         */}
      {/* ================================================================ */}

      <Modal
        isOpen={!!viewRx}
        onClose={() => setViewRx(null)}
        title={t("rx_details")}
        size="xl"
        footer={
          <Button variant="ghost" onClick={() => setViewRx(null)}>
            Close
          </Button>
        }
      >
        {viewRx && (
          <div className="space-y-6">
            {/* Patient & Date */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-text-primary">
                  {viewRx.patients?.name || t("rx_unknown_patient")}
                </p>
                <p className="text-sm text-text-secondary">
                  {format(new Date(viewRx.created_at), "dd MMM yyyy, hh:mm a")}
                </p>
              </div>
              <Badge
                variant={
                  viewRx.status === "active"
                    ? "success"
                    : viewRx.status === "cancelled"
                    ? "error"
                    : "default"
                }
              >
                {viewRx.status}
              </Badge>
            </div>

            {/* Diagnosis */}
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">
                {t("rx_diagnosis")}
              </p>
              <p className="text-text-primary">{viewRx.diagnosis}</p>
            </div>

            {/* Medicines Table */}
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">
                Medicines
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-primary-200 rounded-lg">
                  <thead>
                    <tr className="bg-primary-50 text-text-secondary">
                      <th className="px-3 py-2 text-left font-medium">Name</th>
                      <th className="px-3 py-2 text-left font-medium">
                        Dosage
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Frequency
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Duration
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Instructions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewRx.medicines.map((med, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-primary-100"
                      >
                        <td className="px-3 py-2 text-text-primary font-medium">
                          {med.name}
                        </td>
                        <td className="px-3 py-2 text-text-secondary">
                          {med.dosage || "-"}
                        </td>
                        <td className="px-3 py-2 text-text-secondary">
                          {med.frequency || "-"}
                        </td>
                        <td className="px-3 py-2 text-text-secondary">
                          {med.duration || "-"}
                        </td>
                        <td className="px-3 py-2 text-text-secondary">
                          {med.instructions || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Special Instructions */}
            {viewRx.special_instructions && (
              <div>
                <p className="text-sm font-medium text-text-secondary mb-1">
                  Special Instructions
                </p>
                <p className="text-text-primary">
                  {viewRx.special_instructions}
                </p>
              </div>
            )}

            {/* Follow-up */}
            {(viewRx.follow_up_date || viewRx.follow_up_notes) && (
              <div className="border-t border-primary-200 pt-4">
                <p className="text-sm font-medium text-text-secondary mb-1">
                  Follow-up
                </p>
                {viewRx.follow_up_date && (
                  <p className="text-text-primary">
                    Date:{" "}
                    {format(new Date(viewRx.follow_up_date), "dd MMM yyyy")}
                  </p>
                )}
                {viewRx.follow_up_notes && (
                  <p className="text-text-secondary text-sm mt-1">
                    {viewRx.follow_up_notes}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ================================================================ */}
      {/*  CREATE PRESCRIPTION MODAL (multi-step)                          */}
      {/* ================================================================ */}

      <Modal
        isOpen={showCreateModal}
        onClose={closeCreateModal}
        title={
          createStep === 1
            ? t("rx_new_rx_select")
            : createStep === 2
            ? t("rx_new_rx_template")
            : t("rx_new_rx_form")
        }
        size="xl"
        footer={
          createStep === 1 ? (
            <>
              <Button variant="ghost" onClick={closeCreateModal}>
                Cancel
              </Button>
              <Button
                className="bg-primary-500 hover:bg-primary-600 text-white"
                disabled={!selectedPatientId}
                onClick={() => setCreateStep(2)}
              >
                Next
              </Button>
            </>
          ) : createStep === 2 ? (
            <>
              <Button variant="ghost" onClick={() => setCreateStep(1)}>
                Back
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setCreateStep(2)}>
                Back
              </Button>
              <Button
                className="bg-primary-500 hover:bg-primary-600 text-white"
                onClick={savePrescription}
                loading={rxSaving}
                disabled={
                  !rxDiagnosis ||
                  rxMedicines.every((m) => !m.name.trim())
                }
              >
                Save Prescription
              </Button>
            </>
          )
        }
      >
        {/* ---- Step 1: Select Patient ---- */}
        {createStep === 1 && (
          <div className="space-y-4">
            <Input
              label="Search Patient"
              placeholder="Type patient name to search..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
            />
            <div className="max-h-72 overflow-y-auto space-y-2">
              {filteredPatients.length === 0 ? (
                <p className="text-text-muted text-center py-6">
                  No patients found.
                </p>
              ) : (
                filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => setSelectedPatientId(patient.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      selectedPatientId === patient.id
                        ? "border-primary-500 bg-primary-50"
                        : "border-primary-200 hover:bg-primary-50"
                    }`}
                  >
                    <p className="font-medium text-text-primary">
                      {patient.name}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {patient.age ? `${patient.age} yrs` : "Age N/A"}
                      {patient.gender ? ` | ${patient.gender}` : ""}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* ---- Step 2: Choose Template or Custom ---- */}
        {createStep === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Select a template to pre-fill or write a custom prescription.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {/* Custom prescription card */}
              <button
                onClick={() => {
                  setSelectedTemplateId(null);
                  setRxDiagnosis("");
                  setRxMedicines([{ ...emptyMedicineRow }]);
                  setRxInstructions("");
                  setRxFollowUpDate("");
                  setRxFollowUpNotes("");
                  setCreateStep(3);
                }}
                className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-primary-200 hover:border-primary-500 hover:bg-primary-50 transition-colors text-center"
              >
                <PenLine size={32} className="text-primary-500 mb-3" />
                <p className="font-semibold text-text-primary">
                  Write Custom Prescription
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Start from scratch
                </p>
              </button>

              {/* Template cards */}
              {templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => applyTemplate(tmpl)}
                  className="text-left p-4 rounded-lg border border-primary-200 hover:border-primary-500 hover:bg-primary-50 transition-colors"
                >
                  <p className="font-semibold text-text-primary mb-1">
                    {tmpl.name}
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default">{tmpl.category}</Badge>
                    <span className="text-xs text-text-muted">
                      {tmpl.medicines.length} medicine
                      {tmpl.medicines.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary line-clamp-2">
                    {tmpl.medicines.map((m) => m.name).join(", ")}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---- Step 3: Prescription Form ---- */}
        {createStep === 3 && (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
            {/* Diagnosis */}
            <Input
              label="Diagnosis"
              placeholder="e.g., Tinea Corporis"
              value={rxDiagnosis}
              onChange={(e) => setRxDiagnosis(e.target.value)}
            />

            {/* Medicines */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-3">
                Medicines
              </label>
              <div className="space-y-4">
                {rxMedicines.map((med, idx) => (
                  <div
                    key={idx}
                    className="relative border border-primary-200 rounded-lg p-4 space-y-3"
                  >
                    {/* Remove button */}
                    {rxMedicines.length > 1 && (
                      <button
                        onClick={() => removeMedicineRow(idx)}
                        className="absolute top-2 right-2 p-1 text-text-muted hover:text-red-500 transition-colors"
                        title="Remove medicine"
                      >
                        <X size={16} />
                      </button>
                    )}

                    <div className="grid sm:grid-cols-2 gap-3">
                      {/* Medicine Name (autocomplete) */}
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Medicine Name
                        </label>
                        <MedicineAutocomplete
                          value={med.name}
                          onChange={(v) => updateMedicine(idx, "name", v)}
                        />
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Category
                        </label>
                        <select
                          className={selectClasses}
                          value={med.category}
                          onChange={(e) =>
                            updateMedicine(idx, "category", e.target.value)
                          }
                        >
                          {MEDICATION_CATEGORY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Dosage */}
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Dosage
                        </label>
                        <input
                          type="text"
                          className={selectClasses}
                          placeholder='e.g., "1 tablet" or "Apply thin layer"'
                          value={med.dosage}
                          onChange={(e) =>
                            updateMedicine(idx, "dosage", e.target.value)
                          }
                        />
                      </div>

                      {/* Frequency */}
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Frequency
                        </label>
                        <select
                          className={selectClasses}
                          value={med.frequency}
                          onChange={(e) =>
                            updateMedicine(idx, "frequency", e.target.value)
                          }
                        >
                          {FREQUENCY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Duration */}
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Duration
                        </label>
                        <input
                          type="text"
                          className={selectClasses}
                          placeholder="e.g., 2 weeks"
                          value={med.duration}
                          onChange={(e) =>
                            updateMedicine(idx, "duration", e.target.value)
                          }
                        />
                      </div>

                      {/* Special Instructions per medicine */}
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Special Instructions
                        </label>
                        <input
                          type="text"
                          className={selectClasses}
                          placeholder="Optional"
                          value={med.instructions}
                          onChange={(e) =>
                            updateMedicine(idx, "instructions", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addMedicineRow}
                  className="text-sm font-medium text-primary-500 hover:text-primary-700 transition-colors"
                >
                  + Add Medicine
                </button>
              </div>
            </div>

            {/* Overall Special Instructions */}
            <Textarea
              label="Special Instructions"
              placeholder="Overall prescription instructions..."
              value={rxInstructions}
              onChange={(e) => setRxInstructions(e.target.value)}
              rows={3}
            />

            {/* Follow-up */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Follow-up Date"
                type="date"
                value={rxFollowUpDate}
                onChange={(e) => setRxFollowUpDate(e.target.value)}
              />
              <Input
                label="Follow-up Notes"
                placeholder="e.g., Check for improvement"
                value={rxFollowUpNotes}
                onChange={(e) => setRxFollowUpNotes(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
