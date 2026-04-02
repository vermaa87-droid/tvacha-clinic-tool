"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
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
  Legend,
} from "recharts";

const CHART_COLORS = [
  "#b8936a",
  "#d4b896",
  "#c9a584",
  "#a48155",
  "#9a7a4f",
  "#c4a882",
  "#8b6f47",
  "#dcc5a0",
];

const TOOLTIP_STYLE = {
  backgroundColor: "#f2efe9",
  border: "1px solid #e8e0d0",
};

function NoData() {
  const { t } = useLanguage();
  return (
    <p className="text-text-muted text-center py-12 text-sm">{t("analytics_no_data")}</p>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  sub?: string;
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <Card>
      <CardBody className="space-y-1">
        <p className="text-sm text-text-secondary">{label}</p>
        <p className="text-3xl font-bold text-primary-500">{value}</p>
        {sub && <p className="text-xs text-text-muted">{sub}</p>}
      </CardBody>
    </Card>
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
            .select("created_at, treatment_status, severity, age, gender")
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

        // --- Disease Distribution (top 8 by diagnosis) ---
        const diagCounts: Record<string, number> = {};
        prescriptions.forEach((p) => {
          const d = p.diagnosis?.trim();
          if (d) diagCounts[d] = (diagCounts[d] || 0) + 1;
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
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-primary-200 rounded w-1/3" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-primary-200 rounded-lg" />
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-80 bg-primary-200 rounded-lg" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-serif font-bold text-text-primary">
          {t("analytics_title")}
        </h1>
        <p className="text-text-secondary mt-2">
          {t("analytics_subtitle")}
        </p>
      </div>

      {/* Overview Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label={t("analytics_total_patients")} value={totalPatients} sub={t("dash_all_time")} />
        <StatCard
          label={t("analytics_new_patients")}
          value={newPatientsMonth}
          sub={t("analytics_this_month")}
        />
        <StatCard label={t("analytics_total_visits")} value={visitsMonth} sub={t("analytics_this_month")} />
        <StatCard
          label={t("analytics_prescriptions")}
          value={prescriptionsMonth}
          sub={t("analytics_this_month")}
        />
        <StatCard
          label={t("analytics_appointments")}
          value={appointmentsToday}
          sub={t("dash_today")}
        />
        <StatCard
          label={t("analytics_appointments")}
          value={appointmentsWeek}
          sub={t("analytics_this_week")}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Patient Growth */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">
              {t("analytics_patient_growth")}
            </h3>
          </CardHeader>
          <CardBody>
            {patientGrowth.length >= 2 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={patientGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d0" />
                  <XAxis dataKey="month" stroke="#9a8a76" />
                  <YAxis stroke="#9a8a76" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={CHART_COLORS[0]}
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS[0] }}
                    name={t("analytics_total_patients")}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-text-muted text-center py-12 text-sm">
                {patientGrowth.length < 2
                  ? t("analytics_growth_empty")
                  : t("analytics_no_data")}
              </p>
            )}
          </CardBody>
        </Card>

        {/* Disease Distribution */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">
              {t("analytics_disease_dist")}
            </h3>
          </CardHeader>
          <CardBody>
            {diseaseDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={diseaseDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                  >
                    {diseaseDistribution.map((_, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <NoData />
            )}
          </CardBody>
        </Card>

        {/* Treatment Status Breakdown */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">
              {t("analytics_treatment_status")}
            </h3>
          </CardHeader>
          <CardBody>
            {treatmentStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={treatmentStatus}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                  >
                    {treatmentStatus.map((_, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <NoData />
            )}
          </CardBody>
        </Card>

        {/* Severity Distribution */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">
              {t("analytics_severity_dist")}
            </h3>
          </CardHeader>
          <CardBody>
            {severityData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={severityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d0" />
                  <XAxis dataKey="name" stroke="#9a8a76" />
                  <YAxis stroke="#9a8a76" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" fill={CHART_COLORS[0]}>
                    {severityData.map((_, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoData />
            )}
          </CardBody>
        </Card>

        {/* Top Diagnosed Conditions (horizontal) */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">
              {t("analytics_top_conditions")}
            </h3>
          </CardHeader>
          <CardBody>
            {topConditions.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topConditions} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d0" />
                  <XAxis type="number" stroke="#9a8a76" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#9a8a76"
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" fill={CHART_COLORS[0]}>
                    {topConditions.map((_, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoData />
            )}
          </CardBody>
        </Card>

        {/* Appointment Completion Rate */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">
              {t("analytics_apt_completion")}
            </h3>
          </CardHeader>
          <CardBody>
            {appointmentCompletion.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={appointmentCompletion}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                  >
                    {appointmentCompletion.map((_, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <NoData />
            )}
          </CardBody>
        </Card>

        {/* Age Distribution */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">
              {t("analytics_age_dist")}
            </h3>
          </CardHeader>
          <CardBody>
            {ageData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d0" />
                  <XAxis dataKey="name" stroke="#9a8a76" />
                  <YAxis stroke="#9a8a76" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" fill={CHART_COLORS[0]}>
                    {ageData.map((_, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoData />
            )}
          </CardBody>
        </Card>

        {/* Gender Distribution */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">
              {t("analytics_gender_dist")}
            </h3>
          </CardHeader>
          <CardBody>
            {genderData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                  >
                    {genderData.map((_, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <NoData />
            )}
          </CardBody>
        </Card>
      </div>

      {/* Quick Insights */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">
            {t("analytics_quick_insights")}
          </h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex justify-between">
            <span className="text-text-secondary">
              {t("analytics_top_diagnosis")}
            </span>
            <span className="font-semibold text-primary-500">
              {topDiagnosisMonth || "\u2014"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">
              {t("analytics_avg_visits")}
            </span>
            <span className="font-semibold text-primary-500">
              {avgVisits || "\u2014"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">{t("analytics_recovery_rate")}</span>
            <span className="font-semibold text-primary-500">
              {recoveryRate ? `${recoveryRate}%` : "\u2014"}
            </span>
          </div>
        </CardBody>
      </Card>

      {/* Earnings Coming Soon */}
      <Card>
        <CardBody>
          <div
            className="rounded-lg p-5 text-center"
            style={{
              background: "rgba(184,147,106,0.06)",
              border: "1px solid rgba(184,147,106,0.15)",
            }}
          >
            <p className="text-sm font-semibold text-primary-500 uppercase tracking-wider mb-2">
              {t("analytics_earnings_title")}
            </p>
            <p className="text-text-muted text-sm">
              {t("analytics_earnings_desc")}
            </p>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}
