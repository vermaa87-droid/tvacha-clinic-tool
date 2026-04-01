"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import type { Appointment, Patient } from "@/lib/types";
import {
  VISIT_TYPE_OPTIONS,
  APPOINTMENT_STATUS_OPTIONS,
  APPOINTMENT_STATUS_COLORS,
} from "@/lib/constants";
import { Calendar, Plus, ChevronLeft, ChevronRight, List } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateTimeSlots(): { value: string; label: string }[] {
  const slots: { value: string; label: string }[] = [];
  for (let h = 9; h <= 17; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 18 && m > 0) break;
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      const ampm = h < 12 ? "AM" : "PM";
      const label = `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
      slots.push({ value, label });
    }
  }
  // Include 18:00 as the last slot
  slots.push({ value: "18:00", label: "6:00 PM" });
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

const DURATION_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "60 minutes" },
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface NewAppointmentForm {
  patient_id: string;
  date: string;
  time: string;
  duration_minutes: number;
  type: string;
  notes: string;
  reason: string;
  visit_fee: string;
}

const emptyForm: NewAppointmentForm = {
  patient_id: "",
  date: "",
  time: "",
  duration_minutes: 30,
  type: "new_visit",
  notes: "",
  reason: "",
  visit_fee: "",
};

function statusLabel(status: string): string {
  const found = APPOINTMENT_STATUS_OPTIONS.find((o) => o.value === status);
  return found ? found.label : status;
}

function typeLabel(type: string): string {
  const found = VISIT_TYPE_OPTIONS.find((o) => o.value === type);
  return found ? found.label : type;
}

function formatTime12(time: string): string {
  if (!time) return "";
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour12}:${mStr} ${ampm}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AppointmentsPage() {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleApt, setRescheduleApt] = useState<Appointment | null>(null);

  // Confirm dialogs
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [confirmComplete, setConfirmComplete] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<NewAppointmentForm>({ ...emptyForm });
  const [rescheduleForm, setRescheduleForm] = useState<NewAppointmentForm>({ ...emptyForm });

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [aptsRes, patientsRes] = await Promise.all([
          supabase
            .from("appointments")
            .select("*, patients(name)")
            .eq("doctor_id", user.id)
            .order("appointment_date", { ascending: true }),
          supabase
            .from("patients")
            .select("id, name")
            .eq("linked_doctor_id", user.id)
            .order("name"),
        ]);
        setAppointments((aptsRes.data as Appointment[]) || []);
        setPatients((patientsRes.data as Patient[]) || []);
      } catch (err) {
        console.error("[appointments] fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // -------------------------------------------------------------------------
  // Sorted appointments
  // -------------------------------------------------------------------------

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const dateA = `${a.appointment_date}T${a.appointment_time || "00:00"}`;
      const dateB = `${b.appointment_date}T${b.appointment_time || "00:00"}`;
      return dateA.localeCompare(dateB);
    });
  }, [appointments]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const updateStatus = async (id: string, status: string) => {
    try {
      setActionLoading(true);
      await supabase.from("appointments").update({ status }).eq("id", id);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: status as Appointment["status"] } : a))
      );
    } catch (err) {
      console.error("[appointments] update status error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckIn = (id: string) => updateStatus(id, "checked_in");
  const handleStart = (id: string) => updateStatus(id, "in_progress");

  const handleCancelConfirm = async () => {
    if (!confirmCancel) return;
    await updateStatus(confirmCancel, "cancelled");
    setConfirmCancel(null);
  };

  const handleCompleteConfirm = async (logVisit: boolean) => {
    if (!confirmComplete) return;
    await updateStatus(confirmComplete, "completed");
    setConfirmComplete(null);
    if (logVisit) {
      router.push("/dashboard/register");
    }
  };

  const handleSchedule = async () => {
    if (!user || !form.patient_id || !form.date || !form.time) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase
        .from("appointments")
        .insert({
          doctor_id: user.id,
          patient_id: form.patient_id,
          appointment_date: form.date,
          appointment_time: form.time,
          duration_minutes: form.duration_minutes,
          type: form.type,
          notes: form.notes || null,
          reason: form.reason || null,
          visit_fee: form.visit_fee ? parseFloat(form.visit_fee) : null,
          status: "scheduled",
        })
        .select("*, patients(name)")
        .single();

      if (!error && data) {
        setAppointments((prev) => [...prev, data as Appointment]);
      }
      setShowScheduleModal(false);
      setForm({ ...emptyForm });
    } catch (err) {
      console.error("[appointments] create error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescheduleOpen = (apt: Appointment) => {
    setRescheduleApt(apt);
    setRescheduleForm({
      patient_id: apt.patient_id,
      date: apt.appointment_date,
      time: apt.appointment_time,
      duration_minutes: apt.duration_minutes || 30,
      type: apt.type || "new_visit",
      notes: apt.notes || "",
      reason: apt.reason || "",
      visit_fee: apt.visit_fee ? String(apt.visit_fee) : "",
    });
    setShowRescheduleModal(true);
  };

  const handleReschedule = async () => {
    if (!user || !rescheduleApt || !rescheduleForm.date || !rescheduleForm.time) return;
    setActionLoading(true);
    try {
      // Mark old appointment as rescheduled
      await supabase
        .from("appointments")
        .update({ status: "rescheduled" })
        .eq("id", rescheduleApt.id);

      // Create new appointment
      const { data, error } = await supabase
        .from("appointments")
        .insert({
          doctor_id: user.id,
          patient_id: rescheduleForm.patient_id,
          appointment_date: rescheduleForm.date,
          appointment_time: rescheduleForm.time,
          duration_minutes: rescheduleForm.duration_minutes,
          type: rescheduleForm.type,
          notes: rescheduleForm.notes || null,
          reason: rescheduleForm.reason || null,
          visit_fee: rescheduleForm.visit_fee ? parseFloat(rescheduleForm.visit_fee) : null,
          status: "scheduled",
        })
        .select("*, patients(name)")
        .single();

      // Update local state
      setAppointments((prev) => {
        const updated = prev.map((a) =>
          a.id === rescheduleApt.id ? { ...a, status: "rescheduled" as Appointment["status"] } : a
        );
        if (!error && data) {
          updated.push(data as Appointment);
        }
        return updated;
      });

      setShowRescheduleModal(false);
      setRescheduleApt(null);
      setRescheduleForm({ ...emptyForm });
    } catch (err) {
      console.error("[appointments] reschedule error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Calendar helpers
  // -------------------------------------------------------------------------

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((apt) => {
      const key = apt.appointment_date;
      if (!map[key]) map[key] = [];
      map[key].push(apt);
    });
    return map;
  }, [appointments]);

  const selectedDayAppointments = useMemo(() => {
    if (!selectedCalendarDate) return [];
    const key = format(selectedCalendarDate, "yyyy-MM-dd");
    return (appointmentsByDate[key] || []).sort((a, b) =>
      (a.appointment_time || "").localeCompare(b.appointment_time || "")
    );
  }, [selectedCalendarDate, appointmentsByDate]);

  // -------------------------------------------------------------------------
  // Inactive row check
  // -------------------------------------------------------------------------

  const isInactive = (status: string) =>
    ["completed", "cancelled", "no_show", "rescheduled"].includes(status);

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const renderActions = (apt: Appointment) => {
    const s = apt.status;
    if (isInactive(s)) return <span className="text-text-muted text-sm">--</span>;

    return (
      <div className="flex flex-wrap gap-1">
        {s === "scheduled" && (
          <>
            <Button size="sm" variant="outline" onClick={() => handleCheckIn(apt.id)}>
              {t("apt_check_in")}
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setConfirmComplete(apt.id)}
            >
              {t("apt_complete")}
            </Button>
            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setConfirmCancel(apt.id)}>
              {t("apt_cancel_btn")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleRescheduleOpen(apt)}>
              {t("apt_reschedule_btn")}
            </Button>
          </>
        )}
        {s === "checked_in" && (
          <>
            <Button size="sm" variant="primary" onClick={() => handleStart(apt.id)}>
              {t("apt_start")}
            </Button>
            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setConfirmCancel(apt.id)}>
              {t("apt_cancel_btn")}
            </Button>
          </>
        )}
        {s === "in_progress" && (
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => setConfirmComplete(apt.id)}
          >
            {t("apt_complete")}
          </Button>
        )}
      </div>
    );
  };

  const selectClasses =
    "w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors";

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <main className="space-y-8">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-primary-200 rounded w-1/3" />
          <div className="h-64 bg-primary-200 rounded-lg" />
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-text-primary">{t("apt_title")}</h1>
          <p className="text-text-secondary mt-2">{t("apt_subtitle")}</p>
        </div>
        <Button
          className="bg-primary-500 hover:bg-primary-600 text-white flex items-center gap-2"
          onClick={() => setShowScheduleModal(true)}
        >
          <Plus size={20} /> {t("apt_schedule_btn")}
        </Button>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={viewMode === "list" ? "primary" : "outline"}
          className="flex items-center gap-2"
          onClick={() => setViewMode("list")}
        >
          <List size={16} /> {t("apt_list_view")}
        </Button>
        <Button
          size="sm"
          variant={viewMode === "calendar" ? "primary" : "outline"}
          className="flex items-center gap-2"
          onClick={() => setViewMode("calendar")}
        >
          <Calendar size={16} /> {t("apt_calendar_view")}
        </Button>
      </div>

      {/* ================================================================ */}
      {/* LIST VIEW                                                        */}
      {/* ================================================================ */}
      {viewMode === "list" && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">
              {t("apt_title")} ({sortedAppointments.length})
            </h3>
          </CardHeader>
          <CardBody className="overflow-x-auto">
            {sortedAppointments.length === 0 ? (
              <p className="text-text-muted text-center py-12">{t("apt_none_found")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-primary-200 text-left">
                    <th className="py-3 px-3 font-medium text-text-secondary">{t("apt_col_date")}</th>
                    <th className="py-3 px-3 font-medium text-text-secondary">{t("apt_col_time")}</th>
                    <th className="py-3 px-3 font-medium text-text-secondary">{t("apt_col_patient")}</th>
                    <th className="py-3 px-3 font-medium text-text-secondary">{t("apt_col_type")}</th>
                    <th className="py-3 px-3 font-medium text-text-secondary">{t("apt_col_duration")}</th>
                    <th className="py-3 px-3 font-medium text-text-secondary">{t("apt_col_notes")}</th>
                    <th className="py-3 px-3 font-medium text-text-secondary">{t("apt_col_status")}</th>
                    <th className="py-3 px-3 font-medium text-text-secondary">{t("apt_col_actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAppointments.map((apt) => {
                    const inactive = isInactive(apt.status);
                    const statusColor = APPOINTMENT_STATUS_COLORS[apt.status] || "";
                    const reasonNotes = [apt.reason, apt.notes]
                      .filter(Boolean)
                      .join(" - ");

                    return (
                      <tr
                        key={apt.id}
                        className={`border-b border-primary-100 ${inactive ? "opacity-50" : "hover:bg-primary-50"}`}
                      >
                        <td className="py-3 px-3 whitespace-nowrap">{apt.appointment_date}</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {apt.appointment_time ? formatTime12(apt.appointment_time) : "--"}
                        </td>
                        <td className="py-3 px-3 font-medium text-text-primary">
                          {apt.patients?.name || "Unknown"}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="info">{typeLabel(apt.type)}</Badge>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {apt.duration_minutes ? `${apt.duration_minutes} min` : "--"}
                        </td>
                        <td className="py-3 px-3 max-w-[200px] truncate" title={reasonNotes}>
                          {reasonNotes || "--"}
                        </td>
                        <td className="py-3 px-3">
                          <Badge className={statusColor}>{statusLabel(apt.status)}</Badge>
                        </td>
                        <td className="py-3 px-3">{renderActions(apt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      )}

      {/* ================================================================ */}
      {/* CALENDAR VIEW                                                    */}
      {/* ================================================================ */}
      {viewMode === "calendar" && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <button
                  onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                  className="p-2 rounded-lg hover:bg-primary-100 text-text-secondary transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <h3 className="text-lg font-serif font-semibold text-text-primary">
                  {format(currentMonth, "MMMM yyyy")}
                </h3>
                <button
                  onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                  className="p-2 rounded-lg hover:bg-primary-100 text-text-secondary transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </CardHeader>
            <CardBody>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAYS_OF_WEEK.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-text-secondary py-2">
                    {d}
                  </div>
                ))}
              </div>
              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const dayApts = appointmentsByDate[key] || [];
                  const isToday = isSameDay(day, new Date());
                  const inMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedCalendarDate ? isSameDay(day, selectedCalendarDate) : false;

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedCalendarDate(day)}
                      className={`
                        relative p-2 min-h-[60px] rounded-lg text-left transition-colors
                        ${!inMonth ? "text-text-muted opacity-40" : "text-text-primary"}
                        ${isToday ? "ring-2 ring-primary-500 bg-primary-50" : ""}
                        ${isSelected ? "bg-primary-100 border border-primary-500" : "hover:bg-primary-50"}
                      `}
                    >
                      <span className={`text-sm font-medium ${isToday ? "text-primary-500" : ""}`}>
                        {format(day, "d")}
                      </span>
                      {dayApts.length > 0 && (
                        <div className="flex gap-0.5 mt-1 flex-wrap">
                          {dayApts.length <= 3 ? (
                            dayApts.map((a) => (
                              <span
                                key={a.id}
                                className="w-2 h-2 rounded-full bg-primary-500"
                              />
                            ))
                          ) : (
                            <span className="text-xs font-medium text-primary-500">
                              {dayApts.length} appts
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {/* Selected day's appointments */}
          {selectedCalendarDate && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-text-primary">
                  Appointments for {format(selectedCalendarDate, "EEEE, MMMM d, yyyy")}
                </h3>
              </CardHeader>
              <CardBody className="space-y-3">
                {selectedDayAppointments.length === 0 ? (
                  <p className="text-text-muted text-center py-8">{t("apt_none_day")}</p>
                ) : (
                  selectedDayAppointments.map((apt) => {
                    const statusColor = APPOINTMENT_STATUS_COLORS[apt.status] || "";
                    return (
                      <div
                        key={apt.id}
                        className={`p-4 bg-primary-100 border border-primary-200 rounded-lg ${isInactive(apt.status) ? "opacity-50" : ""}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-text-primary">
                              {apt.patients?.name || "Unknown"}
                            </p>
                            <p className="text-sm text-text-secondary">
                              {apt.appointment_time ? formatTime12(apt.appointment_time) : "--"}
                              {apt.duration_minutes ? ` (${apt.duration_minutes} min)` : ""}
                            </p>
                          </div>
                          <div className="flex gap-2 items-center">
                            <Badge variant="info">{typeLabel(apt.type)}</Badge>
                            <Badge className={statusColor}>{statusLabel(apt.status)}</Badge>
                          </div>
                        </div>
                        <div className="mt-2">{renderActions(apt)}</div>
                      </div>
                    );
                  })
                )}
              </CardBody>
            </Card>
          )}
        </>
      )}

      {/* ================================================================ */}
      {/* SCHEDULE APPOINTMENT MODAL                                       */}
      {/* ================================================================ */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setForm({ ...emptyForm });
        }}
        title={t("apt_modal_schedule")}
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setShowScheduleModal(false);
                setForm({ ...emptyForm });
              }}
            >
              {t("common_cancel")}
            </Button>
            <Button
              className="bg-primary-500 hover:bg-primary-600 text-white"
              onClick={handleSchedule}
              loading={actionLoading}
              disabled={!form.patient_id || !form.date || !form.time}
            >
              {t("apt_schedule_btn")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Patient */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">{t("apt_patient_label")}</label>
            <select
              className={selectClasses}
              value={form.patient_id}
              onChange={(e) => setForm((p) => ({ ...p, patient_id: e.target.value }))}
            >
              <option value="">{t("apt_select_patient")}</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <Input
            label={t("apt_date_label")}
            type="date"
            min={todayStr}
            value={form.date}
            onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
          />

          {/* Time */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">{t("apt_time_label")}</label>
            <select
              className={selectClasses}
              value={form.time}
              onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
            >
              <option value="">{t("apt_select_time")}</option>
              {TIME_SLOTS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">{t("apt_duration_label")}</label>
            <select
              className={selectClasses}
              value={form.duration_minutes}
              onChange={(e) => setForm((p) => ({ ...p, duration_minutes: parseInt(e.target.value, 10) }))}
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">{t("apt_type_label")}</label>
            <select
              className={selectClasses}
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
            >
              {VISIT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reason / Notes */}
          <Textarea
            label={t("apt_notes_label")}
            placeholder={t("apt_notes_placeholder")}
            value={form.notes}
            rows={3}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          />

          {/* Visit Fee */}
          <Input
            label={t("apt_fee_label")}
            type="number"
            placeholder="₹"
            value={form.visit_fee}
            onChange={(e) => setForm((p) => ({ ...p, visit_fee: e.target.value }))}
          />
        </div>
      </Modal>

      {/* ================================================================ */}
      {/* RESCHEDULE MODAL                                                 */}
      {/* ================================================================ */}
      <Modal
        isOpen={showRescheduleModal}
        onClose={() => {
          setShowRescheduleModal(false);
          setRescheduleApt(null);
          setRescheduleForm({ ...emptyForm });
        }}
        title={t("apt_reschedule_title")}
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setShowRescheduleModal(false);
                setRescheduleApt(null);
                setRescheduleForm({ ...emptyForm });
              }}
            >
              {t("common_cancel")}
            </Button>
            <Button
              className="bg-primary-500 hover:bg-primary-600 text-white"
              onClick={handleReschedule}
              loading={actionLoading}
              disabled={!rescheduleForm.date || !rescheduleForm.time}
            >
              {t("apt_reschedule_btn")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Patient (read-only) */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">{t("apt_patient_read")}</label>
            <input
              className={`${selectClasses} bg-primary-100 cursor-not-allowed`}
              value={rescheduleApt?.patients?.name || "Unknown"}
              disabled
            />
          </div>

          {/* Date */}
          <Input
            label={t("apt_new_date")}
            type="date"
            min={todayStr}
            value={rescheduleForm.date}
            onChange={(e) => setRescheduleForm((p) => ({ ...p, date: e.target.value }))}
          />

          {/* Time */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">{t("apt_new_time")}</label>
            <select
              className={selectClasses}
              value={rescheduleForm.time}
              onChange={(e) => setRescheduleForm((p) => ({ ...p, time: e.target.value }))}
            >
              <option value="">{t("apt_select_time")}</option>
              {TIME_SLOTS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Duration (read-only) */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Duration</label>
            <select
              className={selectClasses}
              value={rescheduleForm.duration_minutes}
              disabled
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Type (read-only) */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Type</label>
            <select className={`${selectClasses} bg-primary-100 cursor-not-allowed`} value={rescheduleForm.type} disabled>
              {VISIT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes (read-only) */}
          <Textarea
            label="Reason / Notes"
            value={rescheduleForm.notes}
            rows={3}
            disabled
          />
        </div>
      </Modal>

      {/* ================================================================ */}
      {/* CANCEL CONFIRMATION DIALOG                                       */}
      {/* ================================================================ */}
      <Modal
        isOpen={!!confirmCancel}
        onClose={() => setConfirmCancel(null)}
        title={t("apt_cancel_title")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmCancel(null)}>
              {t("apt_no_keep")}
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleCancelConfirm}
              loading={actionLoading}
            >
              {t("apt_yes_cancel")}
            </Button>
          </>
        }
      >
        <p className="text-text-secondary">
          {t("apt_cancel_confirm")}
        </p>
      </Modal>

      {/* ================================================================ */}
      {/* COMPLETE CONFIRMATION DIALOG                                     */}
      {/* ================================================================ */}
      <Modal
        isOpen={!!confirmComplete}
        onClose={() => setConfirmComplete(null)}
        title={t("apt_complete_title")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmComplete(null)}>
              {t("common_cancel")}
            </Button>
            <Button variant="outline" onClick={() => handleCompleteConfirm(false)}>
              {t("apt_complete_only")}
            </Button>
            <Button
              className="bg-primary-500 hover:bg-primary-600 text-white"
              onClick={() => handleCompleteConfirm(true)}
              loading={actionLoading}
            >
              {t("apt_complete_visit")}
            </Button>
          </>
        }
      >
        <p className="text-text-secondary">
          {t("apt_complete_confirm")}
        </p>
      </Modal>
    </main>
  );
}
