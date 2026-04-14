"use client";

import { useState } from "react";
import { Copy, Check, MessageSquare, Loader2, X } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { createFeedbackToken } from "@/lib/feedback";
import { useLanguage } from "@/lib/language-context";

interface Props {
  doctorId: string;
  patientId: string | null;
  visitId: string | null;
}

export function FeedbackLinkButton({ doctorId, patientId, visitId }: Props) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await createFeedbackToken({ doctorId, patientId, visitId });
      setUrl(res.url);
      setModalOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate link");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const close = () => {
    setModalOpen(false);
    setUrl(null);
    setCopied(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-sm font-medium border transition-colors disabled:opacity-50"
        style={{
          borderColor: "rgba(184,147,106,0.5)",
          color: "#7a5c35",
        }}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <MessageSquare className="w-4 h-4" />
        )}
        {t("feedback_share_link")}
      </button>

      {error && (
        <p className="mt-2 text-xs" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}

      {modalOpen && url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
          onClick={close}
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
                className="text-xl font-serif font-semibold"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {t("feedback_share_title")}
              </h2>
              <button
                onClick={close}
                aria-label="Close"
                className="w-9 h-9 rounded-lg inline-flex items-center justify-center"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
                {t("feedback_share_desc")}
              </p>

              <div
                className="mx-auto w-fit p-4 rounded-xl"
                style={{ backgroundColor: "#ffffff", border: "2px solid #b8936a" }}
              >
                <QRCodeCanvas
                  value={url}
                  size={200}
                  level="M"
                  marginSize={2}
                  fgColor="#1a1612"
                  bgColor="#ffffff"
                />
              </div>

              <div
                className="mt-4 rounded-lg px-3 py-2 text-xs break-all"
                style={{
                  backgroundColor: "var(--color-primary-50, #faf8f4)",
                  border: "1px solid var(--color-separator)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {url}
              </div>

              <button
                onClick={copyLink}
                className="mt-3 w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: "#b8936a" }}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    {t("feedback_share_copied")}
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    {t("feedback_share_copy")}
                  </>
                )}
              </button>

              <p className="mt-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                {t("feedback_share_expires")}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
