"use client";

import { supabase } from "./supabase";

export interface ExportColumn<T> {
  key: keyof T | string;
  label: string;
  format?: (row: T) => string | number | null | undefined;
}

export interface DateRange {
  from: string;
  to: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const DateRangePresets = {
  today: (): DateRange => ({ from: todayIso(), to: todayIso() }),
  last7: (): DateRange => ({ from: addDays(todayIso(), -6), to: todayIso() }),
  last30: (): DateRange => ({ from: addDays(todayIso(), -29), to: todayIso() }),
  thisMonth: (): DateRange => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    return { from, to: todayIso() };
  },
  thisYear: (): DateRange => {
    const now = new Date();
    const from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    return { from, to: todayIso() };
  },
};

export function applyDateRange<T extends { [k: string]: any }>(
  rows: T[],
  range: DateRange | null,
  column: keyof T
): T[] {
  if (!range) return rows;
  const from = new Date(`${range.from}T00:00:00`).getTime();
  const to = new Date(`${range.to}T23:59:59.999`).getTime();
  return rows.filter((r) => {
    const v = r[column];
    if (!v) return false;
    const t = typeof v === "string" ? new Date(v).getTime() : Number(v);
    return t >= from && t <= to;
  });
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function generateCSV<T>(rows: T[], columns: ExportColumn<T>[]): string {
  const header = columns.map((c) => csvEscape(c.label)).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const raw = c.format ? c.format(row) : (row as any)[c.key as string];
          return csvEscape(raw);
        })
        .join(",")
    )
    .join("\n");
  return `${header}\n${body}`;
}

export function downloadCSV<T>(
  filename: string,
  rows: T[],
  columns: ExportColumn<T>[]
): void {
  const csv = generateCSV(rows, columns);
  // BOM so Excel interprets UTF-8 (Hindi text) correctly.
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
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

export interface ClinicLetterhead {
  clinicName: string;
  doctorName: string;
  nmcNumber?: string | null;
  address?: string | null;
  phone?: string | null;
}

export async function fetchLetterheadFromDoctor(
  doctorId: string
): Promise<ClinicLetterhead | null> {
  const { data, error } = await supabase
    .from("doctors")
    .select("clinic_name, full_name, registration_number, clinic_address, phone")
    .eq("id", doctorId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    clinicName: data.clinic_name ?? "Tvacha Clinic",
    doctorName: data.full_name ?? "",
    nmcNumber: data.registration_number ?? null,
    address: data.clinic_address ?? null,
    phone: data.phone ?? null,
  };
}

export interface GeneratePDFReportConfig<T> {
  title: string;
  subtitle?: string;
  letterhead: ClinicLetterhead;
  columns: ExportColumn<T>[];
  rows: T[];
  dateRange?: DateRange | null;
  footerText?: string;
}

// jsPDF + autotable are loaded dynamically so they don't bloat the main bundle
// and don't run during SSR.
export async function generatePDFReport<T>(
  config: GeneratePDFReportConfig<T>
): Promise<Blob> {
  const [{ default: jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable: any =
    (autoTableMod as any).default ?? (autoTableMod as any);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Ivory header band
  doc.setFillColor(250, 248, 244);
  doc.rect(0, 0, pageWidth, 90, "F");

  // Gold accent rule
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
  doc.text(config.title, 40, 115);

  let cursorY = 130;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(154, 138, 118);
  if (config.subtitle) {
    doc.text(config.subtitle, 40, cursorY);
    cursorY += 12;
  }
  if (config.dateRange) {
    doc.text(
      `Date range: ${config.dateRange.from} to ${config.dateRange.to}`,
      40,
      cursorY
    );
    cursorY += 12;
  }
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 40, cursorY);
  cursorY += 10;

  autoTable(doc, {
    startY: cursorY + 6,
    head: [config.columns.map((c) => c.label)],
    body: config.rows.map((row) =>
      config.columns.map((c) => {
        const raw = c.format ? c.format(row) : (row as any)[c.key as string];
        return raw ?? "";
      })
    ),
    styles: { font: "helvetica", fontSize: 9, textColor: [26, 22, 18] },
    headStyles: {
      fillColor: [184, 147, 106],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [250, 248, 244] },
    margin: { left: 40, right: 40 },
  });

  // Footer on every page
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(154, 138, 118);
    const footer =
      config.footerText ?? "Generated via Tvacha Clinic";
    doc.text(footer, 40, doc.internal.pageSize.getHeight() - 20);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 40,
      doc.internal.pageSize.getHeight() - 20,
      { align: "right" }
    );
  }

  return doc.output("blob");
}

export async function downloadPDFReport<T>(
  filename: string,
  config: GeneratePDFReportConfig<T>
): Promise<void> {
  const blob = await generatePDFReport(config);
  triggerDownload(blob, filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

export function printCurrentView(): void {
  if (typeof window === "undefined") return;
  window.print();
}
