"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, FileText, Download, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import {
  GST_RATES,
  type GstCategory,
  calculateInvoiceTotals,
  createInvoice,
  downloadInvoicePdf,
  generateInvoicePdf,
  type InvoiceLineInput,
} from "@/lib/gstInvoice";
import { fetchLetterheadFromDoctor } from "@/lib/export";
import type { Invoice } from "@/lib/types";

interface PatientInvoicesTabProps {
  doctorId: string;
  patientId: string;
  patientName: string | undefined;
  patientStateCode: string | null;
  visits: Array<{ id: string; visit_date: string | null; diagnosis: string | null }>;
}

const CATEGORY_OPTIONS: GstCategory[] = [
  "consultation",
  "cosmetic_procedure",
  "medicine_5",
  "medicine_12",
  "retail_cosmetic_18",
  "retail_cosmetic_28",
];

interface DraftLine {
  description: string;
  quantity: string;
  unit_price: string;
  category: GstCategory;
  hsn_sac: string;
}

const emptyLine = (): DraftLine => ({
  description: "",
  quantity: "1",
  unit_price: "",
  category: "consultation",
  hsn_sac: "",
});

export function PatientInvoicesTab({
  doctorId,
  patientId,
  patientName,
  patientStateCode,
  visits,
}: PatientInvoicesTabProps) {
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [doctorStateCode, setDoctorStateCode] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!doctorId || !patientId) return;
    setLoading(true);
    try {
      const [invRes, docRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("*")
          .eq("doctor_id", doctorId)
          .eq("patient_id", patientId)
          .order("invoice_date", { ascending: false }),
        supabase
          .from("doctors")
          .select("state_code")
          .eq("id", doctorId)
          .maybeSingle(),
      ]);
      setInvoices((invRes.data as Invoice[]) ?? []);
      setDoctorStateCode((docRes.data?.state_code as string | null) ?? null);
    } finally {
      setLoading(false);
    }
  }, [doctorId, patientId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const formatINR = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className="text-xl font-bold text-text-primary"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {t("invoices_tab_title")}
          </h3>
          <p className="text-sm text-text-secondary mt-0.5">
            {t("invoices_tab_subtitle")}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <span className="inline-flex items-center gap-1.5">
            <Plus size={14} />
            {t("invoices_new")}
          </span>
        </Button>
      </div>

      {loading ? (
        <div className="rounded-lg border border-primary-200 px-4 py-8 text-center text-sm text-text-secondary">
          {t("invoices_loading")}
        </div>
      ) : invoices.length === 0 ? (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center text-center py-8 gap-2">
              <FileText size={28} className="text-text-secondary opacity-60" />
              <p className="text-sm text-text-secondary">{t("invoices_empty")}</p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border border-primary-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead style={{ background: "var(--color-surface)" }}>
                <tr className="text-left text-text-secondary">
                  <th className="py-2.5 px-3 font-medium">{t("invoices_table_number")}</th>
                  <th className="py-2.5 px-3 font-medium">{t("invoices_table_date")}</th>
                  <th className="py-2.5 px-3 font-medium text-right">{t("invoices_table_gst")}</th>
                  <th className="py-2.5 px-3 font-medium text-right">{t("invoices_table_total")}</th>
                  <th className="py-2.5 px-3" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <InvoiceRow
                    key={inv.id}
                    invoice={inv}
                    doctorId={doctorId}
                    patientId={patientId}
                    formatINR={formatINR}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {invoices.map((inv) => (
              <InvoiceCard
                key={inv.id}
                invoice={inv}
                doctorId={doctorId}
                patientId={patientId}
                formatINR={formatINR}
              />
            ))}
          </div>
        </>
      )}

      <CreateInvoiceModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        doctorId={doctorId}
        patientId={patientId}
        patientName={patientName}
        defaultPatientStateCode={patientStateCode}
        doctorStateCode={doctorStateCode}
        visits={visits}
        onCreated={() => {
          setShowCreate(false);
          fetchAll();
        }}
      />
    </div>
  );
}

