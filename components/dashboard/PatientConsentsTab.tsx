"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { FileSignature, ExternalLink, Plus } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import { getConsentSignedUrl } from "@/lib/consentPdf";
import type { ConsentRecord, ConsentTemplate } from "@/lib/types";

interface PatientConsentsTabProps {
  doctorId: string;
  patientId: string;
  visitId?: string | null;
}

export function PatientConsentsTab({
  doctorId,
  patientId,
  visitId = null,
}: PatientConsentsTabProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [templates, setTemplates] = useState<ConsentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!doctorId || !patientId) return;
    setLoading(true);
    const [recsRes, tplsRes] = await Promise.all([
      supabase
        .from("consent_records")
        .select("*")
        .eq("doctor_id", doctorId)
        .eq("patient_id", patientId)
        .order("signed_at", { ascending: false }),
      supabase
        .from("consent_templates")
        .select("*")
        .eq("doctor_id", doctorId)
        .eq("is_active", true)
        .order("title", { ascending: true }),
    ]);
    setRecords((recsRes.data as ConsentRecord[]) ?? []);
    setTemplates((tplsRes.data as ConsentTemplate[]) ?? []);
    setLoading(false);
  }, [doctorId, patientId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") fetchAll();
    };
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [fetchAll]);

  const openPicker = () => {
    setSelectedTemplateId(templates[0]?.id ?? "");
    setPickerOpen(true);
  };

  const proceedToSign = async () => {
    if (!selectedTemplateId) return;
    setCreating(true);
    try {
      const recordId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const params = new URLSearchParams({
        template: selectedTemplateId,
        patient: patientId,
      });
      if (visitId) params.set("visit", visitId);
      router.push(`/dashboard/consent/sign/${recordId}?${params.toString()}`);
    } finally {
      setCreating(false);
      setPickerOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h3
          className="text-lg sm:text-xl font-semibold text-text-primary"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {t("consents_tab_title")}
        </h3>
        <Button
          variant="primary"
          size="sm"
          onClick={openPicker}
          className="min-h-[44px] inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          {t("consents_tab_get_consent")}
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardBody>
            <div className="text-text-muted text-sm">Loading…</div>
          </CardBody>
        </Card>
      ) : records.length === 0 ? (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center justify-center py-10 text-text-muted">
              <FileSignature size={36} className="mb-3 opacity-30" />
              <p className="text-sm">{t("consents_tab_empty")}</p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {records.map((rec) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                layout
              >
                <ConsentRow record={rec} t={t} patientId={patientId} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={t("consents_picker_title")}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPickerOpen(false)}>
              {t("consents_cancel")}
            </Button>
            <Button
              variant="primary"
              onClick={proceedToSign}
              disabled={!selectedTemplateId || creating}
              loading={creating}
            >
              {t("consents_picker_proceed")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary mb-4">
          {t("consents_picker_subtitle")}
        </p>
        {templates.length === 0 ? (
          <p className="text-sm text-text-muted">
            {t("consents_picker_no_templates")}
          </p>
        ) : (
          <div className="space-y-2">
            {templates.map((tpl) => (
              <label
                key={tpl.id}
                className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors min-h-[44px]"
                style={{
                  borderColor:
                    selectedTemplateId === tpl.id
                      ? "#b8936a"
                      : "rgba(184,147,106,0.2)",
                  backgroundColor:
                    selectedTemplateId === tpl.id
                      ? "rgba(184,147,106,0.08)"
                      : "transparent",
                }}
              >
                <input
                  type="radio"
                  name="consent-template"
                  value={tpl.id}
                  checked={selectedTemplateId === tpl.id}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="mt-1 w-4 h-4 text-primary-500 focus:ring-primary-500"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className="text-base font-semibold text-text-primary"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    {tpl.title}
                  </p>
                  {tpl.procedure_type && (
                    <p className="text-xs text-text-muted">
                      {tpl.procedure_type}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

function ConsentRow({
  record,
  t,
  patientId,
}: {
  record: ConsentRecord;
  t: ReturnType<typeof useLanguage>["t"];
  patientId: string;
}) {
  const [opening, setOpening] = useState(false);

  const openPdf = async () => {
    setOpening(true);
    try {
      const url = await getConsentSignedUrl(patientId, record.id, 3600);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setOpening(false);
    }
  };

  return (
    <Card>
      <CardBody>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h4
              className="text-base font-semibold text-text-primary"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {record.procedure_name}
            </h4>
            <p className="text-xs text-text-muted mt-1">
              {t("consents_tab_signed_on")}:{" "}
              {format(new Date(record.signed_at), "dd MMM yyyy, h:mm a")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={openPdf}
            disabled={opening}
            loading={opening}
            className="min-h-[44px] inline-flex items-center gap-1"
          >
            <ExternalLink className="w-4 h-4" />
            {t("consents_tab_view_pdf")}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
