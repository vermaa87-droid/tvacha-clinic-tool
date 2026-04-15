"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import { useRefreshTick } from "@/lib/RefreshContext";
import { PatientSatisfactionCard } from "@/components/dashboard/PatientSatisfactionCard";
import { ExportMenu } from "@/components/dashboard/ExportMenu";
import { fetchLetterheadFromDoctor, type ClinicLetterhead } from "@/lib/export";
import { format, startOfMonth, startOfWeek, endOfWeek } from "date-fns";

// recharts (~95 KB) + all chart JSX live in a separate file. Both exports
// resolve to the same chunk, so visiting /dashboard/analytics triggers one
// recharts fetch while the page's stat cards, insights, and headings render
// immediately from the initial bundle.
const MainChartsGrid = dynamic(
  () => import("@/components/analytics/AnalyticsCharts").then((m) => m.MainChartsGrid),
  {
    ssr: false,
    loading: () => (
      <div className="grid md:grid-cols-2 gap-6">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl bg-card animate-pulse"
            style={{
              height: 360,
              border: "1px solid rgba(184,147,106,0.2)",
            }}
          />
        ))}
      </div>
    ),
  }
);

const EarningsCharts = dynamic(
  () => import("@/components/analytics/AnalyticsCharts").then((m) => m.EarningsCharts),
  {
    ssr: false,
    loading: () => (
      <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-card animate-pulse"
              style={{ height: 300, border: "1px solid rgba(184,147,106,0.2)" }}
            />
          ))}
        </div>
        <div
          className="rounded-xl bg-card animate-pulse"
          style={{ height: 260, border: "1px solid rgba(184,147,106,0.2)" }}
        />
      </>
    ),
  }
);

interface StatCardProps {
  label: string;
  value: number;
  sub?: string;
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div
      className="rounded-xl bg-card px-3 sm:px-4 py-3 sm:py-4 flex flex-col"
      style={{
        border: "1px solid rgba(184,147,106,0.18)",
        borderLeft: "3px solid #b8936a",
        boxShadow: "0 1px 4px rgba(90,60,20,0.04)",
      }}
    >
      <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)", letterSpacing: "0.08em" }}>{label}</p>
      <p className="text-2xl sm:text-4xl font-bold leading-none" style={{ color: "var(--color-text-primary)" }}>{value}</p>
      {sub && <p className="text-[10px] sm:text-xs mt-2" style={{ color: "var(--color-text-muted)" }}>{sub}</p>}
    </div>
  );
}

// ChartCard, ChartLegend, SinglePieStat, and NoData now live in
// components/analytics/AnalyticsCharts.tsx (lazy-loaded alongside recharts).

