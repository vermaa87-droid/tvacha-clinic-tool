"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import { useRefreshTick } from "@/lib/RefreshContext";
import { format, startOfMonth, startOfWeek, endOfWeek } from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// Premium warm palette — distinct colors for multi-series charts
const CHART_COLORS = [
  "#b8936a", // gold
  "#2d4a3e", // deep green
  "#a67c52", // amber
  "#3d6b5e", // medium green
  "#c4a882", // light gold
  "#8b6f47", // deep bronze
  "#d4c4a8", // warm cream
  "#1a3328", // dark forest
];

// Severity-specific semantic colors
const SEVERITY_COLORS: Record<string, string> = {
  Mild: "#3d6b5e",
  Moderate: "#b8936a",
  Severe: "#8b6f47",
  Critical: "#9b2c2c",
};

const TOOLTIP_STYLE = {
  backgroundColor: "var(--color-card)",
  border: "1px solid rgba(184,147,106,0.3)",
  borderRadius: "8px",
  color: "var(--color-text-primary)",
  fontSize: "12px",
};

const AXIS_STYLE = { fill: "var(--color-text-secondary)", fontSize: 11 };
const GRID_PROPS = { strokeDasharray: "2 6", stroke: "var(--color-separator)" };

function NoData() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-10 h-10 rounded-full mb-3 flex items-center justify-center" style={{ background: "var(--color-primary-200)" }}>
        <span style={{ color: "#b8936a", fontSize: "18px" }}>∅</span>
      </div>
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{t("analytics_no_data")}</p>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  sub?: string;
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div
      className="rounded-xl bg-card px-4 py-4 flex flex-col"
      style={{
        border: "1px solid rgba(184,147,106,0.18)",
        borderLeft: "3px solid #b8936a",
        boxShadow: "0 1px 4px rgba(90,60,20,0.04)",
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)", letterSpacing: "0.08em" }}>{label}</p>
      <p className="text-4xl font-bold leading-none" style={{ color: "var(--color-text-primary)" }}>{value}</p>
      {sub && <p className="text-xs mt-2" style={{ color: "var(--color-text-muted)" }}>{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl bg-card overflow-hidden"
      style={{ border: "1px solid rgba(184,147,106,0.2)", boxShadow: "0 1px 4px rgba(90,60,20,0.05)" }}
    >
      <div className="px-5 pt-5 pb-3">
        <h3 className="font-serif font-semibold text-lg" style={{ color: "var(--color-text-primary)" }}>{title}</h3>
        <div className="mt-2 h-px" style={{ background: "rgba(184,147,106,0.2)" }} />
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

function ChartLegend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-4">
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
          <span className="text-xs capitalize" style={{ color: "var(--color-text-secondary)" }}>{item.name}</span>
        </div>
      ))}
    </div>
  );
}

