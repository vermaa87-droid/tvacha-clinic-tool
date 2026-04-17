"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  ClipboardList,
  Clock,
  FlaskConical,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import {
  cancelLabOrder,
  createLabOrder,
  fetchLabOrdersForDoctor,
  markReviewed,
  markSampleCollected,
  uploadLabResult,
} from "@/lib/useLabOrders";
import type {
  LabOrder,
  LabOrderStatus,
  LabTestCategory,
  Patient,
} from "@/lib/types";
import type { TranslationKey } from "@/lib/translations";

// ─── helpers ────────────────────────────────────────────────────────────────

const TEST_CATEGORIES: { value: LabTestCategory; label: string }[] = [
  { value: "hematology", label: "Hematology" },
  { value: "biochemistry", label: "Biochemistry" },
  { value: "hormonal", label: "Hormonal" },
  { value: "immunology", label: "Immunology" },
  { value: "microbiology", label: "Microbiology" },
  { value: "histopathology", label: "Histopathology" },
  { value: "serology", label: "Serology" },
  { value: "genetic", label: "Genetic" },
  { value: "imaging", label: "Imaging" },
  { value: "urinalysis", label: "Urinalysis" },
  { value: "other", label: "Other" },
];

function fmtDate(iso: string): string {
  return format(parseISO(iso), "dd MMM yy, h:mm a");
}

// ─── Status badge helpers ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  LabOrderStatus,
  { variant: "default" | "success" | "warning" | "error" | "info"; label_key: TranslationKey }
> = {
  ordered: { variant: "default", label_key: "lab_status_ordered" },
  sample_collected: { variant: "info", label_key: "lab_status_sample_collected" },
  in_progress: { variant: "warning", label_key: "lab_status_in_progress" },
  results_available: { variant: "warning", label_key: "lab_status_results_available" },
  reviewed: { variant: "success", label_key: "lab_status_reviewed" },
  cancelled: { variant: "error", label_key: "lab_status_cancelled" },
};