function ageBucket(age: number): string {
  if (age <= 10) return "0-10";
  if (age <= 20) return "11-20";
  if (age <= 30) return "21-30";
  if (age <= 40) return "31-40";
  if (age <= 50) return "41-50";
  if (age <= 60) return "51-60";
  return "60+";
}

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const refreshTick = useRefreshTick();
  const [loading, setLoading] = useState(true);

  // Overview stats
  const [totalPatients, setTotalPatients] = useState(0);
  const [newPatientsMonth, setNewPatientsMonth] = useState(0);
  const [visitsMonth, setVisitsMonth] = useState(0);
  const [prescriptionsMonth, setPrescriptionsMonth] = useState(0);
  const [appointmentsToday, setAppointmentsToday] = useState(0);
  const [appointmentsWeek, setAppointmentsWeek] = useState(0);

  // Chart data
  const [patientGrowth, setPatientGrowth] = useState<
    { month: string; count: number }[]
  >([]);
  const [diseaseDistribution, setDiseaseDistribution] = useState<
    { name: string; value: number }[]
  >([]);
  const [treatmentStatus, setTreatmentStatus] = useState<
    { name: string; value: number }[]
  >([]);
  const [severityData, setSeverityData] = useState<
    { name: string; value: number }[]
  >([]);
  const [topConditions, setTopConditions] = useState<
    { name: string; value: number }[]
  >([]);
  const [appointmentCompletion, setAppointmentCompletion] = useState<
    { name: string; value: number }[]
  >([]);
  const [ageData, setAgeData] = useState<{ name: string; value: number }[]>([]);
  const [genderData, setGenderData] = useState<
    { name: string; value: number }[]
  >([]);

  // Earnings data
  const [fees, setFees] = useState<{ id: string; amount: number; status: string; created_at: string }[]>([]);

  // Quick insights
  const [topDiagnosisMonth, setTopDiagnosisMonth] = useState<string | null>(
    null
  );
  const [avgVisits, setAvgVisits] = useState<string | null>(null);
  const [recoveryRate, setRecoveryRate] = useState<string | null>(null);

  const fetchAll = useCallback(async (silent?: boolean) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
        const now = new Date();
        const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
        const todayStr = format(now, "yyyy-MM-dd");
        const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
        const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
        const monthStartISO = startOfMonth(now).toISOString();

        const [
          patientsCountRes,
          newPatientsRes,
          visitsMonthRes,
          prescriptionsMonthRes,
          appointmentsTodayRes,
          appointmentsWeekRes,
          allPatientsRes,
          allPrescriptionsRes,
          allAppointmentsRes,
          prescriptionsThisMonthRes,
          allVisitsRes,
          allFeesRes,
        ] = await Promise.all([
          // 1. Total patients
          supabase
            .from("patients")
            .select("id", { count: "exact" })
            .eq("linked_doctor_id", user.id),
          // 2. New patients this month
          supabase
            .from("patients")
            .select("id", { count: "exact" })
            .eq("linked_doctor_id", user.id)
            .gte("created_at", monthStartISO),
          // 3. Visits this month
          supabase
            .from("visits")
            .select("id", { count: "exact" })
            .eq("doctor_id", user.id)
            .gte("visit_date", monthStart),
          // 4. Prescriptions this month
          supabase
            .from("prescriptions")
            .select("id", { count: "exact" })
            .eq("doctor_id", user.id)
            .gte("created_at", monthStartISO),
          // 5. Appointments today
          supabase
            .from("appointments")
            .select("id", { count: "exact" })
            .eq("doctor_id", user.id)
            .eq("appointment_date", todayStr),
          // 6. Appointments this week
          supabase
            .from("appointments")
            .select("id", { count: "exact" })
            .eq("doctor_id", user.id)
            .gte("appointment_date", weekStart)
            .lte("appointment_date", weekEnd),
          // 7. All patients (for charts)
          supabase
            .from("patients")
            .select("created_at, treatment_status, severity, age, gender, current_diagnosis")
            .eq("linked_doctor_id", user.id),
          // 8. All prescriptions (for charts)
          supabase
            .from("prescriptions")
            .select("diagnosis, created_at")
            .eq("doctor_id", user.id),
          // 9. All appointments (for completion chart)
          supabase
            .from("appointments")
            .select("status")
            .eq("doctor_id", user.id),
          // 10. Prescriptions this month (for insights)
          supabase
            .from("prescriptions")
            .select("diagnosis")
            .eq("doctor_id", user.id)
            .gte("created_at", monthStartISO),
          // 11. All visits (for avg visits insight)
          supabase
            .from("visits")
            .select("id", { count: "exact" })
            .eq("doctor_id", user.id),
          // 12. All fee records (for earnings analytics)
          supabase
            .from("patient_fees")
            .select("id, amount, status, fee_type, created_at")
            .eq("doctor_id", user.id)
            .order("created_at", { ascending: true }),
        ]);

        // --- Overview Stats ---
        const totalPat = patientsCountRes.count || 0;
        setTotalPatients(totalPat);
        setNewPatientsMonth(newPatientsRes.count || 0);
        setVisitsMonth(visitsMonthRes.count || 0);
        setPrescriptionsMonth(prescriptionsMonthRes.count || 0);
        setAppointmentsToday(appointmentsTodayRes.count || 0);
        setAppointmentsWeek(appointmentsWeekRes.count || 0);

        const patients = allPatientsRes.data || [];
        const prescriptions = allPrescriptionsRes.data || [];
        const appointments = allAppointmentsRes.data || [];

        // --- Patient Growth (cumulative by month) ---
        const monthCounts: Record<string, number> = {};
        patients.forEach((p) => {
          if (p.created_at) {
            const key = format(new Date(p.created_at), "yyyy-MM");
            monthCounts[key] = (monthCounts[key] || 0) + 1;
          }
        });
        const sortedMonths = Object.keys(monthCounts).sort();
        let cumulative = 0;
        const growthData = sortedMonths.map((m) => {
          cumulative += monthCounts[m];
          return {
            month: format(new Date(m + "-01"), "MMM"),
            count: cumulative,
          };
        });
        setPatientGrowth(growthData);

        // --- Disease Distribution (from patient classifications + prescriptions) ---
        const diagCounts: Record<string, number> = {};
        patients.forEach((p) => {
          const d = (p.current_diagnosis as string | null)?.trim();
          if (d) diagCounts[d] = (diagCounts[d] || 0) + 1;
        });
        // Also include prescription diagnoses for broader coverage
        prescriptions.forEach((p) => {
          const d = p.diagnosis?.trim();
          if (d && !diagCounts[d]) diagCounts[d] = 0;
          if (d) diagCounts[d] += 1;
        });
        const sortedDiag = Object.entries(diagCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([name, value]) => ({ name, value }));
        setDiseaseDistribution(sortedDiag);

        // --- Treatment Status Breakdown ---
        const statusCounts: Record<string, number> = {};
        patients.forEach((p) => {
          const s = p.treatment_status || "unknown";
          statusCounts[s] = (statusCounts[s] || 0) + 1;
        });
        setTreatmentStatus(
          Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
        );

        // --- Severity Distribution ---
        const sevCounts: Record<string, number> = {
          mild: 0,
          moderate: 0,
          severe: 0,
          critical: 0,
        };
        patients.forEach((p) => {
          const s = p.severity?.toLowerCase();
          if (s && s in sevCounts) sevCounts[s] += 1;
        });
        setSeverityData(
          Object.entries(sevCounts).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
          }))
        );

        // --- Top Diagnosed Conditions (top 10, horizontal) ---
        const topDiag = Object.entries(diagCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name, value]) => ({ name, value }));
        setTopConditions(topDiag);

        // --- Appointment Completion Rate ---
        const compCounts: Record<string, number> = {};
        appointments.forEach((a) => {
          const s = a.status || "unknown";
          compCounts[s] = (compCounts[s] || 0) + 1;
        });
        setAppointmentCompletion(
          Object.entries(compCounts).map(([name, value]) => ({ name, value }))
        );

        // --- Age Distribution ---
        const ageCounts: Record<string, number> = {
          "0-10": 0,
          "11-20": 0,
          "21-30": 0,
          "31-40": 0,
          "41-50": 0,
          "51-60": 0,
          "60+": 0,
        };
        patients.forEach((p) => {
          if (p.age != null) {
            const bucket = ageBucket(p.age);
            ageCounts[bucket] += 1;
          }
        });
        setAgeData(
          Object.entries(ageCounts).map(([name, value]) => ({ name, value }))
        );

        // --- Gender Distribution ---
        const genCounts: Record<string, number> = {};
        patients.forEach((p) => {
          const g = p.gender || "unknown";
          genCounts[g] = (genCounts[g] || 0) + 1;
        });
        setGenderData(
          Object.entries(genCounts).map(([name, value]) => ({ name, value }))
        );

        // --- Quick Insights ---
        // Most common diagnosis this month
        const monthDiagCounts: Record<string, number> = {};
        (prescriptionsThisMonthRes.data || []).forEach((p) => {
          const d = p.diagnosis?.trim();
          if (d) monthDiagCounts[d] = (monthDiagCounts[d] || 0) + 1;
        });
        const topMonthDiag = Object.entries(monthDiagCounts).sort(
          (a, b) => b[1] - a[1]
        )[0];
        setTopDiagnosisMonth(topMonthDiag ? topMonthDiag[0] : null);

        // Average visits per patient
        const totalVisits = allVisitsRes.count || 0;
        if (totalPat > 0) {
          setAvgVisits((totalVisits / totalPat).toFixed(1));
        } else {
          setAvgVisits(null);
        }

        // Recovery rate
        const recoveredCount = patients.filter(
          (p) => p.treatment_status === "recovered"
        ).length;
        if (totalPat > 0) {
          setRecoveryRate(((recoveredCount / totalPat) * 100).toFixed(1));
        } else {
          setRecoveryRate(null);
        }

        // --- Earnings data ---
        const feeRows = (allFeesRes.data || []).map((f: Record<string, unknown>) => ({
          id: f.id as string,
          amount: Number(f.amount) || 0,
          status: (f.status as string) || "unpaid",
          created_at: f.created_at as string,
        }));
        setFees(feeRows);
      } catch (err) {
        console.error("[analytics] fetch error:", err);
      } finally {
        setLoading(false);
      }
  }, [user]);

  useEffect(() => {
    fetchAll(refreshTick > 0);
  }, [fetchAll, refreshTick]);

  // ─── Earnings computed data ───────────────────────────────────────────────

  const formatINR = (n: number) => "₹" + n.toLocaleString("en-IN");

  const earningsData = useMemo(() => {
    const now = new Date();
    const paidFees = fees.filter((f) => f.status === "paid");
    const totalRevenue = paidFees.reduce((s, f) => s + f.amount, 0);
    const thisMonthPaid = paidFees.filter((f) => {
      const d = new Date(f.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const thisMonthRevenue = thisMonthPaid.reduce((s, f) => s + f.amount, 0);
    const avgFee = paidFees.length > 0 ? Math.round(totalRevenue / paidFees.length) : 0;
    const pendingPayments = fees.filter((f) => f.status === "unpaid").reduce((s, f) => s + f.amount, 0);
    const collectionRate = fees.length > 0 ? Math.round((paidFees.length / fees.length) * 100) : 0;
    const highestFee = paidFees.length > 0 ? Math.max(...paidFees.map((f) => f.amount)) : 0;

    // Monthly revenue chart
    const monthMap: Record<string, number> = {};
    paidFees.forEach((f) => {
      const key = new Date(f.created_at).toLocaleString("en-IN", { month: "short", year: "2-digit" });
      monthMap[key] = (monthMap[key] || 0) + f.amount;
    });
    const monthlyRevenue = Object.entries(monthMap).map(([month, revenue]) => ({ month, revenue }));

    // Daily earnings this month
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayMap: Record<number, number> = {};
    thisMonthPaid.forEach((f) => {
      const day = new Date(f.created_at).getDate();
      dayMap[day] = (dayMap[day] || 0) + f.amount;
    });
    const dailyEarnings = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      amount: dayMap[i + 1] || 0,
    }));

    // Payment status breakdown
    const statusMap: Record<string, number> = {};
    fees.forEach((f) => {
      const s = f.status === "paid" ? "Paid" : f.status === "unpaid" ? "Pending" : f.status === "waived" ? "Waived" : "Other";
      statusMap[s] = (statusMap[s] || 0) + 1;
    });
    const statusPie = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    return { totalRevenue, thisMonthRevenue, avgFee, pendingPayments, collectionRate, highestFee, monthlyRevenue, dailyEarnings, statusPie };
  }, [fees]);


  if (loading) {
    return (
      <main className="space-y-8">
        <div className="space-y-2">
          <div className="h-10 bg-primary-200 rounded w-40 animate-pulse" />
          <div className="h-4 bg-primary-100 rounded w-60 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-primary-200 rounded-xl animate-pulse"
              style={{ borderLeft: "3px solid rgba(184,147,106,0.3)" }} />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-80 bg-primary-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-text-primary">{t("analytics_title")}</h1>
          <p className="text-text-secondary mt-2">{t("analytics_subtitle")}</p>
        </div>
        <AnalyticsExport
          doctorId={user?.id}
          totals={{
            totalPatients,
            newPatientsMonth,
            visitsMonth,
            prescriptionsMonth,
            appointmentsToday,
            appointmentsWeek,
          }}
        />
      </div>

      {/* Overview Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label={t("analytics_total_patients")} value={totalPatients} sub={t("dash_all_time")} />
        <StatCard label={t("analytics_new_patients")} value={newPatientsMonth} sub={t("analytics_this_month")} />
        <StatCard label={t("analytics_total_visits")} value={visitsMonth} sub={t("analytics_this_month")} />
        <StatCard label={t("analytics_prescriptions")} value={prescriptionsMonth} sub={t("analytics_this_month")} />
        <StatCard label={t("analytics_appointments")} value={appointmentsToday} sub={t("dash_today")} />
        <StatCard label={t("analytics_appointments")} value={appointmentsWeek} sub={t("analytics_this_week")} />
      </div>

      {/* Charts Grid — recharts is code-split via MainChartsGrid */}
      <MainChartsGrid
        patientGrowth={patientGrowth}
        diseaseDistribution={diseaseDistribution}
        treatmentStatus={treatmentStatus}
        severityData={severityData}
        topConditions={topConditions}
        appointmentCompletion={appointmentCompletion}
        ageData={ageData}
        genderData={genderData}
      />

      {/* Quick Insights */}
      <div
        className="rounded-xl bg-card overflow-hidden"
        style={{ border: "1px solid rgba(184,147,106,0.2)", boxShadow: "0 1px 4px rgba(90,60,20,0.05)" }}
      >
        <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
          <h3 className="font-serif font-semibold text-base sm:text-lg" style={{ color: "var(--color-text-primary)" }}>{t("analytics_quick_insights")}</h3>
          <div className="mt-2 h-px" style={{ background: "rgba(184,147,106,0.2)" }} />
        </div>
        <div className="px-4 sm:px-5 pb-4 space-y-0">
          {[
            { label: t("analytics_top_diagnosis"), value: topDiagnosisMonth || "—" },
            { label: t("analytics_avg_visits"), value: avgVisits || "—" },
            { label: t("analytics_recovery_rate"), value: recoveryRate ? `${recoveryRate}%` : "—" },
          ].map((item, i, arr) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 py-3"
              style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(184,147,106,0.12)" : "none" }}
            >
              <span className="text-xs sm:text-sm" style={{ color: "var(--color-text-muted)" }}>{item.label}</span>
              <span className="font-semibold text-xs sm:text-sm text-right flex-shrink-0 max-w-[50%] truncate" style={{ color: "#b8936a" }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── PATIENT SATISFACTION ───────────────────────────────────────── */}
      {user?.id && (
        <div className="mt-10">
          <PatientSatisfactionCard doctorId={user.id} />
        </div>
      )}

      {/* ── EARNINGS ANALYTICS ──────────────────────────────────────────── */}
      <div className="mt-10">
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#b8936a", letterSpacing: "0.14em" }}>
          Revenue
        </p>
        <h2 className="text-xl sm:text-2xl font-serif font-bold mb-6" style={{ color: "var(--color-text-primary)" }}>
          Earnings Analytics
        </h2>

        {fees.length === 0 ? (
          <div className="rounded-xl p-8 text-center bg-card" style={{ border: "1px solid var(--color-primary-200)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(184,147,106,0.12)" }}>
              <span style={{ color: "#b8936a", fontSize: 22 }}>₹</span>
            </div>
            <p className="font-semibold text-text-primary mb-1">No earnings data yet</p>
            <p className="text-sm text-text-muted">Start logging consultation fees to see your earnings analytics</p>
          </div>
        ) : (
          <>
            {/* Earnings stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
              {[
                { label: "Total Revenue", val: formatINR(earningsData.totalRevenue) },
                { label: "This Month", val: formatINR(earningsData.thisMonthRevenue) },
                { label: "Avg Fee/Visit", val: formatINR(earningsData.avgFee) },
                { label: "Pending", val: formatINR(earningsData.pendingPayments) },
                { label: "Collection Rate", val: `${earningsData.collectionRate}%` },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl bg-card px-3 sm:px-4 py-3 sm:py-4 flex flex-col"
                  style={{ border: "1px solid rgba(184,147,106,0.18)", borderLeft: "3px solid #b8936a", boxShadow: "0 1px 4px rgba(90,60,20,0.04)" }}
                >
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)", letterSpacing: "0.08em" }}>{s.label}</p>
                  <p className="text-lg sm:text-2xl font-bold leading-none" style={{ color: "var(--color-text-primary)" }}>{s.val}</p>
                </div>
              ))}
            </div>

            {/* Charts row + Daily earnings — recharts code-split via EarningsCharts */}
            <EarningsCharts
              monthlyRevenue={earningsData.monthlyRevenue}
              dailyEarnings={earningsData.dailyEarnings}
              statusPie={earningsData.statusPie}
              formatINR={formatINR}
            />

            {/* Earnings quick insights */}
            <div className="rounded-xl p-4 sm:p-5 mt-5 bg-card" style={{ border: "1px solid var(--color-primary-200)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#b8936a", letterSpacing: "0.1em" }}>Earnings Insights</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Revenue This Month</p>
                  <p className="text-lg font-bold" style={{ color: "#b8936a" }}>{formatINR(earningsData.thisMonthRevenue)}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Highest Single Fee</p>
                  <p className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>{formatINR(earningsData.highestFee)}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Outstanding Payments</p>
                  <p className="text-lg font-bold" style={{ color: earningsData.pendingPayments > 0 ? "#d97706" : "var(--color-text-primary)" }}>
                    {earningsData.pendingPayments > 0 ? formatINR(earningsData.pendingPayments) : "None"}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

interface AnalyticsExportProps {
  doctorId?: string;
  totals: {
    totalPatients: number;
    newPatientsMonth: number;
    visitsMonth: number;
    prescriptionsMonth: number;
    appointmentsToday: number;
    appointmentsWeek: number;
  };
}

function AnalyticsExport({ doctorId, totals }: AnalyticsExportProps) {
  const { t } = useLanguage();
  const [letterhead, setLetterhead] = useState<ClinicLetterhead | null>(null);

  useEffect(() => {
    if (!doctorId) return;
    fetchLetterheadFromDoctor(doctorId).then(setLetterhead);
  }, [doctorId]);

  const rows = [
    { metric: t("analytics_total_patients"), value: totals.totalPatients, period: t("dash_all_time") },
    { metric: t("analytics_new_patients"), value: totals.newPatientsMonth, period: t("analytics_this_month") },
    { metric: t("analytics_total_visits"), value: totals.visitsMonth, period: t("analytics_this_month") },
    { metric: t("analytics_prescriptions"), value: totals.prescriptionsMonth, period: t("analytics_this_month") },
    { metric: t("analytics_appointments"), value: totals.appointmentsToday, period: t("dash_today") },
    { metric: t("analytics_appointments"), value: totals.appointmentsWeek, period: t("analytics_this_week") },
  ];

  return (
    <ExportMenu<(typeof rows)[number]>
      title={t("analytics_title")}
      filename="tvacha-analytics-summary"
      letterhead={letterhead}
      rows={rows}
      columns={[
        { key: "metric", label: "Metric" },
        { key: "value", label: "Value" },
        { key: "period", label: "Period" },
      ]}
    />
  );
}
