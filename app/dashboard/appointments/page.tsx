"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import { useRefreshTick } from "@/lib/RefreshContext";
import type { Appointment, Patient } from "@/lib/types";
import {
  VISIT_TYPE_OPTIONS,
  APPOINTMENT_STATUS_OPTIONS,
} from "@/lib/constants";
import { Calendar, Plus, ChevronLeft, ChevronRight, List } from "lucide-react";
import { useMutationQueue } from "@/lib/mutation-queue";
import { useDataCache } from "@/lib/data-cache";
import { useToast } from "@/components/ui/Toast";
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

function formatDateHuman(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const label = statusLabel(status);
  const styles: Record<string, string> = {
    scheduled: "bg-sky-50 text-sky-700",
    checked_in: "bg-amber-50 text-amber-700",
    in_progress: "bg-amber-100 text-amber-800",
    completed: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-red-50 text-red-500",
    no_show: "bg-stone-100 text-stone-600",
    rescheduled: "bg-violet-50 text-violet-700",
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? "bg-stone-100 text-stone-600"}`}>
      {label}
    </span>
  );
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
  const refreshTick = useRefreshTick();
  const router = useRouter();
  const { enqueue } = useMutationQueue();
  const { invalidateAppointments } = useDataCache();
  const { showToast } = useToast();
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

  const fetchData = useCallback(async (silent?: boolean) => {
    if (!user) return;
    if (!silent) setLoading(true);
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
  }, [user]);

  useEffect(() => {
    fetchData(refreshTick > 0);
  }, [fetchData, refreshTick]);

  // Realtime: sync across devices (requires Supabase Realtime enabled for appointments table)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("appointments-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `doctor_id=eq.${user.id}` }, () => { fetchData(true); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchData]);

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

  const handleSchedule = () => {
    if (!user || !form.patient_id || !form.date || !form.time) return;

    // Build the insert payload
    const insertPayload = {
      doctor_id: user.id,
      patient_id: form.patient_id,
      appointment_date: form.date,
      appointment_time: form.time,
      duration_minutes: form.duration_minutes,
      type: form.type,
      notes: form.notes || null,
      reason: form.reason || null,
      visit_fee: form.visit_fee ? parseFloat(form.visit_fee) : null,
      status: "scheduled" as const,
    };

    // Create optimistic appointment entry
    const optimisticId = `optimistic-${Date.now()}`;
    const selectedPatient = patients.find((p) => p.id === form.patient_id);
    const optimisticApt: Appointment = {
      id: optimisticId,
      doctor_id: user.id,
      patient_id: form.patient_id,
      appointment_date: form.date,
      appointment_time: form.time,
      duration_minutes: form.duration_minutes,
      type: form.type,
      status: "scheduled",
      notes: form.notes || null,
      reason: form.reason || null,
      visit_fee: form.visit_fee ? parseFloat(form.visit_fee) : null,
      created_at: new Date().toISOString(),
      patients: selectedPatient || undefined,
    };

    // Show success toast immediately
    showToast({ message: "Appointment scheduled" });

    // Close the modal immediately
    setShowScheduleModal(false);

    // Add to local state optimistically
    setAppointments((prev) => [...prev, optimisticApt]);

    // Save form state for error recovery
    const savedForm = { ...form };

    // Reset form
    setForm({ ...emptyForm });

    // Enqueue the background insert
    enqueue({
      label: "Schedule appointment",
      fn: async () => {
        const { error } = await supabase.from("appointments").insert(insertPayload);
        if (error) throw error;
        // On success: invalidate cache and refetch to get server data
        invalidateAppointments();
        fetchData(true);
      },
      onError: (err) => {
        console.error("[appointments] create error:", err);
        // Show error toast
        showToast({ message: "Failed to schedule appointment. Please try again.", duration: 5000 });
        // Remove the optimistic entry
        setAppointments((prev) => prev.filter((a) => a.id !== optimisticId));
        // Reopen modal with form data
        setForm(savedForm);
        setShowScheduleModal(true);
      },
    });
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
    if (isInactive(s)) return <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>—</span>;

    return (
      <div className="flex flex-wrap gap-1.5 sm:gap-1">
        {s === "scheduled" && (
          <>
            <Button size="sm" variant="outline" className="border-[#b8936a]/50 text-[#7a5c35] hover:bg-primary-200" onClick={() => handleCheckIn(apt.id)}>
              {t("apt_check_in")}
            </Button>
            <Button size="sm" className="bg-[#7a5c35] hover:bg-[#5c4527] text-white" onClick={() => setConfirmComplete(apt.id)}>
              {t("apt_complete")}
            </Button>
            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => setConfirmCancel(apt.id)}>
              {t("apt_cancel_btn")}
            </Button>
            <Button size="sm" variant="ghost" className="text-text-secondary" onClick={() => handleRescheduleOpen(apt)}>
              {t("apt_reschedule_btn")}
            </Button>
          </>
        )}
        {s === "checked_in" && (
          <>
            <Button size="sm" className="bg-[#7a5c35] hover:bg-[#5c4527] text-white" onClick={() => handleStart(apt.id)}>
              {t("apt_start")}
            </Button>
            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => setConfirmCancel(apt.id)}>
              {t("apt_cancel_btn")}
            </Button>
          </>
        )}
        {s === "in_progress" && (
          <Button size="sm" className="bg-[#7a5c35] hover:bg-[#5c4527] text-white" onClick={() => setConfirmComplete(apt.id)}>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-10 bg-primary-200 rounded w-40 animate-pulse" />
            <div className="h-4 bg-primary-100 rounded w-56 animate-pulse" />
          </div>
          <div className="h-10 w-full sm:w-44 bg-primary-200 rounded-lg animate-pulse" />
        </div>
        <div className="h-72 bg-primary-200 rounded-xl animate-pulse" />
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-text-primary">{t("apt_title")}</h1>
          <p className="text-text-secondary mt-2">{t("apt_subtitle")}</p>
        </div>
        <Button
          className="w-full sm:w-auto bg-[#7a5c35] hover:bg-[#5c4527] text-white tracking-wide flex items-center justify-center gap-2"
          onClick={() => setShowScheduleModal(true)}
        >
          <Plus size={18} /> {t("apt_schedule_btn")}
        </Button>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-sm font-medium rounded-lg transition-colors ${
            viewMode === "list"
              ? "bg-[#7a5c35] text-white"
              : "border border-[#b8936a]/50 text-[#7a5c35] hover:bg-primary-200"
          }`}
          onClick={() => setViewMode("list")}
        >
          <List size={15} /> {t("apt_list_view")}
        </button>
        <button
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-sm font-medium rounded-lg transition-colors ${
            viewMode === "calendar"
              ? "bg-[#7a5c35] text-white"
              : "border border-[#b8936a]/50 text-[#7a5c35] hover:bg-primary-200"
          }`}
          onClick={() => setViewMode("calendar")}
        >
          <Calendar size={15} /> {t("apt_calendar_view")}
        </button>
      </div>

      {/* ================================================================ */}
      {/* LIST VIEW                                                        */}
      {/* ================================================================ */}
      {viewMode === "list" && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(184,147,106,0.25)" }}>
          {/* Section header */}
          <div className="px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3" style={{ background: "var(--color-card)", borderBottom: "1px solid var(--color-separator)" }}>
            <h3 className="font-serif font-semibold text-lg sm:text-xl text-text-primary">{t("apt_title")}</h3>
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-primary-200 text-[#7a5c35]">
              {sortedAppointments.length}
            </span>
            <div className="flex-1 h-px" style={{ background: "rgba(184,147,106,0.2)" }} />
          </div>

          {sortedAppointments.length === 0 ? (
            <p className="text-text-muted text-center py-12 bg-card">{t("apt_none_found")}</p>
          ) : (
            <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: "var(--color-primary-200)" }}>
                  <tr>
                    {[t("apt_col_date"), t("apt_col_time"), t("apt_col_patient"), t("apt_col_type"), t("apt_col_duration"), t("apt_col_notes"), t("apt_col_status"), t("apt_col_actions")].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left whitespace-nowrap border-b border-[#b8936a]/20"
                        style={{ fontSize: "10px", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedAppointments.map((apt, i) => {
                    const inactive = isInactive(apt.status);
                    const reasonNotes = [apt.reason, apt.notes].filter(Boolean).join(" — ");
                    return (
                      <tr
                        key={apt.id}
                        className="group transition-colors hover:bg-primary-200"
                        style={{
                          background: i % 2 === 0 ? "var(--color-card)" : "var(--color-surface)",
                          borderBottom: "1px solid var(--color-separator)",
                          opacity: inactive ? 0.55 : 1,
                        }}
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap border-l-[3px] border-transparent group-hover:border-[#b8936a] transition-colors" style={{ color: "var(--color-text-muted)" }}>
                          {formatDateHuman(apt.appointment_date)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>
                          {apt.appointment_time ? formatTime12(apt.appointment_time) : "—"}
                        </td>
                        <td className="py-3.5 px-4 font-medium capitalize" style={{ color: "var(--color-text-primary)" }}>
                          {apt.patients?.name || "Unknown"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-200 text-[#7a5c35]">
                            {typeLabel(apt.type)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap" style={{ color: "var(--color-text-secondary)" }}>
                          {apt.duration_minutes ? `${apt.duration_minutes} min` : "—"}
                        </td>
                        <td className="py-3.5 px-4 max-w-[180px] truncate" style={{ color: "var(--color-text-secondary)" }} title={reasonNotes}>
                          {reasonNotes || "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={apt.status} />
                        </td>
                        <td className="py-3.5 px-4">{renderActions(apt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="md:hidden flex flex-col gap-3 p-3">
              {sortedAppointments.map((apt) => {
                const inactive = isInactive(apt.status);
                return (
                  <div
                    key={apt.id}
                    className="bg-card rounded-xl border-l-[3px] border-[#b8936a] p-4"
                    style={{
                      border: "1px solid var(--color-primary-200)",
                      borderLeft: "3px solid #b8936a",
                      opacity: inactive ? 0.55 : 1,
                    }}
                  >
                    {/* Top row: date/time + status */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {formatDateHuman(apt.appointment_date)}
                        {apt.appointment_time ? ` \u00B7 ${formatTime12(apt.appointment_time)}` : ""}
                      </span>
                      <StatusBadge status={apt.status} />
                    </div>

                    {/* Patient name */}
                    <p className="font-serif font-bold capitalize text-base mb-2" style={{ color: "var(--color-text-primary)" }}>
                      {apt.patients?.name || "Unknown"}
                    </p>

                    {/* Type + Duration */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-200 text-[#7a5c35]">
                        {typeLabel(apt.type)}
                      </span>
                      {apt.duration_minutes && (
                        <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                          {apt.duration_minutes} min
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div>{renderActions(apt)}</div>
                  </div>
                );
              })}
            </div>
            </>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* CALENDAR VIEW                                                    */}
      {/* ================================================================ */}
      {viewMode === "calendar" && (
        <>
          {/* Calendar grid */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(184,147,106,0.25)" }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ background: "var(--color-card)", borderBottom: "1px solid var(--color-separator)" }}>
              <button onClick={() => setCurrentMonth((m) => subMonths(m, 1))} className="p-2 rounded-lg hover:bg-primary-200 transition-colors" style={{ color: "var(--color-text-secondary)" }}>
                <ChevronLeft size={20} />
              </button>
              <h3 className="font-serif font-semibold text-xl text-text-primary">
                {format(currentMonth, "MMMM yyyy")}
              </h3>
              <button onClick={() => setCurrentMonth((m) => addMonths(m, 1))} className="p-2 rounded-lg hover:bg-primary-200 transition-colors" style={{ color: "var(--color-text-secondary)" }}>
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="p-2 sm:p-4 bg-card overflow-x-auto">
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1" style={{ minWidth: "320px" }}>
                {DAYS_OF_WEEK.map((d) => (
                  <div key={d} className="text-center text-[10px] sm:text-xs font-semibold py-1.5 sm:py-2 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1" style={{ minWidth: "320px" }}>
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
                      className={`relative p-1 sm:p-2 min-h-[44px] sm:min-h-[60px] rounded-lg text-left transition-colors ${
                        isToday ? "ring-2 ring-[#b8936a]" : ""
                      } ${isSelected ? "border border-[#b8936a]" : "hover:bg-primary-200"}`}
                      style={{
                        background: isSelected ? "var(--color-primary-200)" : isToday ? "var(--color-surface)" : "transparent",
                        color: inMonth ? "var(--color-text-primary)" : "var(--color-text-muted)",
                        opacity: inMonth ? 1 : 0.5,
                      }}
                    >
                      <span className="text-xs sm:text-sm font-medium" style={{ color: isToday ? "#b8936a" : undefined }}>
                        {format(day, "d")}
                      </span>
                      {dayApts.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5 sm:mt-1 flex-wrap">
                          {dayApts.length <= 3 ? (
                            dayApts.map((a) => (
                              <span key={a.id} className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ background: "#b8936a" }} />
                            ))
                          ) : (
                            <span className="text-[10px] sm:text-xs font-medium" style={{ color: "#b8936a" }}>
                              {dayApts.length}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Selected day appointments */}
          {selectedCalendarDate && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(184,147,106,0.25)" }}>
              <div className="px-5 py-4" style={{ background: "var(--color-card)", borderBottom: "1px solid var(--color-separator)" }}>
                <h3 className="font-serif font-semibold text-xl text-text-primary">
                  Appointments for {format(selectedCalendarDate, "EEEE, d MMMM yyyy")}
                </h3>
              </div>
              <div className="p-4 space-y-3 bg-card">
                {selectedDayAppointments.length === 0 ? (
                  <p className="text-text-muted text-center py-8">{t("apt_none_day")}</p>
                ) : (
                  selectedDayAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="p-4 rounded-xl"
                      style={{
                        background: "var(--color-surface)",
                        border: "1px solid rgba(184,147,106,0.18)",
                        borderLeft: "3px solid #b8936a",
                        opacity: isInactive(apt.status) ? 0.55 : 1,
                      }}
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                        <div>
                          <p className="font-semibold capitalize" style={{ color: "var(--color-text-primary)" }}>
                            {apt.patients?.name || "Unknown"}
                          </p>
                          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                            {apt.appointment_time ? formatTime12(apt.appointment_time) : "—"}
                            {apt.duration_minutes ? ` (${apt.duration_minutes} min)` : ""}
                          </p>
                        </div>
                        <div className="flex gap-2 items-center flex-wrap">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-200 text-[#7a5c35]">
                            {typeLabel(apt.type)}
                          </span>
                          <StatusBadge status={apt.status} />
                        </div>
                      </div>
                      <div className="mt-2">{renderActions(apt)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
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