function InvoiceRow({
  invoice,
  doctorId,
  patientId,
  formatINR,
}: {
  invoice: Invoice;
  doctorId: string;
  patientId: string;
  formatINR: (n: number) => string;
}) {
  const { t } = useLanguage();
  const gst =
    (invoice.cgst_amount ?? 0) + (invoice.sgst_amount ?? 0) + (invoice.igst_amount ?? 0);
  return (
    <tr
      className="border-t border-primary-200"
      style={{ background: "var(--color-card)" }}
    >
      <td className="py-3 px-3 font-mono text-xs text-text-primary whitespace-nowrap">
        {invoice.invoice_number}
      </td>
      <td className="py-3 px-3 text-text-secondary whitespace-nowrap">
        {format(new Date(invoice.invoice_date), "dd MMM yyyy")}
      </td>
      <td className="py-3 px-3 text-right text-text-secondary">
        {gst > 0 ? formatINR(gst) : "—"}
      </td>
      <td className="py-3 px-3 text-right font-semibold text-text-primary whitespace-nowrap">
        {formatINR(invoice.total_amount)}
      </td>
      <td className="py-3 px-3 text-right">
        <InvoiceDownloadButton
          invoice={invoice}
          doctorId={doctorId}
          patientId={patientId}
          label={t("invoices_download")}
        />
      </td>
    </tr>
  );
}

function InvoiceCard({
  invoice,
  doctorId,
  patientId,
  formatINR,
}: {
  invoice: Invoice;
  doctorId: string;
  patientId: string;
  formatINR: (n: number) => string;
}) {
  const { t } = useLanguage();
  const gst =
    (invoice.cgst_amount ?? 0) + (invoice.sgst_amount ?? 0) + (invoice.igst_amount ?? 0);
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--color-card)",
        border: "1px solid var(--color-primary-200)",
        borderLeft: "3px solid #b8936a",
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-mono text-xs text-text-primary">
          {invoice.invoice_number}
        </span>
        <span className="text-xs text-text-secondary">
          {format(new Date(invoice.invoice_date), "dd MMM yyyy")}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <Badge variant="default">{invoice.fiscal_year}</Badge>
        <span
          className="text-lg font-semibold text-text-primary"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {formatINR(invoice.total_amount)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-text-secondary">
          {t("invoices_table_gst")}: {gst > 0 ? formatINR(gst) : "—"}
        </span>
        <InvoiceDownloadButton
          invoice={invoice}
          doctorId={doctorId}
          patientId={patientId}
          label={t("invoices_download")}
        />
      </div>
    </div>
  );
}

function InvoiceDownloadButton({
  invoice,
  doctorId,
  patientId,
  label,
}: {
  invoice: Invoice;
  doctorId: string;
  patientId: string;
  label: string;
}) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleDownload = async () => {
    setBusy(true);
    setErr(null);
    try {
      // If we don't have a stored pdf_url, regenerate from invoice data.
      const [docRes, patientRes, letterhead] = await Promise.all([
        supabase
          .from("doctors")
          .select("gstin, state_code, legal_business_name")
          .eq("id", doctorId)
          .maybeSingle(),
        supabase
          .from("patients")
          .select("id, name, phone, address, city, state")
          .eq("id", patientId)
          .maybeSingle(),
        fetchLetterheadFromDoctor(doctorId),
      ]);
      if (!letterhead || !patientRes.data) {
        throw new Error("missing_letterhead_or_patient");
      }
      const blob = await generateInvoicePdf({
        letterhead,
        doctorGstin: (docRes.data?.gstin as string | null) ?? null,
        doctorStateCode: (docRes.data?.state_code as string | null) ?? null,
        doctorLegalName:
          (docRes.data?.legal_business_name as string | null) ?? null,
        invoiceNumber: invoice.invoice_number,
        invoiceDate: invoice.invoice_date,
        fiscalYear: invoice.fiscal_year,
        patient: patientRes.data as never,
        patientStateCode: invoice.place_of_supply ?? null,
        totals: {
          items: invoice.items as never,
          subtotal: invoice.subtotal,
          cgst_amount: invoice.cgst_amount,
          sgst_amount: invoice.sgst_amount,
          igst_amount: invoice.igst_amount,
          total_amount: invoice.total_amount,
          is_inter_state: invoice.igst_amount > 0,
          doctor_state_code: (docRes.data?.state_code as string | null) ?? null,
          patient_state_code: invoice.place_of_supply ?? null,
        },
        placeOfSupply: invoice.place_of_supply,
        notes: invoice.notes,
      });
      downloadInvoicePdf(invoice.invoice_number.replace(/[/\\]/g, "-"), blob);
    } catch {
      setErr(t("invoices_pdf_error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      {err && (
        <span className="inline-flex items-center gap-1 text-xs text-red-700">
          <AlertCircle size={11} />
          {err}
        </span>
      )}
      <Button size="sm" variant="outline" onClick={handleDownload} loading={busy}>
        <span className="inline-flex items-center gap-1">
          <Download size={12} />
          {label}
        </span>
      </Button>
    </div>
  );
}

