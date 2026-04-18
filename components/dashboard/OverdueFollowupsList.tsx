"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CalendarPlus, X } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/lib/language-context";

export interface OverduePatient {
  id: string;
  name: string;
  next_followup_date: string;
  last_diagnosis?: string | null;
}

const DISMISSED_KEY = "tvacha-overdue-dismissed";

function capitalizeName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

function readDismissed(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const kept: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "number" && v > cutoff) kept[k] = v;
    }
    return kept;
  } catch {
    return {};
  }
}

function writeDismissed(map: Record<string, number>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(map));
  } catch {}
}

export function OverdueFollowupsList({
  patients,
}: {
  patients: OverduePatient[];
}) {
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState<Record<string, number>>(() =>
    readDismissed()
  );

  const visible = useMemo(
    () => patients.filter((p) => !dismissed[p.id]),
    [patients, dismissed]
  );

  const dismiss = (id: string) => {
    const next = { ...dismissed, [id]: Date.now() };
    setDismissed(next);
    writeDismissed(next);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-yellow-500" size={20} />
            <h3 className="text-lg font-serif font-semibold text-text-primary">
              {t("dash_overdue_followups")}
            </h3>
            {visible.length > 0 && (
              <Badge variant="warning">{visible.length}</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardBody>
        {visible.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {visible.map((patient) => {
                const daysOverdue = differenceInDays(
                  new Date(),
                  new Date(patient.next_followup_date)
                );
                const severe = daysOverdue >= 7;
                const severityStyle = severe
                  ? {
                      borderColor: "rgba(220,38,38,0.35)",
                      backgroundColor: "rgba(220,38,38,0.05)",
                    }
                  : {
                      borderColor: "rgba(245,158,11,0.35)",
                      backgroundColor: "rgba(245,158,11,0.05)",
                    };
                const badgeStyle = severe
                  ? { backgroundColor: "#fee2e2", color: "#991b1b" }
                  : { backgroundColor: "#fef3c7", color: "#92400e" };
                const scheduleHref = `/dashboard/appointments?patient_id=${
                  patient.id
                }&prefill=follow_up${
                  patient.last_diagnosis
                    ? `&diagnosis=${encodeURIComponent(patient.last_diagnosis)}`
                    : ""
                }`;
                return (
                  <motion.div
                    key={patient.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border"
                    style={severityStyle}
                  >
                    <Link
                      href={`/dashboard/patients/${patient.id}`}
                      className="min-w-0 flex-1"
                    >
                      <p
                        className="font-medium text-text-primary text-sm truncate"
                        title={capitalizeName(patient.name)}
                      >
                        {capitalizeName(patient.name)}
                      </p>
                      <p className="text-xs text-text-muted">
                        {t("dash_followup_was")}{" "}
                        {format(new Date(patient.next_followup_date), "MMM d, yyyy")}
                      </p>
                      {patient.last_diagnosis && (
                        <p className="text-xs text-text-muted italic truncate">
                          {patient.last_diagnosis}
                        </p>
                      )}
                    </Link>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className="inline-block px-2.5 py-1 text-xs font-medium rounded-full"
                        style={badgeStyle}
                      >
                        {daysOverdue}{" "}
                        {daysOverdue !== 1
                          ? t("dash_days_overdue")
                          : t("dash_day_overdue")}
                      </span>
                      <Link href={scheduleHref}>
                        <Button
                          variant="primary"
                          size="sm"
                          className="min-h-[44px] inline-flex items-center gap-1"
                        >
                          <CalendarPlus className="w-4 h-4" />
                          <span className="hidden sm:inline">
                            {t("overdue_schedule_now")}
                          </span>
                        </Button>
                      </Link>
                      <button
                        onClick={() => dismiss(patient.id)}
                        aria-label={t("overdue_dismiss")}
                        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-text-secondary hover:bg-primary-50 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <p className="text-text-muted text-sm text-center py-6">
            {t("dash_no_overdue")}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