function StatusBadge({ status, t }: { status: LabOrderStatus; t: (k: TranslationKey) => string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.ordered;
  return <Badge variant={cfg.variant}>{t(cfg.label_key)}</Badge>;
}

const PRIORITY_MAP: Record<"routine" | "urgent" | "stat", { cls: string; key: TranslationKey }> = {
  routine: { cls: "bg-gray-100 text-gray-600", key: "lab_priority_routine" },
  urgent: { cls: "bg-orange-100 text-orange-700", key: "lab_priority_urgent" },
  stat: { cls: "bg-red-100 text-red-700 font-bold", key: "lab_priority_stat" },
};

function PriorityPill({ priority, t }: { priority: "routine" | "urgent" | "stat"; t: (k: TranslationKey) => string }) {
  const cfg = PRIORITY_MAP[priority] ?? PRIORITY_MAP.routine;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.cls}`}>{t(cfg.key)}</span>
  );
}

// ─── New Order Modal ─────────────────────────────────────────────────────────

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string;
  onSaved: () => void;
}

function NewOrderModal({ isOpen, onClose, doctorId, onSaved }: NewOrderModalProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState<Pick<Patient, "id" | "name" | "phone">[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [form, setForm] = useState({
    patient_id: "",
    test_name: "",
    test_category: "hematology" as LabTestCategory,
    priority: "routine" as "routine" | "urgent" | "stat",
    external_lab_name: "",
    external_lab_phone: "",
    fasting_required: false,
    clinical_notes: "",
    patient_instructions: "",
  });

  // Fetch patients for dropdown
  useEffect(() => {
    if (!isOpen || !doctorId) return;
    supabase
      .from("patients")
      .select("id, name, phone")
      .eq("linked_doctor_id", doctorId)
      .order("name")
      .limit(200)
      .then(({ data }) => setPatients((data ?? []) as Pick<Patient, "id" | "name" | "phone">[]));
  }, [isOpen, doctorId]);

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const filteredPatients = patients.filter((p) =>
    !patientSearch || p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    (p.phone ?? "").includes(patientSearch)
  );

  async function handleSave() {
    if (!form.patient_id || !form.test_name.trim()) {
      showToast({ message: "Patient and test name are required." });
      return;
    }
    setSaving(true);
    const { error } = await createLabOrder({
      doctorId,
      patientId: form.patient_id,
      testName: form.test_name.trim(),
      testCategory: form.test_category,
      priority: form.priority,
      externalLabName: form.external_lab_name.trim() || null,
      externalLabPhone: form.external_lab_phone.trim() || null,
      fastingRequired: form.fasting_required,
      clinicalNotes: form.clinical_notes.trim() || null,
      patientInstructions: form.patient_instructions.trim() || null,
    });
    setSaving(false);
    if (error) {
      showToast({ message: t("lab_toast_error") });
      return;
    }
    showToast({ message: t("lab_toast_created") });
    onSaved();
    onClose();
  }

  const inputCls =
    "w-full rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary-400 placeholder:text-text-secondary";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("lab_modal_new_title")} size="lg">
      <div className="space-y-4">
        {/* Patient */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">{t("lab_field_patient")}</label>
          <input
            className={inputCls}
            placeholder="Search patient name or phone…"
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
          />
          {patientSearch && (
            <div className="mt-1 border border-primary-200 rounded-lg max-h-40 overflow-y-auto bg-primary-50 shadow">
              {filteredPatients.slice(0, 8).map((p) => (
                <button
                  key={p.id}
                  onClick={() => { set("patient_id", p.id); setPatientSearch(p.name); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-primary-100 flex justify-between"
                >
                  <span className="font-medium text-text-primary">{p.name}</span>
                  {p.phone && <span className="text-text-secondary text-xs">{p.phone}</span>}
                </button>
              ))}
              {filteredPatients.length === 0 && (
                <p className="px-3 py-2 text-sm text-text-secondary">No patients found</p>
              )}
            </div>
          )}
          {form.patient_id && !patientSearch.includes(" ") && (
            <p className="text-xs text-primary-600 mt-1">
              ✓ Patient selected: {patients.find((p) => p.id === form.patient_id)?.name}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("lab_field_test_name")}</label>
            <input
              className={inputCls}
              placeholder="e.g. CBC, LFT, KFT, HbA1c, Thyroid Profile…"
              value={form.test_name}
              onChange={(e) => set("test_name", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("lab_field_category")}</label>
            <select className={inputCls} value={form.test_category} onChange={(e) => set("test_category", e.target.value)}>
              {TEST_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("lab_field_priority")}</label>
            <select className={inputCls} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
              <option value="routine">{t("lab_priority_routine")}</option>
              <option value="urgent">{t("lab_priority_urgent")}</option>
              <option value="stat">{t("lab_priority_stat")}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("lab_field_lab_name")}</label>
            <input className={inputCls} placeholder="e.g. SRL Diagnostics" value={form.external_lab_name} onChange={(e) => set("external_lab_name", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("lab_field_lab_phone")}</label>
            <input className={inputCls} value={form.external_lab_phone} onChange={(e) => set("external_lab_phone", e.target.value)} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="fasting"
            type="checkbox"
            checked={form.fasting_required}
            onChange={(e) => set("fasting_required", e.target.checked)}
            className="accent-primary-500"
          />
          <label htmlFor="fasting" className="text-sm text-text-secondary">{t("lab_field_fasting")}</label>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">{t("lab_field_notes")}</label>
          <textarea className={inputCls} rows={2} value={form.clinical_notes} onChange={(e) => set("clinical_notes", e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">{t("lab_field_instructions")}</label>
          <textarea className={inputCls} rows={2} placeholder="Instructions for the patient before the test…" value={form.patient_instructions} onChange={(e) => set("patient_instructions", e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" size="sm" onClick={onClose}>{t("lab_btn_cancel")}</Button>
        <Button size="sm" loading={saving} onClick={handleSave}>{t("lab_btn_save")}</Button>
      </div>
    </Modal>
  );
}

// ─── Upload Results Modal ────────────────────────────────────────────────────

interface UploadResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: LabOrder | null;
  onSaved: () => void;
}

function UploadResultsModal({ isOpen, onClose, order, onSaved }: UploadResultsModalProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [resultSummary, setResultSummary] = useState("");
  const [isAbnormal, setIsAbnormal] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
      setResultSummary("");
      setIsAbnormal(false);
      setFile(null);
    }
  }, [isOpen]);

  async function handleSubmit() {
    if (!order) return;
    setSaving(true);
    const { error } = file
      ? await uploadLabResult({
          orderId: order.id,
          patientId: order.patient_id,
          file,
          isAbnormal,
          resultSummary: resultSummary.trim() || null,
        })
      : await (async () => {
          // No file — just update status + summary
          const { error: e } = await supabase
            .from("lab_orders")
            .update({
              status: "results_available",
              is_abnormal: isAbnormal,
              result_summary: resultSummary.trim() || null,
            })
            .eq("id", order.id);
          return { error: e };
        })();
    setSaving(false);
    if (error) {
      showToast({ message: t("lab_toast_error") });
      return;
    }
    showToast({ message: t("lab_toast_updated") });
    onSaved();
    onClose();
  }

  const inputCls =
    "w-full rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary-400 placeholder:text-text-secondary";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("lab_modal_results_title")} size="md">
      {order && (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-primary-100">
            <p className="text-sm font-medium text-text-primary">{order.test_name}</p>
            <p className="text-xs text-text-secondary">{order.patients?.name ?? "—"}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("lab_field_result_summary")}</label>
            <textarea
              className={inputCls}
              rows={3}
              placeholder="Brief interpretation of results…"
              value={resultSummary}
              onChange={(e) => setResultSummary(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="abnormal"
              type="checkbox"
              checked={isAbnormal}
              onChange={(e) => setIsAbnormal(e.target.checked)}
              className="accent-red-500"
            />
            <label htmlFor="abnormal" className="text-sm text-text-secondary">{t("lab_field_is_abnormal")}</label>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("lab_field_result_file")}</label>
            <div
              className="border-2 border-dashed border-primary-200 rounded-lg p-4 text-center cursor-pointer hover:border-primary-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm text-text-primary">
                  <CheckCircle size={16} className="text-green-500" />
                  {file.name}
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="ml-2 text-text-secondary hover:text-text-primary"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-text-secondary">
                  <Upload size={20} />
                  <p className="text-sm">Click to upload PDF or image</p>
                  <p className="text-xs">Optional — you can add a summary without a file</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" size="sm" onClick={onClose}>{t("lab_btn_cancel")}</Button>
        <Button size="sm" loading={saving} onClick={handleSubmit}>{t("lab_btn_submit_results")}</Button>
      </div>
    </Modal>
  );
}

// ─── Review Modal ────────────────────────────────────────────────────────────

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: LabOrder | null;
  onSaved: () => void;
}

function ReviewModal({ isOpen, onClose, order, onSaved }: ReviewModalProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !order?.result_pdf_url) { setSignedUrl(null); return; }
    supabase.storage
      .from("lab-results")
      .createSignedUrl(order.result_pdf_url, 3600)
      .then(({ data }) => setSignedUrl(data?.signedUrl ?? null));
  }, [isOpen, order?.result_pdf_url]);

  useEffect(() => {
    if (isOpen) setReviewNotes(order?.doctor_review_notes ?? "");
  }, [isOpen, order]);

  async function handleReview() {
    if (!order) return;
    setSaving(true);
    const { error } = await markReviewed(order.id, reviewNotes.trim() || null);
    setSaving(false);
    if (error) {
      showToast({ message: t("lab_toast_error") });
      return;
    }
    showToast({ message: t("lab_toast_updated") });
    onSaved();
    onClose();
  }

  const inputCls =
    "w-full rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary-400 placeholder:text-text-secondary";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("lab_modal_review_title")} size="md">
      {order && (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-primary-100 space-y-1">
            <p className="text-sm font-medium text-text-primary">{order.test_name}</p>
            <p className="text-xs text-text-secondary">{order.patients?.name ?? "—"}</p>
            {order.is_abnormal && (
              <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                <AlertCircle size={12} /> {t("lab_badge_abnormal")}
              </span>
            )}
          </div>

          {order.result_summary && (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <p className="text-xs font-semibold text-yellow-700 mb-1">Result Summary</p>
              <p className="text-sm text-text-primary">{order.result_summary}</p>
            </div>
          )}

          {signedUrl && (
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800 font-medium"
            >
              <Upload size={14} /> View uploaded result
            </a>
          )}

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("lab_field_review_notes")}</label>
            <textarea
              className={inputCls}
              rows={3}
              placeholder="Your clinical interpretation and action plan…"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" size="sm" onClick={onClose}>{t("lab_btn_cancel")}</Button>
        <Button size="sm" loading={saving} onClick={handleReview}>{t("lab_btn_mark_reviewed")}</Button>
      </div>
    </Modal>
  );
}

// ─── Order Row ───────────────────────────────────────────────────────────────

interface OrderRowProps {
  order: LabOrder;
  onSampleCollect: (o: LabOrder) => void;
  onUploadResults: (o: LabOrder) => void;
  onReview: (o: LabOrder) => void;
  onCancel: (o: LabOrder) => void;
  onDelete: (o: LabOrder) => void;
  t: (k: TranslationKey) => string;
}

function OrderRow({ order, onSampleCollect, onUploadResults, onReview, onCancel, onDelete, t }: OrderRowProps) {
  const canSample = order.status === "ordered";
  const canUpload = order.status === "ordered" || order.status === "sample_collected" || order.status === "in_progress";
  const canReview = order.status === "results_available";
  const canCancel = order.status !== "cancelled" && order.status !== "reviewed";
  const canDelete = order.status === "ordered";

  return (
    <tr className="hover:bg-primary-50 transition-colors">
      <td className="px-4 py-3">
        <p className="font-medium text-text-primary text-sm">{order.patients?.name ?? "—"}</p>
        {order.patients?.phone && (
          <p className="text-xs text-text-secondary">{order.patients.phone}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <p className="font-medium text-text-primary text-sm">{order.test_name}</p>
        {order.external_lab_name && (
          <p className="text-xs text-text-secondary">@ {order.external_lab_name}</p>
        )}
        {order.fasting_required && (
          <span className="text-xs text-orange-600 font-medium">{t("lab_badge_fasting")}</span>
        )}
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-xs text-text-secondary capitalize">{order.test_category}</span>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <PriorityPill priority={order.priority} t={t} />
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          <StatusBadge status={order.status} t={t} />
          {order.is_abnormal && (
            <div>
              <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertCircle size={10} /> {t("lab_badge_abnormal")}
              </span>
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <p className="text-xs text-text-secondary">{fmtDate(order.ordered_at)}</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end flex-wrap">
          {canSample && (
            <button
              onClick={() => onSampleCollect(order)}
              className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors whitespace-nowrap"
            >
              {t("lab_action_sample")}
            </button>
          )}
          {canUpload && (
            <button
              onClick={() => onUploadResults(order)}
              className="text-xs px-2 py-1 rounded bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors whitespace-nowrap"
            >
              {t("lab_action_results")}
            </button>
          )}
          {canReview && (
            <button
              onClick={() => onReview(order)}
              className="text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors font-semibold whitespace-nowrap"
            >
              {t("lab_action_review")}
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => onCancel(order)}
              className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 transition-colors whitespace-nowrap"
            >
              {t("lab_action_cancel")}
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(order)}
              className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete order"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

type FilterMode = "all" | "pending" | "abnormal";

export default function LabOrdersPage() {
  const { doctor } = useAuthStore();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<LabOrder | null>(null);
  const [reviewTarget, setReviewTarget] = useState<LabOrder | null>(null);

  const doctorId = doctor?.id ?? "";

  const fetchOrders = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    const data = await fetchLabOrdersForDoctor(doctorId);
    setOrders(data);
    setLoading(false);
  }, [doctorId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ── Filtering ──
  const displayed = orders.filter((o) => {
    if (filter === "pending" && o.status !== "results_available") return false;
    if (filter === "abnormal" && !o.is_abnormal) return false;
    const q = search.trim().toLowerCase();
    if (q) {
      const matchName = (o.patients?.name ?? "").toLowerCase().includes(q);
      const matchTest = o.test_name.toLowerCase().includes(q);
      if (!matchName && !matchTest) return false;
    }
    return true;
  });

  // ── Stats ──
  const pendingCount = orders.filter((o) => o.status === "results_available").length;
  const abnormalCount = orders.filter((o) => o.is_abnormal).length;
  const activeCount = orders.filter((o) => !["reviewed", "cancelled"].includes(o.status)).length;

  async function handleSampleCollect(order: LabOrder) {
    const { error } = await markSampleCollected(order.id);
    if (error) { showToast({ message: t("lab_toast_error") }); return; }
    showToast({ message: t("lab_toast_updated") });
    fetchOrders();
  }

  async function handleCancel(order: LabOrder) {
    if (!confirm(`Cancel lab order for "${order.test_name}"?`)) return;
    const { error } = await cancelLabOrder(order.id);
    if (error) { showToast({ message: t("lab_toast_error") }); return; }
    showToast({ message: t("lab_toast_updated") });
    fetchOrders();
  }

  async function handleDelete(order: LabOrder) {
    if (!confirm(`Permanently delete this lab order for "${order.test_name}"? This cannot be undone.`)) return;
    const prev = orders;
    setOrders((list) => list.filter((o) => o.id !== order.id));
    const { error } = await supabase
      .from("lab_orders")
      .delete()
      .eq("id", order.id);
    if (error) {
      setOrders(prev);
      showToast({ message: t("lab_toast_error") });
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t("lab_title")}</h1>
          <p className="text-text-secondary text-sm mt-0.5">{t("lab_subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrders}
            className="p-2 rounded-lg border border-primary-200 text-text-secondary hover:text-text-primary hover:bg-primary-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus size={16} className="mr-1" />
            {t("lab_new_order")}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardBody className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList size={16} className="text-text-secondary" />
              <p className="text-xs text-text-secondary">Active Orders</p>
            </div>
            <p className="text-2xl font-bold text-text-primary">{activeCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-orange-500" />
              <p className="text-xs text-text-secondary">Pending Review</p>
            </div>
            <p className={`text-2xl font-bold ${pendingCount > 0 ? "text-orange-500" : "text-text-primary"}`}>
              {pendingCount}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={16} className="text-red-500" />
              <p className="text-xs text-text-secondary">Abnormal</p>
            </div>
            <p className={`text-2xl font-bold ${abnormalCount > 0 ? "text-red-500" : "text-text-primary"}`}>
              {abnormalCount}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Pending review banner */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm">
          <Clock size={16} className="shrink-0" />
          {t("lab_pending_review_count").replace("{n}", String(pendingCount))}
          <button
            onClick={() => setFilter("pending")}
            className="ml-auto text-xs font-semibold hover:underline"
          >
            View →
          </button>
        </div>
      )}

      {/* Filter tabs + search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1">
          {(["all", "pending", "abnormal"] as FilterMode[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-primary-500 text-white"
                  : "bg-primary-100 text-text-secondary hover:bg-primary-200"
              }`}
            >
              {f === "all" ? t("lab_filter_all") : f === "pending" ? t("lab_filter_pending") : t("lab_filter_abnormal")}
              {f === "pending" && pendingCount > 0 && (
                <span className="ml-1 text-xs bg-orange-500 text-white rounded-full px-1.5">
                  {pendingCount}
                </span>
              )}
              {f === "abnormal" && abnormalCount > 0 && (
                <span className="ml-1 text-xs bg-red-500 text-white rounded-full px-1.5">
                  {abnormalCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-primary-200 bg-primary-50 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary-400"
            placeholder={t("lab_search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardBody className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-text-secondary">
              <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mr-3" />
              {t("common_loading")}
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
              <FlaskConical size={40} className="mb-3 opacity-30" />
              <p className="text-sm">{filter !== "all" || search ? t("lab_empty_filtered") : t("lab_empty")}</p>
              {filter === "all" && !search && (
                <button
                  onClick={() => setShowNew(true)}
                  className="mt-3 text-sm text-primary-600 hover:text-primary-800 font-medium"
                >
                  + {t("lab_new_order")}
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-200 bg-primary-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">{t("lab_col_patient")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">{t("lab_col_test")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide hidden md:table-cell">{t("lab_col_category")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide hidden sm:table-cell">{t("lab_col_priority")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">{t("lab_col_status")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide hidden lg:table-cell">{t("lab_col_ordered")}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">{t("lab_col_actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100">
                {displayed.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onSampleCollect={handleSampleCollect}
                    onUploadResults={(o) => setUploadTarget(o)}
                    onReview={(o) => setReviewTarget(o)}
                    onCancel={handleCancel}
                    onDelete={handleDelete}
                    t={t}
                  />
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Modals */}
      <NewOrderModal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        doctorId={doctorId}
        onSaved={fetchOrders}
      />
      <UploadResultsModal
        isOpen={!!uploadTarget}
        onClose={() => setUploadTarget(null)}
        order={uploadTarget}
        onSaved={fetchOrders}
      />
      <ReviewModal
        isOpen={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        order={reviewTarget}
        onSaved={fetchOrders}
      />
    </div>
  );
}
