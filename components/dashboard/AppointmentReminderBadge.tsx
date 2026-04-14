"use client";

import { formatDistanceToNow } from "date-fns";
import { Bell, BellRing, BellOff } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface AppointmentReminderBadgeProps {
  appointmentDate: string;
  appointmentTime?: string | null;
  reminderSentAt: string | null | undefined;
  smsEnabled: boolean;
  compact?: boolean;
}

export function AppointmentReminderBadge({
  appointmentDate,
  appointmentTime,
  reminderSentAt,
  smsEnabled,
  compact = false,
}: AppointmentReminderBadgeProps) {
  const { t } = useLanguage();

  if (!smsEnabled) {
    return (
      <span
        title={t("appt_reminder_not_configured")}
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
        style={{
          background: "rgba(154,138,118,0.12)",
          color: "var(--color-text-secondary)",
        }}
      >
        <BellOff size={11} />
        {!compact && t("appt_reminder_not_configured")}
      </span>
    );
  }

  if (reminderSentAt) {
    const when = formatDistanceToNow(new Date(reminderSentAt), { addSuffix: true });
    const label = t("appt_reminder_sent");
    const tooltip = t("appt_reminder_tooltip_sent").replace("{when}", when);
    return (
      <span
        title={tooltip}
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
        style={{
          background: "rgba(45,74,62,0.12)",
          color: "#2d4a3e",
        }}
      >
        <BellRing size={11} />
        {!compact && label}
      </span>
    );
  }

  const apt = new Date(
    `${appointmentDate}T${appointmentTime || "00:00"}:00`
  ).getTime();
  const now = Date.now();
  if (Number.isNaN(apt) || apt < now) return null;

  return (
    <span
      title={t("appt_reminder_tooltip_scheduled")}
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{
        background: "rgba(184,147,106,0.14)",
        color: "#7a5c35",
      }}
    >
      <Bell size={11} />
      {!compact && t("appt_reminder_scheduled")}
    </span>
  );
}