function CreateInvoiceModal({
  open,
  onClose,
  doctorId,
  patientId,
  patientName,
  defaultPatientStateCode,
  doctorStateCode,
  visits,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  doctorId: string;
  patientId: string;
  patientName: string | undefined;
  defaultPatientStateCode: string | null;
  doctorStateCode: string | null;
  visits: Array<{ id: string; visit_date: string | null; diagnosis: string | null }>;
  onCreated: () => void;
}) {
  const { t } = useLanguage();
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [visitId, setVisitId] = useState<string>("");
  const [patientState, setPatientState] = useState<string>(
    defaultPatientStateCode ?? ""
  );
  const [placeOfSupply, setPlaceOfSupply] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLines([emptyLine()]);
      setVisitId("");
      setPatientState(defaultPatientStateCode ?? "");
      setPlaceOfSupply("");
      setNotes("");
      setError(null);
    }
  }, [open, defaultPatientStateCode]);

  const lineInputs: InvoiceLineInput[] = useMemo(
    () =>
      lines
        .filter(
          (l) =>
            l.description.trim().length > 0 &&
            parseFloat(l.unit_price) > 0 &&
            parseFloat(l.quantity) > 0
        )
        .map((l) => ({
          description: l.description.trim(),
          quantity: parseFloat(l.quantity),
          unit_price: parseFloat(l.unit_price),
          category: l.category,
          hsn_sac: l.hsn_sac.trim() || undefined,
        })),
    [lines]
  );

  const totals = useMemo(() => {
    if (lineInputs.length === 0) return null;
    return calculateInvoiceTotals({
      lines: lineInputs,
      doctorStateCode,
      patientStateCode: patientState.trim().toUpperCase() || null,
    });
  }, [lineInputs, doctorStateCode, patientState]);

  const formatINR = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(n);

  const updateLine = (i: number, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (i: number) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  const handleSubmit = async () => {
    setError(null);
    if (lineInputs.length === 0) {
      setError(t("invoice_create_need_lines"));
      return;
    }
    setSubmitting(true);
    try {
      const r = await createInvoice({
        doctorId,
        patientId,
        visitId: visitId || null,
        lines: lineInputs,
        patientStateCode: patientState.trim().toUpperCase() || null,
        placeOfSupply: placeOfSupply.trim().toUpperCase() || null,
        notes: notes.trim() || null,
      });
      if (!r.invoice) {
        setError(r.error?.message ?? t("invoice_create_error"));
        return;
      }
      if (r.pdfBlob) {
        downloadInvoicePdf(
          r.invoice.invoice_number.replace(/[/\\]/g, "-"),
          r.pdfBlob
        );
      } else {
        setError(t("invoice_create_no_letterhead"));
        // Still consider it created.
      }
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("invoice_create_error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={t("invoice_create_title")} size="xl">
      <div className="space-y-5">
        {patientName && (
          <div className="text-sm text-text-secondary">
            {patientName}
          </div>
        )}

        {/* Visit link */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t("invoice_visit_link")}
          </label>
          <select
            value={visitId}
            onChange={(e) => setVisitId(e.target.value)}
            className="w-full rounded-md border border-primary-200 px-3 py-2 text-sm bg-card text-text-primary"
          >
            <option value="">{t("invoice_visit_none")}</option>
            {visits.map((v) => (
              <option key={v.id} value={v.id}>
                {v.visit_date ? format(new Date(v.visit_date), "dd MMM yyyy") : "—"}
                {v.diagnosis ? ` · ${v.diagnosis}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Lines */}
        <div>
          <h4 className="text-sm font-semibold text-text-primary mb-2">
            {t("invoice_lines_title")}
          </h4>
          <div className="space-y-3">
            {lines.map((line, i) => (
              <div
                key={i}
                className="rounded-lg border border-primary-200 p-3 space-y-2"
                style={{ background: "var(--color-surface)" }}
              >
                <Input
                  label={t("invoice_line_description")}
                  value={line.description}
                  onChange={(e) => updateLine(i, { description: e.target.value })}
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Input
                    label={t("invoice_line_qty")}
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.quantity}
                    onChange={(e) => updateLine(i, { quantity: e.target.value })}
                  />
                  <Input
                    label={t("invoice_line_unit_price")}
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unit_price}
                    onChange={(e) => updateLine(i, { unit_price: e.target.value })}
                  />
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      {t("invoice_line_category")}
                    </label>
                    <select
                      value={line.category}
                      onChange={(e) =>
                        updateLine(i, { category: e.target.value as GstCategory })
                      }
                      className="w-full rounded-md border border-primary-200 px-3 py-2 text-sm bg-card text-text-primary"
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {t(`invoice_cat_${c}` as never)} — {GST_RATES[c]}%
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label={t("invoice_line_hsn")}
                      value={line.hsn_sac}
                      onChange={(e) => updateLine(i, { hsn_sac: e.target.value })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLine(i)}
                    disabled={lines.length === 1}
                    title={t("invoice_line_remove")}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={addLine}>
              <span className="inline-flex items-center gap-1">
                <Plus size={12} />
                {t("invoice_add_line")}
              </span>
            </Button>
          </div>
        </div>

        {/* Tax fields */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Input
              label={t("invoice_patient_state_code")}
              value={patientState}
              onChange={(e) => setPatientState(e.target.value.toUpperCase())}
              maxLength={2}
              placeholder={doctorStateCode ?? "27"}
            />
            <p className="text-xs text-text-secondary">
              {t("invoice_patient_state_code_help")}
            </p>
          </div>
          <Input
            label={t("invoice_place_of_supply")}
            value={placeOfSupply}
            onChange={(e) => setPlaceOfSupply(e.target.value.toUpperCase())}
            maxLength={2}
          />
        </div>

        <Textarea
          label={t("invoice_notes")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        {/* Totals preview */}
        {totals && (
          <div
            className="rounded-lg p-4 space-y-1"
            style={{
              background: "rgba(184,147,106,0.08)",
              border: "1px solid rgba(184,147,106,0.25)",
            }}
          >
            <div className="text-xs text-text-secondary uppercase tracking-wide mb-2">
              {totals.is_inter_state
                ? t("invoice_summary_inter_state")
                : t("invoice_summary_intra_state")}
            </div>
            <SummaryRow label={t("invoice_summary_subtotal")} value={formatINR(totals.subtotal)} />
            {totals.is_inter_state ? (
              <SummaryRow label={t("invoice_summary_igst")} value={formatINR(totals.igst_amount)} />
            ) : (
              <>
                <SummaryRow label={t("invoice_summary_cgst")} value={formatINR(totals.cgst_amount)} />
                <SummaryRow label={t("invoice_summary_sgst")} value={formatINR(totals.sgst_amount)} />
              </>
            )}
            <div
              className="border-t mt-2 pt-2 flex justify-between"
              style={{ borderColor: "rgba(184,147,106,0.4)" }}
            >
              <span className="font-semibold text-text-primary">
                {t("invoice_summary_total")}
              </span>
              <span
                className="font-semibold text-text-primary"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.15rem" }}
              >
                {formatINR(totals.total_amount)}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm rounded-md px-3 py-2 bg-red-100 text-red-800">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            {t("invoice_cancel")}
          </Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={lineInputs.length === 0}>
            {submitting ? t("invoice_create_submitting") : t("invoice_create_submit")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="text-text-primary tabular-nums">{value}</span>
    </div>
  );
}
