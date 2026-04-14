"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import {
  fetchLetterheadFromDoctor,
  type ClinicLetterhead,
} from "./export";
import type {
  CurrentStockRow,
  DeductStockResult,
  InventoryBatch,
  PurchaseOrderItem,
} from "./types";

// ============================================================
// Deduct stock (FEFO) — delegates to schema's deduct_stock RPC.
// ============================================================
export interface DeductStockParams {
  itemId: string;
  quantity: number;
  patientId?: string | null;
  visitId?: string | null;
  prescriptionId?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  reason?: string | null;
  notes?: string | null;
}

export async function deductStock(
  params: DeductStockParams
): Promise<{ data: DeductStockResult | null; error: Error | null }> {
  if (!params.itemId || !params.quantity || params.quantity <= 0) {
    return { data: null, error: new Error("itemId and positive quantity required") };
  }

  const { data, error } = await supabase.rpc("deduct_stock", {
    p_item_id: params.itemId,
    p_quantity: params.quantity,
    p_reference_type: params.referenceType ?? null,
    p_reference_id: params.referenceId ?? null,
    p_patient_id: params.patientId ?? null,
    p_prescription_id: params.prescriptionId ?? null,
    p_visit_id: params.visitId ?? null,
    p_reason: params.reason ?? null,
    p_notes: params.notes ?? null,
  });

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as DeductStockResult, error: null };
}

// ============================================================
// Prescription dispensing — deduct every matched medicine line.
// Accepts the prescription's medicine rows, resolves each to an
// inventory item by exact (doctor_id, lower(name)) match, and
// calls deduct_stock for each. Unresolved rows are returned so the
// UI can surface them ("medicine X not in inventory — skipped").
// ============================================================
export interface DispenseLine {
  name: string;
  quantity: number;
}

export interface DispenseResult {
  deducted: { name: string; itemId: string; result: DeductStockResult }[];
  unresolved: { name: string; reason: string }[];
  failed: { name: string; itemId: string; error: string }[];
}

export async function dispensePrescription(params: {
  doctorId: string;
  prescriptionId: string;
  patientId?: string | null;
  visitId?: string | null;
  lines: DispenseLine[];
}): Promise<DispenseResult> {
  const out: DispenseResult = { deducted: [], unresolved: [], failed: [] };
  if (!params.doctorId || !params.lines.length) return out;

  const names = params.lines.map((l) => l.name.trim().toLowerCase());
  const { data: items, error } = await supabase
    .from("inventory_items")
    .select("id, name")
    .eq("doctor_id", params.doctorId)
    .eq("is_active", true);

  if (error || !items) {
    params.lines.forEach((l) =>
      out.unresolved.push({ name: l.name, reason: "inventory lookup failed" })
    );
    return out;
  }

  const byName = new Map<string, string>();
  (items as { id: string; name: string }[]).forEach((i) =>
    byName.set(i.name.trim().toLowerCase(), i.id)
  );

  for (let i = 0; i < params.lines.length; i++) {
    const line = params.lines[i];
    const key = names[i];
    const itemId = byName.get(key);

    if (!itemId) {
      out.unresolved.push({ name: line.name, reason: "not in inventory" });
      continue;
    }
    if (!line.quantity || line.quantity <= 0) {
      out.unresolved.push({ name: line.name, reason: "invalid quantity" });
      continue;
    }

    const { data, error: dErr } = await deductStock({
      itemId,
      quantity: line.quantity,
      patientId: params.patientId ?? null,
      visitId: params.visitId ?? null,
      prescriptionId: params.prescriptionId,
      referenceType: "prescription",
      referenceId: params.prescriptionId,
      reason: "Dispensed against prescription",
    });

    if (dErr || !data) {
      out.failed.push({
        name: line.name,
        itemId,
        error: dErr?.message ?? "unknown error",
      });
    } else {
      out.deducted.push({ name: line.name, itemId, result: data });
    }
  }

  return out;
}

// ============================================================
// Expiry windows — items/batches expiring in 30/60/90 days.
// Returns per-window batch lists (with parent item info) so the UI
// can surface "expiring soon" alerts on the dashboard.
// ============================================================
export interface ExpiryWindowBatch {
  batch: InventoryBatch;
  itemName: string;
  itemId: string;
  daysUntilExpiry: number;
}

export interface ExpiryAlerts {
  expired: ExpiryWindowBatch[];
  within30: ExpiryWindowBatch[];
  within60: ExpiryWindowBatch[];
  within90: ExpiryWindowBatch[];
}

function daysBetween(iso: string, todayIso: string): number {
  const a = new Date(`${iso}T00:00:00`).getTime();
  const b = new Date(`${todayIso}T00:00:00`).getTime();
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}