// For pie charts with only 1 active category — show a styled stat instead of a solid circle
function SinglePieStat({ name, value, color }: { name: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center" style={{ height: 300 }}>
      <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
        <svg width="140" height="140" className="absolute inset-0">
          <circle cx="70" cy="70" r="62" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="4 5" opacity="0.35" />
          <circle cx="70" cy="70" r="50" fill="none" stroke={color} strokeWidth="1" opacity="0.15" />
        </svg>
        <div className="text-center z-10">
          <p className="text-4xl font-bold leading-none" style={{ color }}>100%</p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>{value} total</p>
        </div>
      </div>
      <p className="mt-4 text-sm font-medium capitalize" style={{ color: "var(--color-text-muted)" }}>{name}</p>
    </div>
  );
}

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
      } catch (err) {
        console.error("[analytics] fetch error:", err);
      } finally {
        setLoading(false);
      }
  }, [user]);

  useEffect(() => {
    fetchAll(refreshTick > 0);
  }, [fetchAll, refreshTick]);


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
      <div>
        <h1 className="text-4xl font-serif font-bold text-text-primary">{t("analytics_title")}</h1>
        <p className="text-text-secondary mt-2">{t("analytics_subtitle")}</p>
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

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Patient Growth */}
        <ChartCard title={t("analytics_patient_growth")}>
          {patientGrowth.length >= 2 ? (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={patientGrowth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "rgba(184,147,106,0.2)" }} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={CHART_COLORS[0]}
                    strokeWidth={2.5}
                    dot={{ fill: CHART_COLORS[0], r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: CHART_COLORS[0], strokeWidth: 0 }}
                    name={t("analytics_total_patients")}
                  />
                </LineChart>
              </ResponsiveContainer>
              <ChartLegend items={[{ name: t("analytics_total_patients"), color: CHART_COLORS[0] }]} />
            </>
          ) : (
            <p className="text-center py-12 text-sm" style={{ color: "var(--color-text-muted)" }}>
              {t("analytics_growth_empty")}
            </p>
          )}
        </ChartCard>

        {/* Disease Distribution */}
        <ChartCard title={t("analytics_disease_dist")}>
          {diseaseDistribution.length > 0 ? (
            diseaseDistribution.length === 1 ? (
              <SinglePieStat
                name={diseaseDistribution[0].name}
                value={diseaseDistribution[0].value}
                color={CHART_COLORS[0]}
              />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={diseaseDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={38}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {diseaseDistribution.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <ChartLegend items={diseaseDistribution.map((d, i) => ({ name: d.name, color: CHART_COLORS[i % CHART_COLORS.length] }))} />
              </>
            )
          ) : <NoData />}
        </ChartCard>

        {/* Treatment Status */}
        <ChartCard title={t("analytics_treatment_status")}>
          {treatmentStatus.length > 0 ? (
            treatmentStatus.filter(d => d.value > 0).length === 1 ? (
              <SinglePieStat
                name={treatmentStatus.find(d => d.value > 0)!.name}
                value={treatmentStatus.find(d => d.value > 0)!.value}
                color={CHART_COLORS[0]}
              />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={treatmentStatus}
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={38}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {treatmentStatus.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <ChartLegend items={treatmentStatus.map((d, i) => ({ name: d.name, color: CHART_COLORS[i % CHART_COLORS.length] }))} />
              </>
            )
          ) : <NoData />}
        </ChartCard>

        {/* Severity Distribution */}
        <ChartCard title={t("analytics_severity_dist")}>
          {severityData.some(d => d.value > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={severityData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barSize={36}>
                  <CartesianGrid {...GRID_PROPS} vertical={false} />
                  <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(184,147,106,0.06)" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {severityData.map((entry) => (
                      <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] ?? CHART_COLORS[0]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <ChartLegend items={severityData.map(d => ({ name: d.name, color: SEVERITY_COLORS[d.name] ?? CHART_COLORS[0] }))} />
            </>
          ) : <NoData />}
        </ChartCard>

        {/* Top Diagnosed Conditions */}
        <ChartCard title={t("analytics_top_conditions")}>
          {topConditions.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topConditions} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barSize={14}>
                <CartesianGrid {...GRID_PROPS} horizontal={false} />
                <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} width={120} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(184,147,106,0.06)" }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {topConditions.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </ChartCard>

        {/* Appointment Completion */}
        <ChartCard title={t("analytics_apt_completion")}>
          {appointmentCompletion.length > 0 ? (
            appointmentCompletion.filter(d => d.value > 0).length === 1 ? (
              <SinglePieStat
                name={appointmentCompletion.find(d => d.value > 0)!.name}
                value={appointmentCompletion.find(d => d.value > 0)!.value}
                color={CHART_COLORS[0]}
              />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={appointmentCompletion}
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={38}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {appointmentCompletion.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <ChartLegend items={appointmentCompletion.map((d, i) => ({ name: d.name, color: CHART_COLORS[i % CHART_COLORS.length] }))} />
              </>
            )
          ) : <NoData />}
        </ChartCard>

        {/* Age Distribution */}
        <ChartCard title={t("analytics_age_dist")}>
          {ageData.some(d => d.value > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={ageData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barSize={30}>
                  <CartesianGrid {...GRID_PROPS} vertical={false} />
                  <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(184,147,106,0.06)" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {ageData.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <ChartLegend items={ageData.filter(d => d.value > 0).map((d, i) => ({ name: d.name, color: CHART_COLORS[i % CHART_COLORS.length] }))} />
            </>
          ) : <NoData />}
        </ChartCard>

        {/* Gender Distribution */}
        <ChartCard title={t("analytics_gender_dist")}>
          {genderData.length > 0 ? (
            genderData.filter(d => d.value > 0).length === 1 ? (
              <SinglePieStat
                name={genderData.find(d => d.value > 0)!.name}
                value={genderData.find(d => d.value > 0)!.value}
                color={CHART_COLORS[0]}
              />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={38}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {genderData.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <ChartLegend items={genderData.map((d, i) => ({ name: d.name, color: CHART_COLORS[i % CHART_COLORS.length] }))} />
              </>
            )
          ) : <NoData />}
        </ChartCard>

      </div>

      {/* Quick Insights */}
      <div
        className="rounded-xl bg-card overflow-hidden"
        style={{ border: "1px solid rgba(184,147,106,0.2)", boxShadow: "0 1px 4px rgba(90,60,20,0.05)" }}
      >
        <div className="px-5 pt-5 pb-3">
          <h3 className="font-serif font-semibold text-lg" style={{ color: "var(--color-text-primary)" }}>{t("analytics_quick_insights")}</h3>
          <div className="mt-2 h-px" style={{ background: "rgba(184,147,106,0.2)" }} />
        </div>
        <div className="px-5 pb-4 space-y-0">
          {[
            { label: t("analytics_top_diagnosis"), value: topDiagnosisMonth || "—" },
            { label: t("analytics_avg_visits"), value: avgVisits || "—" },
            { label: t("analytics_recovery_rate"), value: recoveryRate ? `${recoveryRate}%` : "—" },
          ].map((item, i, arr) => (
            <div
              key={item.label}
              className="flex items-center justify-between py-3"
              style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(184,147,106,0.12)" : "none" }}
            >
              <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>{item.label}</span>
              <span className="font-semibold text-sm" style={{ color: "#b8936a" }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Earnings Coming Soon */}
      <div
        className="rounded-xl p-5 text-center"
        style={{ background: "rgba(184,147,106,0.06)", border: "1px solid rgba(184,147,106,0.18)" }}
      >
        <p className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: "#b8936a", letterSpacing: "0.1em" }}>
          {t("analytics_earnings_title")}
        </p>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {t("analytics_earnings_desc")}
        </p>
      </div>
    </main>
  );
}
