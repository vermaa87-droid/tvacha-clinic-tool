"use client";

import { supabase } from "./supabase";
import { fetchLetterheadFromDoctor, type ClinicLetterhead } from "./export";
import type { ConsentRecord, ConsentTemplate, Patient } from "./types";

export interface CheckboxState {
  key: string;
  label: string;
  checked: boolean;
}

export interface GenerateConsentPdfInput {
  letterhead: ClinicLetterhead;
  patient: Pick<Patient, "id" | "name" | "phone" | "age" | "gender"> & {
    address?: string | null;
  };
  procedureName: string;
  consentText: string;
  checkboxes: CheckboxState[];
  signatureDataUrl: string | null;
  signedAt: string;
  patientIp: string | null;
}

/**
 * Build the consent PDF blob. jsPDF is dynamically imported so the bundle
 * stays lean and this stays SSR-safe.
 */
export async function generateConsentPdf(
  input: GenerateConsentPdfInput
): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;

  doc.setFillColor(250, 248, 244);
  doc.rect(0, 0, pageWidth, 90, "F");
  doc.setDrawColor(184, 147, 106);
  doc.setLineWidth(2);
  doc.line(marginX, 88, pageWidth - marginX, 88);

  doc.setTextColor(26, 22, 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(input.letterhead.clinicName, marginX, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(154, 138, 118);
  const subline = [
    `Dr. ${input.letterhead.doctorName}`,
    input.letterhead.nmcNumber ? `NMC: ${input.letterhead.nmcNumber}` : null,
    input.letterhead.phone,
  ]
    .filter(Boolean)
    .join("  |  ");
  doc.text(subline, marginX, 58);
  if (input.letterhead.address) doc.text(input.letterhead.address, marginX, 72);

  // Title
  doc.setTextColor(26, 22, 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("INFORMED CONSENT", marginX, 120);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Procedure: ${input.procedureName}`, marginX, 140);

  // Patient block
  let y = 165;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Patient details", marginX, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  const patientLines = [
    `Name: ${input.patient.name}`,
    input.patient.age != null ? `Age: ${input.patient.age}` : null,
    input.patient.gender ? `Gender: ${input.patient.gender}` : null,
    input.patient.phone ? `Phone: ${input.patient.phone}` : null,
    input.patient.address ? `Address: ${input.patient.address}` : null,
  ].filter(Boolean) as string[];
  for (const line of patientLines) {
    doc.text(line, marginX, y);
    y += 12;
  }

  // Consent body
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Consent", marginX, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const wrapped = doc.splitTextToSize(
    input.consentText,
    pageWidth - marginX * 2
  );
  for (const line of wrapped) {
    if (y > pageHeight - 180) {
      doc.addPage();
      y = 60;
    }
    doc.text(line, marginX, y);
    y += 13;
  }

  // Checkboxes
  y += 10;
  if (y > pageHeight - 180) {
    doc.addPage();
    y = 60;
  }
  doc.setFont("helvetica", "bold");
  doc.text("Acknowledgements", marginX, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  for (const cb of input.checkboxes) {
    if (y > pageHeight - 140) {
      doc.addPage();
      y = 60;
    }
    const box = cb.checked ? "[X]" : "[ ]";
    const wrappedLabel = doc.splitTextToSize(
      `${box} ${cb.label}`,
      pageWidth - marginX * 2 - 10
    );
    for (const line of wrappedLabel) {
      doc.text(line, marginX, y);
      y += 12;
    }
    y += 2;
  }

  // Signature block
  if (y > pageHeight - 160) {
    doc.addPage();
    y = 60;
  }
  y += 20;
  doc.setDrawColor(184, 147, 106);
  doc.setLineWidth(0.5);
  doc.line(marginX, y, marginX + 200, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(154, 138, 118);
  doc.text("Patient signature", marginX, y + 12);

  if (input.signatureDataUrl) {
    try {
      doc.addImage(
        input.signatureDataUrl,
        "PNG",
        marginX,
        y - 60,
        200,
        55,
        undefined,
        "FAST"
      );
    } catch {
      /* ignore invalid signature dataURL */
    }
  }

  // Audit trail
  const signedLocal = new Date(input.signedAt).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });
  doc.setTextColor(26, 22, 18);
  doc.setFontSize(9);
  doc.text(`Signed at: ${signedLocal} IST`, marginX, y + 30);
  if (input.patientIp) {
    doc.text(`Patient IP: ${input.patientIp}`, marginX, y + 44);
  }

  // Footer on every page
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(154, 138, 118);
    doc.text(
      "This consent is immutable once signed. Generated by Tvacha Clinic.",
      marginX,
      pageHeight - 20
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - marginX, pageHeight - 20, {
      align: "right",
    });
  }

  return doc.output("blob");
}

/**
 * Fetch the patient IP from our own server route. Returns null on failure —
 * consent insertion must not block if the IP can't be resolved.
 */
export async function fetchPatientIp(): Promise<string | null> {
  try {
    const res = await fetch("/api/client-ip", { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { ip: string | null };
    return json.ip ?? null;
  } catch {
    return null;
  }
}

export interface SignConsentParams {
  doctorId: string;
  patientId: string;
  visitId?: string | null;
  template: ConsentTemplate;
  procedureName?: string;
  consentText?: string;
  checkboxes: CheckboxState[];
  signatureDataUrl: string | null;
}

export interface SignConsentResult {
  record: ConsentRecord | null;
  pdfUrl: string | null;
  error: Error | null;
}

/**
 * End-to-end consent signing:
 *   1. Generate PDF (client-side).
 *   2. Upload PDF to `consents/{patient_id}/{record_id}.pdf` (immutable — no overwrite).
 *   3. Insert consent_records row with pdf_url set.
 *
 * RLS rules: doctor_id == auth.uid() on insert; storage policy checks
 * patient.linked_doctor_id == auth.uid(). Both must pass.
 *
 * Because consent_records are immutable (no UPDATE policy + blocking trigger),
 * we pre-allocate the record UUID here so the storage filename matches the
 * row id without ever needing an update.
 */
export async function signConsent(
  params: SignConsentParams
): Promise<SignConsentResult> {
  const {
    doctorId,
    patientId,
    visitId = null,
    template,
    checkboxes,
    signatureDataUrl,
  } = params;

  if (!doctorId || !patientId || !template) {
    return {
      record: null,
      pdfUrl: null,
      error: new Error("doctorId, patientId, and template are required"),
    };
  }

  const procedureName =
    params.procedureName ?? template.procedure_type ?? template.title;
  const consentText = params.consentText ?? template.body_text;

  const requiredKeys = template.checkboxes.map((c) => c.key);
  const checkedMap = new Map(checkboxes.map((c) => [c.key, c.checked]));
  const missing = requiredKeys.filter((k) => !checkedMap.get(k));
  if (missing.length > 0) {
    return {
      record: null,
      pdfUrl: null,
      error: new Error(
        `All acknowledgement boxes must be checked: missing ${missing.join(", ")}`
      ),
    };
  }

  const recordId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Fetch patient + letterhead for the PDF.
  const [patientRes, letterhead, patientIp] = await Promise.all([
    supabase
      .from("patients")
      .select("id, name, phone, age, gender, address")
      .eq("id", patientId)
      .maybeSingle(),
    fetchLetterheadFromDoctor(doctorId),
    fetchPatientIp(),
  ]);

  if (patientRes.error || !patientRes.data) {
    return {
      record: null,
      pdfUrl: null,
      error: new Error(patientRes.error?.message ?? "Patient not found"),
    };
  }
  if (!letterhead) {
    return {
      record: null,
      pdfUrl: null,
      error: new Error("Could not load clinic letterhead"),
    };
  }

  const signedAt = new Date().toISOString();

  const pdfBlob = await generateConsentPdf({
    letterhead,
    patient: patientRes.data as any,
    procedureName,
    consentText,
    checkboxes,
    signatureDataUrl,
    signedAt,
    patientIp,
  });

  const storagePath = `${patientId}/${recordId}.pdf`;
  const upload = await supabase.storage
    .from("consents")
    .upload(storagePath, pdfBlob, {
      contentType: "application/pdf",
      upsert: false,
      cacheControl: "31536000",
    });

  if (upload.error) {
    return {
      record: null,
      pdfUrl: null,
      error: new Error(`Upload failed: ${upload.error.message}`),
    };
  }

  const { data: signed } = await supabase.storage
    .from("consents")
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365);
  const pdfUrl = signed?.signedUrl ?? storagePath;

  const insert = await supabase
    .from("consent_records")
    .insert({
      id: recordId,
      template_id: template.id,
      patient_id: patientId,
      visit_id: visitId,
      doctor_id: doctorId,
      procedure_name: procedureName,
      consent_text: consentText,
      checkboxes_checked: checkboxes,
      signature_url: signatureDataUrl,
      pdf_url: pdfUrl,
      patient_ip: patientIp,
      signed_at: signedAt,
    })
    .select("*")
    .single();

  if (insert.error) {
    return {
      record: null,
      pdfUrl,
      error: new Error(`Insert failed: ${insert.error.message}`),
    };
  }

  return {
    record: insert.data as ConsentRecord,
    pdfUrl,
    error: null,
  };
}

export async function getConsentSignedUrl(
  patientId: string,
  consentId: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("consents")
    .createSignedUrl(`${patientId}/${consentId}.pdf`, expiresInSeconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}
