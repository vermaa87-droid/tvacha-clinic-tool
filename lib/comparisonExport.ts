"use client";

import { fetchLetterheadFromDoctor, type ClinicLetterhead } from "./export";

export interface ComparisonExportInput {
  beforeUrl: string;
  afterUrl: string;
  beforeDate?: string | null;   // ISO or display string
  afterDate?: string | null;
  patientName?: string | null;
  patientId?: string | null;
  bodyRegion?: string | null;
  procedure?: string | null;
  notes?: string | null;
  letterhead?: ClinicLetterhead | null;
  layout?: "side_by_side" | "stacked";
  watermark?: string | null;      // defaults to clinic name
  showPatientName?: boolean;      // default false (privacy)
  canvasWidth?: number;           // default 1600
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const ratio = Math.min(w / img.width, h / img.height);
  const dw = img.width * ratio;
  const dh = img.height * ratio;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.fillStyle = "#1a1612";
  ctx.fillRect(x, y, w, h);
  ctx.drawImage(img, dx, dy, dw, dh);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Render a before/after comparison on a canvas. Returns a PNG Blob.
 * Layout: header band (clinic info) → two image panels with date labels → footer band.
 */
export async function buildComparisonCanvas(
  input: ComparisonExportInput
): Promise<HTMLCanvasElement> {
  const layout = input.layout ?? "side_by_side";
  const canvasWidth = input.canvasWidth ?? 1600;

  const [before, after] = await Promise.all([
    loadImage(input.beforeUrl),
    loadImage(input.afterUrl),
  ]);

  const gap = 24;
  const padX = 48;
  const headerH = input.letterhead ? 110 : 70;
  const footerH = 64;

  let imgW: number;
  let imgH: number;
  let canvasHeight: number;

  if (layout === "side_by_side") {
    imgW = Math.floor((canvasWidth - padX * 2 - gap) / 2);
    imgH = Math.floor(imgW * 1.1);
    canvasHeight = headerH + imgH + footerH + 40;
  } else {
    imgW = canvasWidth - padX * 2;
    imgH = Math.floor(imgW * 0.6);
    canvasHeight = headerH + imgH * 2 + gap + footerH + 60;
  }

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // Ivory background
  ctx.fillStyle = "#faf8f4";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Header
  ctx.fillStyle = "#1a1612";
  ctx.font = "bold 28px 'Cormorant Garamond', serif";
  ctx.textBaseline = "top";
  const clinicName =
    input.letterhead?.clinicName ?? input.watermark ?? "Tvacha Clinic";
  ctx.fillText(clinicName, padX, 28);

  if (input.letterhead) {
    ctx.font = "14px 'Outfit', sans-serif";
    ctx.fillStyle = "#9a8a76";
    const subline = [
      input.letterhead.doctorName ? `Dr. ${input.letterhead.doctorName}` : null,
      input.letterhead.nmcNumber ? `NMC: ${input.letterhead.nmcNumber}` : null,
      input.letterhead.phone,
    ]
      .filter(Boolean)
      .join("  |  ");
    ctx.fillText(subline, padX, 62);
  }

  // Gold rule
  ctx.strokeStyle = "#b8936a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padX, headerH - 8);
  ctx.lineTo(canvasWidth - padX, headerH - 8);
  ctx.stroke();

  // Images + labels
  const drawPanel = (
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    dateStr: string
  ) => {
    drawContain(ctx, img, x, y, w, h);
    ctx.fillStyle = "rgba(26,22,18,0.75)";
    ctx.fillRect(x, y + h - 44, w, 44);
    ctx.fillStyle = "#f5efe6";
    ctx.font = "bold 18px 'Outfit', sans-serif";
    ctx.fillText(label, x + 16, y + h - 36);
    if (dateStr) {
      ctx.font = "14px 'Outfit', sans-serif";
      ctx.fillStyle = "#e8dfcf";
      ctx.fillText(dateStr, x + 16, y + h - 18);
    }
  };

  if (layout === "side_by_side") {
    drawPanel(
      before,
      padX,
      headerH + 10,
      imgW,
      imgH,
      "BEFORE",
      formatDate(input.beforeDate)
    );
    drawPanel(
      after,
      padX + imgW + gap,
      headerH + 10,
      imgW,
      imgH,
      "AFTER",
      formatDate(input.afterDate)
    );
  } else {
    drawPanel(
      before,
      padX,
      headerH + 10,
      imgW,
      imgH,
      "BEFORE",
      formatDate(input.beforeDate)
    );
    drawPanel(
      after,
      padX,
      headerH + imgH + gap + 10,
      imgW,
      imgH,
      "AFTER",
      formatDate(input.afterDate)
    );
  }

  // Footer meta line
  const footerY = canvasHeight - footerH + 12;
  ctx.fillStyle = "#9a8a76";
  ctx.font = "13px 'Outfit', sans-serif";
  const footerParts = [
    input.showPatientName && input.patientName
      ? `Patient: ${input.patientName}`
      : input.patientId
        ? `Patient ID: ${input.patientId}`
        : null,
    input.bodyRegion ? `Region: ${input.bodyRegion}` : null,
    input.procedure ? `Procedure: ${input.procedure}` : null,
  ].filter(Boolean) as string[];
  ctx.fillText(footerParts.join("   |   "), padX, footerY);

  if (input.notes) {
    ctx.fillText(input.notes, padX, footerY + 18);
  }

  // Diagonal watermark
  const watermark = input.watermark ?? clinicName;
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#b8936a";
  ctx.font = "bold 72px 'Cormorant Garamond', serif";
  ctx.translate(canvasWidth / 2, canvasHeight / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.textAlign = "center";
  ctx.fillText(watermark, 0, 0);
  ctx.restore();

  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob returned null"));
      },
      type,
      quality
    );
  });
}

export async function exportComparisonImage(
  input: ComparisonExportInput,
  opts: { format?: "png" | "jpeg"; quality?: number } = {}
): Promise<Blob> {
  const canvas = await buildComparisonCanvas(input);
  const format = opts.format ?? "jpeg";
  const mime = format === "png" ? "image/png" : "image/jpeg";
  const quality = opts.quality ?? 0.92;
  return canvasToBlob(canvas, mime, quality);
}

export async function downloadComparison(
  filename: string,
  input: ComparisonExportInput,
  opts: { format?: "png" | "jpeg"; quality?: number } = {}
): Promise<void> {
  const blob = await exportComparisonImage(input, opts);
  const ext = (opts.format ?? "jpeg") === "png" ? "png" : "jpg";
  const name = filename.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convenience: resolve letterhead from doctor id, then build the comparison.
 */
export async function exportComparisonWithLetterhead(
  doctorId: string,
  input: Omit<ComparisonExportInput, "letterhead">,
  opts: { format?: "png" | "jpeg"; quality?: number } = {}
): Promise<Blob> {
  const letterhead = await fetchLetterheadFromDoctor(doctorId);
  return exportComparisonImage({ ...input, letterhead }, opts);
}