export async function fetchExpiryAlerts(
  doctorId: string
): Promise<ExpiryAlerts> {
  const empty: ExpiryAlerts = {
    expired: [],
    within30: [],
    within60: [],
    within90: [],
  };
  if (!doctorId) return empty;

  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 90);
  const horizonIso = horizon.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("inventory_batches")
    .select("*, inventory_items!inner(id, name)")
    .eq("doctor_id", doctorId)
    .gt("quantity_on_hand", 0)
    .not("expiry_date", "is", null)
    .lte("expiry_date", horizonIso)
    .order("expiry_date", { ascending: true });

  if (error || !data) return empty;

  const rows = data as (InventoryBatch & {
    inventory_items: { id: string; name: string };
  })[];

  rows.forEach((row) => {
    if (!row.expiry_date) return;
    const days = daysBetween(row.expiry_date, today);
    const entry: ExpiryWindowBatch = {
      batch: row,
      itemId: row.inventory_items?.id ?? row.item_id,
      itemName: row.inventory_items?.name ?? "—",
      daysUntilExpiry: days,
    };
    if (days < 0) empty.expired.push(entry);
    else if (days <= 30) empty.within30.push(entry);
    else if (days <= 60) empty.within60.push(entry);
    else if (days <= 90) empty.within90.push(entry);
  });

  return empty;
}

export function useExpiryAlerts(doctorId: string | null | undefined) {
  const [alerts, setAlerts] = useState<ExpiryAlerts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    setError(null);
    try {
      setAlerts(await fetchExpiryAlerts(doctorId));
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    if (!doctorId) {
      setAlerts(null);
      return;
    }
    refresh();
  }, [doctorId, refresh]);

  return { alerts, loading, error, refresh };
}

// ============================================================
// Low-stock alerts — items where total_on_hand <= reorder_level.
// Reads the schema's current_stock view.
// ============================================================
export async function fetchLowStockAlerts(
  doctorId: string
): Promise<CurrentStockRow[]> {
  if (!doctorId) return [];
  const { data, error } = await supabase
    .from("current_stock")
    .select("*")
    .eq("doctor_id", doctorId)
    .eq("is_active", true)
    .eq("is_low_stock", true)
    .order("name", { ascending: true });

  if (error || !data) return [];
  return data as CurrentStockRow[];
}

export function useLowStockAlerts(doctorId: string | null | undefined) {
  const [items, setItems] = useState<CurrentStockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchLowStockAlerts(doctorId));
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    if (!doctorId) {
      setItems([]);
      return;
    }
    refresh();
  }, [doctorId, refresh]);

  return { items, loading, error, refresh };
}

// ============================================================
// Purchase Order PDF generation — jspdf + autotable, styled to
// match lib/export.ts (ivory band, gold rule, Helvetica).
// ============================================================
export interface PurchaseOrderPdfLine {
  itemName: string;
  quantity: number;
  unit?: string | null;
  unitCost: number;
  gstRate?: number | null;
  notes?: string | null;
}

export interface PurchaseOrderPdfConfig {
  letterhead: ClinicLetterhead;
  poNumber: string;
  poDate: string;
  fiscalYear: string;
  supplierName?: string | null;
  supplierAddress?: string | null;
  supplierGstin?: string | null;
  expectedDate?: string | null;
  items: PurchaseOrderPdfLine[];
  notes?: string | null;
}

