"use client";

import { useEffect, useState } from "react";
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

interface ActivityItem {
  type: "patient" | "prescription" | "visit";
  label: string;
  created_at: string;
}

export default function DashboardHome() {
  const { user, doctor } = useAuthStore();
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

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
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
        ]);

        setTotalPatients(patientsRes.count || 0);
        setVisitsToday(visitsTodayRes.count || 0);
        setAppointmentsToday(appointmentsTodayRes.count || 0);
        setFollowupsDueThisWeek(followupsDueRes.count || 0);
        setOverdueFollowups(overdueFollowupsRes.data || []);
        setTodaySchedule((scheduleRes.data as Appointment[]) || []);

        // Merge recent activity
        const activities: ActivityItem[] = [];

        if (recentPatientsRes.data) {
          for (const p of recentPatientsRes.data) {
            activities.push({
              type: "patient",
              label: `Added patient ${p.name}`,
              created_at: p.created_at,
            });
          }
        }
        if (recentPrescriptionsRes.data) {
          for (const p of recentPrescriptionsRes.data as any[]) {
            activities.push({
              type: "prescription",
              label: `Created prescription for ${p.patients?.name || "Unknown"}`,
              created_at: p.created_at,
            });
          }
        }
        if (recentVisitsRes.data) {
          for (const v of recentVisitsRes.data as any[]) {
            activities.push({
              type: "visit",
              label: `Logged visit for ${v.patients?.name || "Unknown"}`,
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
    };
    fetchData();
  }, [user]);

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
      <div className="rounded-xl bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 p-6">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-text-primary">
          {getGreeting()}, {displayName}
        </h1>
        <p className="text-text-secondary mt-2">
          {format(new Date(), "EEEE, MMMM do, yyyy")}
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm font-medium">Total Patients</span>
              <Users className="text-primary-500" size={20} />
            </div>
            <p className="text-3xl font-bold text-primary-500">{totalPatients}</p>
            <p className="text-text-muted text-xs">All time</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm font-medium">Visits Today</span>
              <Activity className="text-primary-500" size={20} />
            </div>
            <p className="text-3xl font-bold text-primary-500">{visitsToday}</p>
            <p className="text-text-muted text-xs">Today</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm font-medium">Appointments</span>
              <Calendar className="text-primary-500" size={20} />
            </div>
            <p className="text-3xl font-bold text-primary-500">{appointmentsToday}</p>
            <p className="text-text-muted text-xs">Scheduled today</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm font-medium">Follow-ups Due</span>
              <CalendarPlus className="text-primary-500" size={20} />
            </div>
            <p className="text-3xl font-bold text-primary-500">{followupsDueThisWeek}</p>
            <p className="text-text-muted text-xs">This week</p>
          </CardBody>
        </Card>
      </div>

      {/* Today's Schedule & Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <h3 className="text-lg font-serif font-semibold text-text-primary">
                Today&apos;s Schedule
              </h3>
              <Link
                href="/dashboard/appointments"
                className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
              >
                View all <ChevronRight size={14} />
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            <p className="text-sm font-medium text-text-secondary mb-3">
              Patients Today: <span className="text-primary-500 font-bold">{appointmentsToday}</span>
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
                        <p className="font-medium text-text-primary text-sm">
                          {apt.patients?.name || "Unknown"}
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
                <Calendar className="mx-auto text-primary-200 mb-3" size={32} />
                <p className="text-text-muted text-sm">No appointments today</p>
                <Link href="/dashboard/appointments">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary-500 text-primary-500 mt-3"
                  >
                    Schedule One
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
              Recent Activity
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
                      <p className="text-sm text-text-primary">{item.label}</p>
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
                <p className="text-text-muted text-sm">No recent activity yet</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-serif font-semibold text-text-primary mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Link href="/dashboard/patients">
            <Card className="group cursor-pointer hover:border-primary-500 transition-all hover:shadow-md">
              <CardBody className="flex flex-col items-center gap-3 py-6">
                <div className="p-3 rounded-full bg-primary-50 group-hover:bg-primary-100 transition-colors">
                  <UserPlus className="text-primary-500" size={22} />
                </div>
                <span className="text-sm font-medium text-text-primary">Add Patient</span>
              </CardBody>
            </Card>
          </Link>

          <Link href="/dashboard/prescriptions">
            <Card className="group cursor-pointer hover:border-primary-500 transition-all hover:shadow-md">
              <CardBody className="flex flex-col items-center gap-3 py-6">
                <div className="p-3 rounded-full bg-primary-50 group-hover:bg-primary-100 transition-colors">
                  <ClipboardPlus className="text-primary-500" size={22} />
                </div>
                <span className="text-sm font-medium text-text-primary">New Prescription</span>
              </CardBody>
            </Card>
          </Link>

          <Link href="/dashboard/appointments">
            <Card className="group cursor-pointer hover:border-primary-500 transition-all hover:shadow-md">
              <CardBody className="flex flex-col items-center gap-3 py-6">
                <div className="p-3 rounded-full bg-primary-50 group-hover:bg-primary-100 transition-colors">
                  <CalendarPlus className="text-primary-500" size={22} />
                </div>
                <span className="text-sm font-medium text-text-primary">Schedule Appointment</span>
              </CardBody>
            </Card>
          </Link>

          <Link href="/dashboard/register">
            <Card className="group cursor-pointer hover:border-primary-500 transition-all hover:shadow-md">
              <CardBody className="flex flex-col items-center gap-3 py-6">
                <div className="p-3 rounded-full bg-primary-50 group-hover:bg-primary-100 transition-colors">
                  <Activity className="text-primary-500" size={22} />
                </div>
                <span className="text-sm font-medium text-text-primary">Log Visit</span>
              </CardBody>
            </Card>
          </Link>

          <Link href="/dashboard/register">
            <Card className="group cursor-pointer hover:border-primary-500 transition-all hover:shadow-md">
              <CardBody className="flex flex-col items-center gap-3 py-6">
                <div className="p-3 rounded-full bg-primary-50 group-hover:bg-primary-100 transition-colors">
                  <Table2 className="text-primary-500" size={22} />
                </div>
                <span className="text-sm font-medium text-text-primary">Clinic Register</span>
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
                Overdue Follow-ups
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
                      <p className="font-medium text-text-primary text-sm">{patient.name}</p>
                      <p className="text-xs text-text-muted">
                        Follow-up was {format(new Date(patient.next_followup_date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Badge variant="warning">{daysOverdue} day{daysOverdue !== 1 ? "s" : ""} overdue</Badge>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-text-muted text-sm text-center py-6">No overdue follow-ups</p>
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
            Growing Together
          </h2>
        </div>

        <p className="text-text-secondary mb-6 leading-relaxed">
          You&apos;re one of our <span className="font-semibold text-text-primary">founding doctors</span>.
          Right now, Tvacha Clinic Tool is in its early phase — we&apos;re building the AI diagnosis
          pipeline and onboarding our first clinics.
        </p>

        <p className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
          What&apos;s coming
        </p>
        <div className="space-y-3 mb-8">
          {[
            {
              title: "AI Case Queue",
              desc: "Consumer app users will send skin photos for AI pre-screening. You'll review flagged cases and earn per diagnosis.",
            },
            {
              title: "Earn Per Review",
              desc: "₹200 per AI case you review and approve/correct. The more users we onboard, the more cases flow to you.",
            },
            {
              title: "Patient Referrals",
              desc: "Your referral code (in Settings) lets patients link directly to your clinic from the Tvacha app.",
            },
            {
              title: "Tele-Consultation",
              desc: "Video consults with patients at ₹199/₹399/₹599 tiers, with your share per session.",
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-3">
              <span className="text-primary-500 font-bold mt-0.5 flex-shrink-0">◆</span>
              <div>
                <span className="font-semibold text-text-primary">{item.title}</span>
                <span className="text-text-secondary"> — {item.desc}</span>
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
            Your Impact as a Founding Doctor
          </p>
          <div className="space-y-2">
            {[
              "Help us test & improve the AI diagnosis system",
              "Your feedback directly shapes the product roadmap",
              "Early doctors get priority access to paid features when they launch",
              "Founding Doctor badge on your profile — permanent recognition",
            ].map((item) => (
              <div key={item} className="flex gap-2 text-sm text-text-secondary">
                <span className="text-primary-500 flex-shrink-0">•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Button
            className="bg-primary-500 hover:bg-primary-600 text-white"
            onClick={() => setShowFeedbackModal(true)}
          >
            Share Feedback
          </Button>
          <Button
            variant="outline"
            className="border-primary-500 text-primary-500 flex items-center gap-2"
            onClick={handleInvite}
          >
            {inviteCopied ? <Check size={16} /> : <Copy size={16} />}
            {inviteCopied ? "Link Copied!" : "Invite a Colleague"}
          </Button>
        </div>
      </div>

      {/* Feedback Modal */}
      <Modal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        title="Share Your Feedback"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowFeedbackModal(false)}>Cancel</Button>
            <Button
              className="bg-primary-500 hover:bg-primary-600 text-white"
              onClick={handleSendFeedback}
              loading={feedbackLoading}
              disabled={!feedbackText.trim()}
            >
              {feedbackSent ? "Sent! Thank you ✓" : "Send Feedback"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-text-secondary text-sm">
            What would you like to see in Tvacha? Bug reports, feature ideas, workflow suggestions — all welcome.
          </p>
          <Textarea
            label="Your message"
            placeholder="e.g., It would help if I could search patients by phone number..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={5}
          />
        </div>
      </Modal>
    </main>
  );
}
