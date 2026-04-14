"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, FlaskConical, Check, X } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLanguage } from "@/lib/language-context";
import { useFollowUpSuggestion } from "@/lib/useFollowUpSuggestion";

interface Props {
  doctorId: string;
  patientId: string;
  diagnosis: string;
  visitDate: string;
  fromVisitId?: string | null;
  sessionIndex?: number;
  onScheduled?: (appointmentId: string) => void;
  onSkip?: () => void;
  className?: string;
}

export function ScheduleFollowUpCard({
  doctorId,
  patientId,
  diagnosis,
  visitDate,
  fromVisitId = null,
  sessionIndex,
  onScheduled,
  onSkip,
  className,
}: Props) {
  const { t } = useLanguage();
  const { suggestion, loading, schedule } = useFollowUpSuggestion(
    doctorId,
    diagnosis,
    visitDate
  );

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [orderLabs, setOrderLabs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<"scheduled" | "skipped" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (suggestion) {
      setDate(suggestion.suggestedDate);
      setTime(suggestion.suggestedTime.slice(0, 5));
      setOrderLabs(suggestion.requiresLabs);
    }
  }, [suggestion]);

  if (done === "scheduled") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={className}
      >
        <Card>
          <CardBody>
            <div className="flex items-center gap-3 text-green-700">
              <Check className="w-5 h-5" />
              <p className="font-medium">{t("followup_card_scheduled")}</p>
            </div>
          </CardBody>
        </Card>
      </motion.div>
    );
  }

  if (done === "skipped") return null;

  if (loading) {
    return (
      <Card className={className}>
        <CardBody>
          <div className="text-text-muted text-sm">…</div>
        </CardBody>
      </Card>
    );
  }

  if (!suggestion) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={className}
      >
        <Card>
          <CardBody>
            <p className="text-sm text-text-muted">{t("followup_card_no_protocol")}</p>
          </CardBody>
        </Card>
      </motion.div>
    );
  }

  const maxSessions = suggestion.protocol.max_sessions;
  const currentSession =
    typeof sessionIndex === "number" && sessionIndex > 0 ? sessionIndex + 1 : 1;

  const handleSchedule = async () => {
    if (!date || !time) return;
    setSaving(true);
    setError(null);
    const labPrefix = orderLabs && suggestion.labInstructions
      ? `${t("followup_card_order_labs")}: ${suggestion.labInstructions}`
      : null;
    const { data, error: err } = await schedule({
      patientId,
      fromVisitId,
      date,
      time: `${time}:00`,
      reason: suggestion.protocol.condition_name,
      notes: labPrefix ?? suggestion.protocol.notes ?? null,
    });
    setSaving(false);
    if (err || !data) {
      setError(t("followup_card_error"));
      return;
    }
    setDone("scheduled");
    onScheduled?.(data.id);
  };

  const handleSkip = () => {
    setDone("skipped");
    onSkip?.();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={className}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" style={{ color: "#b8936a" }} />
                <h3
                  className="text-lg font-serif font-semibold text-text-primary"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {t("followup_card_title")}
                </h3>
              </div>
              {maxSessions ? (
                <span
                  className="text-xs font-medium px-2 py-1 rounded-full"
                  style={{
                    color: "#b8936a",
                    backgroundColor: "rgba(184,147,106,0.12)",
                  }}
                >
                  {t("followup_card_session")
                    .replace("{current}", String(currentSession))
                    .replace("{max}", String(maxSessions))}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-text-muted mt-1">
              {t("followup_card_suggested")} · {suggestion.protocol.condition_name} ·{" "}
              {suggestion.protocol.interval_days}d
            </p>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  {t("followup_card_date")}
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  <Clock className="inline w-4 h-4 mr-1" />
                  {t("followup_card_time")}
                </label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>

            {suggestion.requiresLabs && (
              <div className="mt-4">
                <label className="inline-flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={orderLabs}
                    onChange={(e) => setOrderLabs(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded border-primary-200 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm">
                    <span className="inline-flex items-center gap-1 font-medium text-text-primary">
                      <FlaskConical className="w-4 h-4" />
                      {t("followup_card_order_labs")}
                    </span>
                    {suggestion.labInstructions && (
                      <span className="block text-xs text-text-muted mt-0.5">
                        {suggestion.labInstructions}
                      </span>
                    )}
                  </span>
                </label>
              </div>
            )}

            {error && (
              <p className="mt-3 text-sm" style={{ color: "var(--form-error)" }}>
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={saving}
                className="min-h-[44px] inline-flex items-center justify-center gap-1"
              >
                <X className="w-4 h-4" />
                {t("followup_card_skip")}
              </Button>
              <Button
                onClick={handleSchedule}
                disabled={saving || !date || !time}
                loading={saving}
                className="min-h-[44px] inline-flex items-center justify-center gap-1"
              >
                <Check className="w-4 h-4" />
                {saving ? t("followup_card_scheduling") : t("followup_card_schedule")}
              </Button>
            </div>
          </CardBody>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