function inr(n: number): string {
  return `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function generatePurchaseOrderPDF(
  config: PurchaseOrderPdfConfig
): Promise<Blob> {
  const [{ default: jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable: any =
    (autoTableMod as any).default ?? (autoTableMod as any);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Ivory header band + gold rule.
  doc.setFillColor(250, 248, 244);
  doc.rect(0, 0, pageWidth, 90, "F");
  doc.setDrawColor(184, 147, 106);
  doc.setLineWidth(2);
  doc.line(40, 88, pageWidth - 40, 88);

  doc.setTextColor(26, 22, 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(config.letterhead.clinicName, 40, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(154, 138, 118);
  const subline = [
    `Dr. ${config.letterhead.doctorName}`,
    config.letterhead.nmcNumber ? `NMC: ${config.letterhead.nmcNumber}` : null,
    config.letterhead.phone,
  ]
    .filter(Boolean)
    .join("  |  ");
  doc.text(subline, 40, 58);
  if (config.letterhead.address) {
    doc.text(config.letterhead.address, 40, 72);
  }

  // Title
  doc.setTextColor(26, 22, 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Purchase Order", 40, 115);

  // PO meta block (right column).
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(154, 138, 118);
  const metaX = pageWidth - 200;
  doc.text(`PO No: ${config.poNumber}`, metaX, 115);
  doc.text(`PO Date: ${config.poDate}`, metaX, 128);
  doc.text(`Fiscal Year: ${config.fiscalYear}`, metaX, 141);
  if (config.expectedDate) {
    doc.text(`Expected: ${config.expectedDate}`, metaX, 154);
  }

  // Supplier block (left).
  let cursorY = 140;
  if (config.supplierName) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 22, 18);
    doc.text("Supplier:", 40, cursorY);
    doc.setFont("helvetica", "normal");
    doc.text(config.supplierName, 100, cursorY);
    cursorY += 13;
    if (config.supplierAddress) {
      doc.setTextColor(154, 138, 118);
      const addrLines = doc.splitTextToSize(config.supplierAddress, 300);
      doc.text(addrLines, 100, cursorY);
      cursorY += addrLines.length * 12;
    }
    if (config.supplierGstin) {
      doc.setTextColor(154, 138, 118);
      doc.text(`GSTIN: ${config.supplierGstin}`, 100, cursorY);
      cursorY += 13;
    }
  }

  // Items table.
  const body = config.items.map((line, idx) => {
    const lineTotal = line.quantity * line.unitCost;
    return [
      String(idx + 1),
      line.itemName,
      `${line.quantity}${line.unit ? ` ${line.unit}` : ""}`,
      inr(line.unitCost),
      line.gstRate != null ? `${line.gstRate}%` : "—",
      inr(lineTotal),
    ];
  });

  const subtotal = config.items.reduce(
    (s, l) => s + l.quantity * l.unitCost,
    0
  );
  const tax = config.items.reduce(
    (s, l) => s + (l.quantity * l.unitCost * (l.gstRate ?? 0)) / 100,
    0
  );
  const total = subtotal + tax;

  autoTable(doc, {
    startY: Math.max(cursorY + 10, 175),
    head: [["#", "Item", "Qty", "Unit Cost", "GST", "Line Total"]],
    body,
    styles: { font: "helvetica", fontSize: 9, textColor: [26, 22, 18] },
    headStyles: {
      fillColor: [184, 147, 106],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [250, 248, 244] },
    margin: { left: 40, right: 40 },
    columnStyles: {
      0: { cellWidth: 25 },
      2: { cellWidth: 55 },
      3: { cellWidth: 70, halign: "right" },
      4: { cellWidth: 45, halign: "right" },
      5: { cellWidth: 85, halign: "right" },
    },
  });

  const afterTableY = (doc as any).lastAutoTable?.finalY ?? 400;
  let totalsY = afterTableY + 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(26, 22, 18);
  const totalsX = pageWidth - 240;
  doc.text("Subtotal:", totalsX, totalsY);
  doc.text(inr(subtotal), pageWidth - 40, totalsY, { align: "right" });
  totalsY += 14;
  doc.text("GST:", totalsX, totalsY);
  doc.text(inr(tax), pageWidth - 40, totalsY, { align: "right" });
  totalsY += 14;
  doc.setFont("helvetica", "bold");
  doc.text("Total:", totalsX, totalsY);
  doc.text(inr(total), pageWidth - 40, totalsY, { align: "right" });

  if (config.notes) {
    totalsY += 28;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Notes:", 40, totalsY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(154, 138, 118);
    const noteLines = doc.splitTextToSize(config.notes, pageWidth - 80);
    doc.text(noteLines, 40, totalsY + 12);
  }

  // Footer on every page.
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(154, 138, 118);
    doc.text("Tvacha Clinic", 40, doc.internal.pageSize.getHeight() - 20);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 40,
      doc.internal.pageSize.getHeight() - 20,
      { align: "right" }
    );
  }

  return doc.output("blob");
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadPurchaseOrderPDF(
  filename: string,
  config: PurchaseOrderPdfConfig
): Promise<void> {
  const blob = await generatePurchaseOrderPDF(config);
  triggerDownload(blob, filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

// ============================================================
// Allocate a new PO number via schema RPC.
// ============================================================
export function fiscalYearForDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  const startYear = m >= 3 ? y : y - 1;
  const fyStart = String(startYear).slice(-2);
  const fyEnd = String(startYear + 1).slice(-2);
  return `${fyStart}-${fyEnd}`;
}

export async function allocatePoNumber(
  doctorId: string,
  fy: string = fiscalYearForDate()
): Promise<{ poNumber: string | null; fy: string; error: Error | null }> {
  const { data, error } = await supabase.rpc("next_po_number", {
    p_doctor_id: doctorId,
    p_fy: fy,
  });
  if (error) return { poNumber: null, fy, error: new Error(error.message) };
  return { poNumber: data as string, fy, error: null };
}

// ============================================================
// Convenience: build a PO PDF from a list of PO items + doctor.
// ============================================================
export async function buildPurchaseOrderPdfFromRecord(params: {
  doctorId: string;
  poNumber: string;
  poDate: string;
  fiscalYear: string;
  supplier?: {
    name: string;
    address?: string | null;
    gstin?: string | null;
  } | null;
  expectedDate?: string | null;
  items: PurchaseOrderItem[];
  notes?: string | null;
}): Promise<Blob | null> {
  const letterhead = await fetchLetterheadFromDoctor(params.doctorId);
  if (!letterhead) return null;

  const lines: PurchaseOrderPdfLine[] = params.items.map((it) => ({
    itemName: it.item_name,
    quantity: it.quantity,
    unitCost: Number(it.unit_cost) || 0,
    gstRate: it.gst_rate ?? null,
    notes: it.notes ?? null,
  }));

  return generatePurchaseOrderPDF({
    letterhead,
    poNumber: params.poNumber,
    poDate: params.poDate,
    fiscalYear: params.fiscalYear,
    supplierName: params.supplier?.name ?? null,
    supplierAddress: params.supplier?.address ?? null,
    supplierGstin: params.supplier?.gstin ?? null,
    expectedDate: params.expectedDate ?? null,
    items: lines,
    notes: params.notes ?? null,
  });
}
