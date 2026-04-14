"use client";

import { supabase } from "./supabase";
import { fetchLetterheadFromDoctor, type ClinicLetterhead } from "./export";
import type { Invoice, InvoiceItem, Patient } from "./types";

export type GstCategory =
  | "consultation"
  | "cosmetic_procedure"
  | "medicine_5"
  | "medicine_12"
  | "retail_cosmetic_18"
  | "retail_cosmetic_28";

export const GST_RATES: Record<GstCategory, number> = {
  consultation: 0,
  cosmetic_procedure: 18,
  medicine_5: 5,
  medicine_12: 12,
  retail_cosmetic_18: 18,
  retail_cosmetic_28: 28,
};

export const GST_CATEGORY_LABELS: Record<GstCategory, string> = {
  consultation: "Consultation (exempt)",
  cosmetic_procedure: "Cosmetic procedure (18%)",
  medicine_5: "Medicine 5%",
  medicine_12: "Medicine 12%",
  retail_cosmetic_18: "Retail cosmetic 18%",
  retail_cosmetic_28: "Retail cosmetic 28%",
};

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unit_price: number;
  category: GstCategory;
  hsn_sac?: string;
  gst_rate_override?: number;  // advanced escape hatch
}

export interface InvoiceLineBreakdown extends InvoiceItem {
  category: GstCategory;
  gst_rate: number;
  taxable_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface InvoiceTotals {
  items: InvoiceLineBreakdown[];
  subtotal: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
  is_inter_state: boolean;
  doctor_state_code: string | null;
  patient_state_code: string | null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Compute GST breakdown for an invoice.
 * - Intra-state (doctor.state_code == patient.state_code): CGST + SGST halves of the rate.
 * - Inter-state: IGST at the full rate.
 * - Missing state codes default to intra-state (safer — collects both halves).
 */
export function calculateInvoiceTotals(params: {
  lines: InvoiceLineInput[];
  doctorStateCode: string | null;
  patientStateCode: string | null;
}): InvoiceTotals {
  const { lines, doctorStateCode, patientStateCode } = params;

  const isInterState =
    !!doctorStateCode &&
    !!patientStateCode &&
    doctorStateCode.toUpperCase() !== patientStateCode.toUpperCase();

  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let subtotal = 0;

  const items: InvoiceLineBreakdown[] = lines.map((line) => {
    const rate =
      line.gst_rate_override !== undefined
        ? line.gst_rate_override
        : GST_RATES[line.category];
    const taxable = round2(line.quantity * line.unit_price);
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    if (rate > 0) {
      if (isInterState) {
        igst = round2(taxable * (rate / 100));
      } else {
        cgst = round2(taxable * (rate / 200));
        sgst = round2(taxable * (rate / 200));
      }
    }
    const total = round2(taxable + cgst + sgst + igst);
    subtotal += taxable;
    cgstTotal += cgst;
    sgstTotal += sgst;
    igstTotal += igst;
    return {
      description: line.description,
      quantity: line.quantity,
      unit_price: line.unit_price,
      hsn_sac: line.hsn_sac,
      gst_rate: rate,
      category: line.category,
      taxable_amount: taxable,
      amount: taxable,
      cgst,
      sgst,
      igst,
      total,
    };
  });

  return {
    items,
    subtotal: round2(subtotal),
    cgst_amount: round2(cgstTotal),
    sgst_amount: round2(sgstTotal),
    igst_amount: round2(igstTotal),
    total_amount: round2(subtotal + cgstTotal + sgstTotal + igstTotal),
    is_inter_state: isInterState,
    doctor_state_code: doctorStateCode ?? null,
    patient_state_code: patientStateCode ?? null,
  };
}

/**
 * Indian fiscal year label for a given date: "YYYY-YY".
 * FY runs April 1 → March 31. E.g. 2026-04-14 → "2026-27".
 */
export function getFiscalYear(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0=Jan
  const startYear = m >= 3 ? y : y - 1; // Apr or later
  const endYear = (startYear + 1) % 100;
  return `${startYear}-${String(endYear).padStart(2, "0")}`;
}

/**
 * Allocate the next invoice number via the schema RPC.
 * Format: TC/{FY}/{NNNN}. Atomic per doctor + FY.
 */
export async function allocateInvoiceNumber(
  doctorId: string,
  fy: string = getFiscalYear()
): Promise<{ number: string | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("next_invoice_number", {
    p_doctor_id: doctorId,
    p_fy: fy,
  });
  if (error) {
    return { number: null, error: new Error(error.message) };
  }
  return { number: (data as string) ?? null, error: null };
}

export interface InvoicePdfInput {
  letterhead: ClinicLetterhead;
  doctorGstin: string | null;
  doctorStateCode: string | null;
  doctorLegalName: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  fiscalYear: string;
  patient: Pick<Patient, "id" | "name" | "phone" | "address" | "city" | "state">;
  patientStateCode: string | null;
  totals: InvoiceTotals;
  placeOfSupply: string | null;
  notes?: string | null;
}

export async function generateInvoicePdf(
  input: InvoicePdfInput
): Promise<Blob> {
  const [{ default: jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable: any =
    (autoTableMod as any).default ?? (autoTableMod as any);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;

  // Letterhead band
  doc.setFillColor(250, 248, 244);
  doc.rect(0, 0, pageWidth, 100, "F");
  doc.setDrawColor(184, 147, 106);
  doc.setLineWidth(2);
  doc.line(marginX, 98, pageWidth - marginX, 98);

  doc.setTextColor(26, 22, 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(input.letterhead.clinicName, marginX, 38);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(154, 138, 118);
  const subline = [
    input.doctorLegalName ?? `Dr. ${input.letterhead.doctorName}`,
    input.letterhead.nmcNumber ? `NMC: ${input.letterhead.nmcNumber}` : null,
    input.letterhead.phone,
  ]
    .filter(Boolean)
    .join("  |  ");
  doc.text(subline, marginX, 58);
  if (input.letterhead.address) {
    doc.text(input.letterhead.address, marginX, 72);
  }
  if (input.doctorGstin) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 22, 18);
    doc.text(`GSTIN: ${input.doctorGstin}`, marginX, 86);
  }

  // Title
  doc.setTextColor(26, 22, 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("TAX INVOICE", pageWidth - marginX, 38, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Invoice #: ${input.invoiceNumber}`,
    pageWidth - marginX,
    58,
    { align: "right" }
  );
  doc.text(`Date: ${input.invoiceDate}`, pageWidth - marginX, 72, {
    align: "right",
  });
  doc.text(`FY: ${input.fiscalYear}`, pageWidth - marginX, 86, {
    align: "right",
  });

  // Bill-to
  let y = 120;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Bill To", marginX, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const billLines: string[] = [input.patient.name];
  if (input.patient.phone) billLines.push(input.patient.phone);
  if (input.patient.address) billLines.push(input.patient.address);
  const cityState = [
    input.patient.city,
    input.patient.state,
    input.patientStateCode ? `(${input.patientStateCode})` : null,
  ]
    .filter(Boolean)
    .join(", ");
  if (cityState) billLines.push(cityState);
  if (input.placeOfSupply) {
    billLines.push(`Place of supply: ${input.placeOfSupply}`);
  }
  for (const line of billLines) {
    doc.text(line, marginX, y);
    y += 13;
  }

  y += 6;

  // Line items table
  autoTable(doc, {
    startY: y,
    head: [
      [
        "Description",
        "HSN/SAC",
        "Qty",
        "Rate",
        "Taxable",
        "GST %",
        input.totals.is_inter_state ? "IGST" : "CGST",
        input.totals.is_inter_state ? "—" : "SGST",
        "Total",
      ],
    ],
    body: input.totals.items.map((it) => [
      it.description,
      it.hsn_sac ?? "",
      String(it.quantity),
      it.unit_price.toFixed(2),
      it.taxable_amount.toFixed(2),
      `${it.gst_rate}%`,
      input.totals.is_inter_state ? it.igst.toFixed(2) : it.cgst.toFixed(2),
      input.totals.is_inter_state ? "" : it.sgst.toFixed(2),
      it.total.toFixed(2),
    ]),
    styles: { font: "helvetica", fontSize: 9, textColor: [26, 22, 18] },
    headStyles: {
      fillColor: [184, 147, 106],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [250, 248, 244] },
    margin: { left: marginX, right: marginX },
  });

  let afterTableY = (doc as any).lastAutoTable?.finalY ?? y + 100;
  afterTableY += 18;

  // Totals block
  const labelX = pageWidth - marginX - 220;
  const valueX = pageWidth - marginX;
  doc.setFontSize(10);
  const rows: [string, number][] = [
    ["Subtotal", input.totals.subtotal],
  ];
  if (input.totals.is_inter_state) {
    rows.push(["IGST", input.totals.igst_amount]);
  } else {
    rows.push(["CGST", input.totals.cgst_amount]);
    rows.push(["SGST", input.totals.sgst_amount]);
  }
  rows.push(["Total (INR)", input.totals.total_amount]);

  for (const [label, val] of rows) {
    const isTotal = label.startsWith("Total");
    if (isTotal) {
      doc.setFont("helvetica", "bold");
      doc.setDrawColor(184, 147, 106);
      doc.setLineWidth(1);
      doc.line(labelX, afterTableY - 4, valueX, afterTableY - 4);
    } else {
      doc.setFont("helvetica", "normal");
    }
    doc.text(label, labelX, afterTableY);
    doc.text(val.toFixed(2), valueX, afterTableY, { align: "right" });
    afterTableY += 14;
  }

  // Notes
  if (input.notes) {
    afterTableY += 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Notes", marginX, afterTableY);
    afterTableY += 12;
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(
      input.notes,
      pageWidth - marginX * 2
    );
    for (const line of wrapped) {
      doc.text(line, marginX, afterTableY);
      afterTableY += 12;
    }
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(154, 138, 118);
    doc.text(
      "This is a computer-generated invoice. Generated by Tvacha Clinic.",
      marginX,
      doc.internal.pageSize.getHeight() - 20
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - marginX,
      doc.internal.pageSize.getHeight() - 20,
      { align: "right" }
    );
  }

  return doc.output("blob");
}

export interface CreateInvoiceParams {
  doctorId: string;
  patientId: string;
  visitId?: string | null;
  lines: InvoiceLineInput[];
  patientStateCode?: string | null;   // if omitted, we assume intra-state
  placeOfSupply?: string | null;
  notes?: string | null;
  invoiceDate?: string;               // YYYY-MM-DD, defaults today (IST)
}

export interface CreateInvoiceResult {
  invoice: Invoice | null;
  pdfBlob: Blob | null;
  pdfUrl: string | null;
  totals: InvoiceTotals | null;
  error: Error | null;
}

/**
 * Full flow: allocate invoice number → compute GST → insert invoices row →
 * generate PDF. PDF is returned as a Blob for the caller to upload or download.
 * (Storage bucket for invoices isn't enforced in schema, so we leave upload to caller.)
 */
export async function createInvoice(
  params: CreateInvoiceParams
): Promise<CreateInvoiceResult> {
  const {
    doctorId,
    patientId,
    visitId = null,
    lines,
    placeOfSupply = null,
    notes = null,
    invoiceDate,
  } = params;

  if (!doctorId || !patientId || lines.length === 0) {
    return {
      invoice: null,
      pdfBlob: null,
      pdfUrl: null,
      totals: null,
      error: new Error("doctorId, patientId and at least one line required"),
    };
  }

  // Load doctor + patient together.
  const [doctorRes, patientRes, letterhead] = await Promise.all([
    supabase
      .from("doctors")
      .select("id, gstin, state_code, legal_business_name")
      .eq("id", doctorId)
      .maybeSingle(),
    supabase
      .from("patients")
      .select("id, name, phone, address, city, state")
      .eq("id", patientId)
      .maybeSingle(),
    fetchLetterheadFromDoctor(doctorId),
  ]);

  if (doctorRes.error || !doctorRes.data) {
    return {
      invoice: null,
      pdfBlob: null,
      pdfUrl: null,
      totals: null,
      error: new Error(doctorRes.error?.message ?? "Doctor not found"),
    };
  }
  if (patientRes.error || !patientRes.data) {
    return {
      invoice: null,
      pdfBlob: null,
      pdfUrl: null,
      totals: null,
      error: new Error(patientRes.error?.message ?? "Patient not found"),
    };
  }

  const doctorStateCode = (doctorRes.data.state_code as string | null) ?? null;
  const patientStateCode = params.patientStateCode ?? null;

  const totals = calculateInvoiceTotals({
    lines,
    doctorStateCode,
    patientStateCode,
  });

  const fy = getFiscalYear(invoiceDate ? new Date(invoiceDate) : new Date());

  const alloc = await allocateInvoiceNumber(doctorId, fy);
  if (!alloc.number) {
    return {
      invoice: null,
      pdfBlob: null,
      pdfUrl: null,
      totals,
      error: alloc.error ?? new Error("Failed to allocate invoice number"),
    };
  }

  const today = (() => {
    const d = new Date();
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const ist = new Date(utc + 330 * 60000);
    return ist.toISOString().slice(0, 10);
  })();

  const insertRes = await supabase
    .from("invoices")
    .insert({
      clinic_id: doctorId,
      doctor_id: doctorId,
      patient_id: patientId,
      visit_id: visitId,
      invoice_number: alloc.number,
      fiscal_year: fy,
      invoice_date: invoiceDate ?? today,
      items: totals.items,
      subtotal: totals.subtotal,
      cgst_amount: totals.cgst_amount,
      sgst_amount: totals.sgst_amount,
      igst_amount: totals.igst_amount,
      total_amount: totals.total_amount,
      place_of_supply: placeOfSupply,
      notes,
    })
    .select("*")
    .single();

  if (insertRes.error || !insertRes.data) {
    return {
      invoice: null,
      pdfBlob: null,
      pdfUrl: null,
      totals,
      error: new Error(insertRes.error?.message ?? "Insert failed"),
    };
  }

  const invoice = insertRes.data as Invoice;

  let pdfBlob: Blob | null = null;
  if (letterhead) {
    pdfBlob = await generateInvoicePdf({
      letterhead,
      doctorGstin: (doctorRes.data.gstin as string | null) ?? null,
      doctorStateCode,
      doctorLegalName:
        (doctorRes.data.legal_business_name as string | null) ?? null,
      invoiceNumber: invoice.invoice_number,
      invoiceDate: invoice.invoice_date,
      fiscalYear: invoice.fiscal_year,
      patient: patientRes.data as any,
      patientStateCode,
      totals,
      placeOfSupply,
      notes,
    });
  }

  return {
    invoice,
    pdfBlob,
    pdfUrl: invoice.pdf_url,
    totals,
    error: null,
  };
}

export function downloadInvoicePdf(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
