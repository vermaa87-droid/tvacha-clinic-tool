"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Check, Download, Printer, X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface Props {
  open: boolean;
  onClose: () => void;
  clinicId: string;
  clinicName?: string;
}

export function CheckInQRModal({ open, onClose, clinicId, clinicName }: Props) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  const url = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/checkin/${clinicId}`;
  }, [clinicId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const downloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `tvacha-checkin-qr.png`;
    a.click();
  };

  const printQR = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Tvacha Check-In QR</title>
    <style>
      body { font-family: Georgia, 'Cormorant Garamond', serif; text-align: center; padding: 40px; color: #1a1612; background: #faf8f4; }
      h1 { font-size: 28px; margin: 0 0 8px; letter-spacing: 0.04em; }
      .clinic { font-size: 18px; color: #7a5c35; margin-bottom: 24px; }
      .qr { margin: 0 auto 24px; padding: 12px; background: #fff; border: 2px solid #b8936a; border-radius: 12px; display: inline-block; }
      .qr img { display: block; width: 320px; height: 320px; }
      .en { font-size: 16px; margin: 8px 0; }
      .hi { font-size: 16px; margin: 8px 0; font-family: 'Noto Sans Devanagari', sans-serif; }
      .brand { margin-top: 24px; font-size: 12px; letter-spacing: 0.2em; color: #b8936a; text-transform: uppercase; }
    </style></head><body>
      <h1>Tvacha Clinic</h1>
      ${clinicName ? `<div class="clinic">${clinicName}</div>` : ""}
      <div class="qr"><img src="${dataUrl}" alt="Check-in QR" /></div>
      <div class="en">${t("qr_print_instruction")}</div>
      <div class="hi">${t("qr_print_instruction_hi")}</div>
      <div class="brand">Intelligent Dermatology Infrastructure</div>
      <script>window.onload = function() { window.print(); };<\/script>
    </body></html>`);
    w.document.close();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl shadow-xl"
        style={{
          backgroundColor: "var(--color-card)",
          border: "1px solid var(--color-separator)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: "var(--color-separator)" }}
        >
          <h2
            className="text-xl font-serif font-semibold text-text-primary"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {t("qr_modal_title")}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-lg inline-flex items-center justify-center text-text-secondary hover:bg-primary-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm text-text-secondary mb-4">{t("qr_modal_desc")}</p>

          <div
            className="mx-auto w-fit p-4 rounded-xl"
            style={{
              backgroundColor: "#ffffff",
              border: "2px solid #b8936a",
            }}
          >
            <QRCodeCanvas
              ref={canvasRef}
              value={url || `${clinicId}`}
              size={240}
              level="M"
              marginSize={2}
              fgColor="#1a1612"
              bgColor="#ffffff"
            />
          </div>

          {clinicName && (
            <p
              className="text-center mt-3 text-sm font-medium"
              style={{ color: "#7a5c35" }}
            >
              {clinicName}
            </p>
          )}

          <button
            onClick={copyLink}
            className="mt-3 w-full text-xs inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg hover:bg-primary-50 transition-colors"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                {t("qr_copied")}
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                {t("qr_copy_link")}
              </>
            )}
          </button>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={downloadPNG}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: "#b8936a" }}
            >
              <Download className="w-4 h-4" />
              {t("qr_download")}
            </button>
            <button
              onClick={printQR}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors text-[#7a5c35] hover:bg-primary-50"
              style={{ borderColor: "rgba(184,147,106,0.5)" }}
            >
              <Printer className="w-4 h-4" />
              {t("qr_print")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
