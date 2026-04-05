"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Input";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import type { Appointment } from "@/lib/types";
import {
  Calendar,
  Users,
  Sprout,
  Copy,
  Check,
  ChevronRight,
  ClipboardPlus,
  CalendarPlus,
  UserPlus,
  FileText,
  Activity,
  Clock,
  Table2,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow, endOfWeek, differenceInDays } from "date-fns";
import { useLanguage } from "@/lib/language-context";
import { useRefreshTick } from "@/lib/RefreshContext";

interface ActivityItem {
  type: "patient" | "prescription" | "visit";
  label: string;
  created_at: string;
}

export default function DashboardHome() {
  const { user, doctor } = useAuthStore();
  const { t } = useLanguage();
  const refreshTick = useRefreshTick();
  const [totalPatients, setTotalPatients] = useState(0);
  const [visitsToday, setVisitsToday] = useState(0);
  const [appointmentsToday, setAppointmentsToday] = useState(0);
  const [followupsDueThisWeek, setFollowupsDueThisWeek] = useState(0);
  const [overdueFollowups, setOverdueFollowups] = useState<any[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<Appointment[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [pendingCases, setPendingCases] = useState(0);
  const [urgentCases, setUrgentCases] = useState(0);

  const fetchData = useCallback(async (silent?: boolean) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const now = new Date();
      const todayStr = format(now, "yyyy-MM-dd");

      const weekEndStr = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");

      const [
        patientsRes,
        visitsTodayRes,
        appointmentsTodayRes,
        followupsDueRes,
        scheduleRes,
        recentPatientsRes,
        recentPrescriptionsRes,
        recentVisitsRes,
        overdueFollowupsRes,
        pendingCasesRes,
        urgentCasesRes,
      ] = await Promise.all([
        // Total Patients
        supabase
          .from("patients")
          .select("id", { count: "exact" })
          .eq("linked_doctor_id", user.id),
        // Visits Today
        supabase
          .from("visits")
          .select("id", { count: "exact" })
          .eq("doctor_id", user.id)
          .eq("visit_date", todayStr),
        // Appointments Today
        supabase
          .from("appointments")
          .select("id", { count: "exact" })
          .eq("doctor_id", user.id)
          .eq("appointment_date", todayStr),
        // Follow-ups Due This Week
        supabase
          .from("patients")
          .select("id", { count: "exact" })
          .eq("linked_doctor_id", user.id)
          .gte("next_followup_date", todayStr)
          .lte("next_followup_date", weekEndStr),
        // Today's Schedule (full details)
        supabase
          .from("appointments")
          .select("*, patients(name)")
          .eq("doctor_id", user.id)
          .eq("appointment_date", todayStr)
          .order("appointment_time"),
        // Recent patients
        supabase
          .from("patients")
          .select("name, created_at")
          .eq("linked_doctor_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        // Recent prescriptions
        supabase
          .from("prescriptions")
          .select("created_at, patients(name)")
          .eq("doctor_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        // Recent visits
        supabase
          .from("visits")
          .select("created_at, patients(name)")
          .eq("doctor_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        // Overdue follow-ups
        supabase
          .from("patients")
          .select("id, name, next_followup_date")
          .eq("linked_doctor_id", user.id)
          .lt("next_followup_date", todayStr)
          .not("treatment_status", "eq", "recovered")
          .not("treatment_status", "eq", "discontinued")
          .order("next_followup_date", { ascending: true })
          .limit(5),
        // Pending AI cases
        supabase
          .from("cases")
          .select("id")
          .eq("assigned_doctor_id", user.id)
          .eq("status", "pending_review"),
        // Urgent AI cases
        supabase
          .from("cases")
          .select("id")
          .eq("assigned_doctor_id", user.id)
          .eq("urgent_flag", true)
          .eq("status", "pending_review"),
      ]);

      setTotalPatients(patientsRes.count || 0);
      setVisitsToday(visitsTodayRes.count || 0);
      setAppointmentsToday(appointmentsTodayRes.count || 0);
      setFollowupsDueThisWeek(followupsDueRes.count || 0);
      setOverdueFollowups(overdueFollowupsRes.data || []);
      setPendingCases(pendingCasesRes.data?.length || 0);
      setUrgentCases(urgentCasesRes.data?.length || 0);
      setTodaySchedule((scheduleRes.data as Appointment[]) || []);

      // Merge recent activity
      const activities: ActivityItem[] = [];

      if (recentPatientsRes.data) {
        for (const p of recentPatientsRes.data) {
          activities.push({
            type: "patient",
            label: `Added patient ${capitalizeName(p.name)}`,
            created_at: p.created_at,
          });
        }
      }
      if (recentPrescriptionsRes.data) {
        for (const p of recentPrescriptionsRes.data as any[]) {
          activities.push({
            type: "prescription",
            label: `Created prescription for ${capitalizeName(p.patients?.name || "Unknown")}`,
            created_at: p.created_at,
          });
        }
      }
      if (recentVisitsRes.data) {
        for (const v of recentVisitsRes.data as any[]) {
          activities.push({
            type: "visit",
            label: `Logged visit for ${capitalizeName(v.patients?.name || "Unknown")}`,
            created_at: v.created_at,
          });
        }
      }

      activities.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRecentActivity(activities.slice(0, 5));
    } catch (err) {
      console.error("[dashboard] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData(refreshTick > 0);
  }, [fetchData, refreshTick]);

  // Realtime: sync across devices (requires Supabase Realtime enabled for these tables)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dashboard-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "patients", filter: `linked_doctor_id=eq.${user.id}` }, () => { fetchData(true); })
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `doctor_id=eq.${user.id}` }, () => { fetchData(true); })
      .on("postgres_changes", { event: "*", schema: "public", table: "visits", filter: `doctor_id=eq.${user.id}` }, () => { fetchData(true); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchData]);

  const handleSendFeedback = async () => {
    if (!user || !feedbackText.trim()) return;
    setFeedbackLoading(true);
    await supabase.from("feedback").insert({
      doctor_id: user.id,
      message: feedbackText.trim(),
      category: "general",
    });
    setFeedbackSent(true);
    setFeedbackLoading(false);
    setTimeout(() => {
      setShowFeedbackModal(false);
      setFeedbackText("");
      setFeedbackSent(false);
    }, 1500);
  };

  const handleInvite = () => {
    const code = doctor?.referral_code || "";
    navigator.clipboard.writeText(
      `Join me on Tvacha Clinic — India's clinical intelligence platform. Download the app and use my referral code ${code} to link with my clinic.`
    );
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2500);
  };

  const displayName = doctor?.full_name
    ? doctor.full_name.startsWith("Dr.") ? doctor.full_name : `Dr. ${doctor.full_name.split(" ")[0]}`
    : "Doctor";

  const capitalizeName = (name: string) =>
    name.replace(/\b\w/g, (c) => c.toUpperCase());

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "scheduled": return "info";
      case "completed": return "success";
      case "cancelled": return "error";
      default: return "default";
    }
  };

  const activityIcon = (type: string) => {
    switch (type) {
      case "patient": return <UserPlus size={16} className="text-primary-500" />;
      case "prescription": return <FileText size={16} className="text-primary-500" />;
      case "visit": return <Activity size={16} className="text-primary-500" />;
      default: return <Clock size={16} className="text-primary-500" />;
    }
  };

  if (loading) {
    return (
      <main className="space-y-8">
        <div className="animate-pulse space-y-8">
          <div className="h-12 bg-primary-200 rounded w-1/3" />
          <div className="grid md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-primary-200 rounded-lg" />)}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => <div key={i} className="h-48 bg-primary-200 rounded-lg" />)}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-xl bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 px-6 py-5">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-text-primary">
          {getGreeting()}, {displayName}
        </h1>
        <p className="text-text-secondary mt-1.5">
          {format(new Date(), "EEEE, MMMM do, yyyy")}
        </p>
        <p className="text-text-muted text-sm mt-1">
          {appointmentsToday > 0
            ? `You have ${appointmentsToday} appointment${appointmentsToday !== 1 ? "s" : ""} today${followupsDueThisWeek > 0 ? `, ${followupsDueThisWeek} follow-up${followupsDueThisWeek !== 1 ? "s" : ""} pending this week` : ""}.`
            : followupsDueThisWeek > 0
            ? `${followupsDueThisWeek} follow-up${followupsDueThisWeek !== 1 ? "s" : ""} pending this week — schedule is clear for today.`
            : "Your schedule is clear today. A great day to focus."}
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 w-1 rounded-l-lg z-10" style={{ background: "#b8936a" }} />
          <Card>
            <CardBody className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-xs font-medium uppercase tracking-wide">{t("dash_total_patients")}</span>
                <Users className="text-primary-400" size={18} />
              </div>
              <p className="text-5xl sm:text-6xl font-bold text-primary-500 leading-none">{totalPatients}</p>
              <p className="text-text-muted text-xs">{t("dash_all_time")}</p>
            </CardBody>
          </Card>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 w-1 rounded-l-lg z-10" style={{ background: "#b8936a" }} />
          <Card>
            <CardBody className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-xs font-medium uppercase tracking-wide">{t("dash_visits_today")}</span>
                <Activity className="text-primary-400" size={18} />
              </div>
              <p className="text-5xl sm:text-6xl font-bold text-primary-500 leading-none">{visitsToday}</p>
              <p className="text-text-muted text-xs">{t("dash_today")}</p>
            </CardBody>
          </Card>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 w-1 rounded-l-lg z-10" style={{ background: "#b8936a" }} />
          <Card>
            <CardBody className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-xs font-medium uppercase tracking-wide">{t("dash_appointments_today")}</span>
                <Calendar className="text-primary-400" size={18} />
              </div>
              <p className="text-5xl sm:text-6xl font-bold text-primary-500 leading-none">{appointmentsToday}</p>
              <p className="text-text-muted text-xs">{t("dash_appointments_today_sub")}</p>
            </CardBody>
          </Card>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 w-1 rounded-l-lg z-10" style={{ background: "#b8936a" }} />
          <Card>
            <CardBody className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-xs font-medium uppercase tracking-wide">{t("dash_followups_due")}</span>
                <CalendarPlus className="text-primary-400" size={18} />
              </div>
              <p className="text-5xl sm:text-6xl font-bold text-primary-500 leading-none">{followupsDueThisWeek}</p>
              <p className="text-text-muted text-xs">{t("dash_followups_due_sub")}</p>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* AI Cases Banner */}
      {(pendingCases > 0 || urgentCases > 0) && (
        <div className="flex flex-wrap gap-3 mb-2">
          {urgentCases > 0 && (
            <a
              href="/dashboard/ready-for-diagnosis"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:opacity-90"
              style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.2)" }}
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {urgentCases} urgent case{urgentCases !== 1 ? "s" : ""} — needs review
            </a>
          )}
          {pendingCases > 0 && (
            <a
              href="/dashboard/ready-for-diagnosis"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:opacity-90"
              style={{ background: "rgba(184,147,106,0.1)", color: "#7a5c35", border: "1px solid rgba(184,147,106,0.25)" }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: "#b8936a" }} />
              {pendingCases} case{pendingCases !== 1 ? "s" : ""} pending review
            </a>
          )}
        </div>
      )}

      {/* Today's Schedule & Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <h3 className="text-lg font-serif font-semibold text-text-primary">
                {t("dash_todays_schedule")}
              </h3>
              <Link
                href="/dashboard/appointments"
                className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
              >
                {t("dash_view_all")} <ChevronRight size={14} />
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            <p className="text-sm font-medium text-text-secondary mb-3">
              {t("dash_patients_today")} <span className="text-primary-500 font-bold">{appointmentsToday}</span>
            </p>
            {todaySchedule.length > 0 ? (
              <div className="space-y-3">
                {todaySchedule.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-surface hover:bg-primary-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-text-muted font-medium min-w-[56px]">
                        {apt.appointment_time}
                      </div>
                      <div>
                        <p className="font-medium text-text-primary text-sm truncate max-w-[150px]" title={capitalizeName(apt.patients?.name || "Unknown")}>
                          {capitalizeName(apt.patients?.name || "Unknown")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {apt.type && <Badge variant="info">{apt.type}</Badge>}
                      <Badge variant={statusBadgeVariant(apt.status)}>
                        {apt.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <div
                  className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(184,147,106,0.08)" }}
                >
                  <Calendar className="text-primary-300" size={30} />
                </div>
                <p className="text-text-muted text-xs mb-1">Your day is clear</p>
                <p className="text-text-secondary text-sm font-medium mb-4">No appointments scheduled for today</p>
                <Link href="/dashboard/appointments">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary-400 text-primary-500"
                  >
                    {t("dash_schedule_one")}
                  </Button>
                </Link>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recent Activity Feed */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-serif font-semibold text-text-primary">
              {t("dash_recent_activity")}
            </h3>
          </CardHeader>
          <CardBody>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg bg-surface"
                  >
                    <div className="mt-0.5">{activityIcon(item.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">{item.label}</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Activity className="mx-auto text-primary-200 mb-3" size={32} />
                <p className="text-text-muted text-sm">{t("dash_no_activity")}</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-serif font-semibold text-text-primary mb-4">
          {t("dash_quick_actions")}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Link href="/dashboard/patients">
            <Card className="group cursor-pointer hover:border-primary-500 transition-all hover:shadow-md">
              <CardBody className="flex flex-col items-center gap-3 py-6">
                <UserPlus size={30} style={{ color: "#b8936a" }} />
                <span className="text-sm font-medium text-text-primary">{t("dash_add_patient")}</span>
              </CardBody>
            </Card>
          </Link>

          <Link href="/dashboard/prescriptions">
            <Card className="group cursor-pointer hover:border-primary-500 transition-all hover:shadow-md">
              <CardBody className="flex flex-col items-center gap-3 py-6">
                <ClipboardPlus size={30} style={{ color: "#b8936a" }} />
                <span className="text-sm font-medium text-text-primary">{t("dash_new_prescription")}</span>
              </CardBody>
            </Card>
          </Link>

          <Link href="/dashboard/appointments">
            <Card className="group cursor-pointer hover:border-primary-500 transition-all hover:shadow-md">
              <CardBody className="flex flex-col items-center gap-3 py-6">
                <CalendarPlus size={30} style={{ color: "#b8936a" }} />
                <span className="text-sm font-medium text-text-primary">{t("dash_schedule_appointment")}</span>
              </CardBody>
            </Card>
          </Link>

          <Link href="/dashboard/register">
            <Card className="group cursor-pointer hover:border-primary-500 transition-all hover:shadow-md">
              <CardBody className="flex flex-col items-center gap-3 py-6">
                <Activity size={30} style={{ color: "#b8936a" }} />
                <span className="text-sm font-medium text-text-primary">{t("dash_log_visit")}</span>
              </CardBody>
            </Card>
          </Link>

          <Link href="/dashboard/register">
            <Card className="group cursor-pointer hover:border-primary-500 transition-all hover:shadow-md">
              <CardBody className="flex flex-col items-center gap-3 py-6">
                <Table2 size={30} style={{ color: "#b8936a" }} />
                <span className="text-sm font-medium text-text-primary">{t("dash_clinic_register")}</span>
              </CardBody>
            </Card>
          </Link>
        </div>
      </div>

      {/* Overdue Follow-ups */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-yellow-500" size={20} />
              <h3 className="text-lg font-serif font-semibold text-text-primary">
                {t("dash_overdue_followups")}
              </h3>
              {overdueFollowups.length > 0 && (
                <Badge variant="warning">{overdueFollowups.length}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {overdueFollowups.length > 0 ? (
            <div className="space-y-3">
              {overdueFollowups.map((patient) => {
                const daysOverdue = differenceInDays(new Date(), new Date(patient.next_followup_date));
                return (
                  <Link
                    key={patient.id}
                    href={`/dashboard/patients/${patient.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-surface hover:bg-primary-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-text-primary text-sm truncate max-w-[150px]" title={capitalizeName(patient.name)}>{capitalizeName(patient.name)}</p>
                      <p className="text-xs text-text-muted">
                        {t("dash_followup_was")} {format(new Date(patient.next_followup_date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Badge variant="warning">{daysOverdue} {daysOverdue !== 1 ? t("dash_days_overdue") : t("dash_day_overdue")}</Badge>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-text-muted text-sm text-center py-6">{t("dash_no_overdue")}</p>
          )}
        </CardBody>
      </Card>

      {/* Growing Together Card */}
      <div
        className="rounded-xl border p-8"
        style={{
          background: "linear-gradient(135deg, #faf8f4, #f5efe6)",
          borderColor: "rgba(184,147,106,0.25)",
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <Sprout size={28} className="text-primary-500 flex-shrink-0" />
          <h2
            className="text-xl font-serif font-semibold text-primary-500 uppercase tracking-widest"
          >
            {t("growing_title")}
          </h2>
        </div>

        <p className="text-text-secondary mb-6 leading-relaxed">
          {t("growing_founding")} <span className="font-semibold text-text-primary">{t("growing_founding_bold")}</span>.{" "}
          {t("growing_message")}
        </p>

        <p className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
          {t("growing_coming")}
        </p>
        <div className="space-y-3 mb-8">
          {([
            { titleKey: "growing_case_queue", descKey: "growing_case_queue_desc" },
            { titleKey: "growing_earn", descKey: "growing_earn_desc" },
            { titleKey: "growing_referral", descKey: "growing_referral_desc" },
            { titleKey: "growing_teleconsult", descKey: "growing_teleconsult_desc" },
          ] as const).map((item) => (
            <div key={item.titleKey} className="flex gap-3">
              <span className="text-primary-500 font-bold mt-0.5 flex-shrink-0">◆</span>
              <div>
                <span className="font-semibold text-text-primary">{t(item.titleKey)}</span>
                <span className="text-text-secondary"> — {t(item.descKey)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Impact sub-card */}
        <div
          className="rounded-lg p-5 mb-6"
          style={{ background: "rgba(184,147,106,0.07)", border: "1px solid rgba(184,147,106,0.15)" }}
        >
          <p className="text-xs font-semibold text-primary-500 uppercase tracking-widest mb-3">
            {t("growing_impact_title")}
          </p>
          <div className="space-y-2">
            {(["growing_impact_1", "growing_impact_2", "growing_impact_3", "growing_impact_4"] as const).map((key) => (
              <div key={key} className="flex gap-2 text-sm text-text-secondary">
                <span className="text-primary-500 flex-shrink-0">•</span>
                <span>{t(key)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Button
            className="bg-primary-500 hover:bg-primary-600 text-white"
            onClick={() => setShowFeedbackModal(true)}
          >
            {t("growing_feedback")}
          </Button>
          <Button
            variant="outline"
            className="border-primary-500 text-primary-500 flex items-center gap-2"
            onClick={handleInvite}
          >
            {inviteCopied ? <Check size={16} /> : <Copy size={16} />}
            {inviteCopied ? t("growing_copied") : t("growing_invite")}
          </Button>
        </div>
      </div>

      {/* Feedback Modal */}
      <Modal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        title={t("growing_feedback_title")}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowFeedbackModal(false)}>{t("common_cancel")}</Button>
            <Button
              className="bg-primary-500 hover:bg-primary-600 text-white"
              onClick={handleSendFeedback}
              loading={feedbackLoading}
              disabled={!feedbackText.trim()}
            >
              {feedbackSent ? t("growing_feedback_sent") : t("growing_feedback_send")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-text-secondary text-sm">
            {t("growing_feedback_desc")}
          </p>
          <Textarea
            label={t("growing_feedback_label")}
            placeholder={t("growing_feedback_placeholder")}
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={5}
          />
        </div>
      </Modal>
    </main>
  );
}
