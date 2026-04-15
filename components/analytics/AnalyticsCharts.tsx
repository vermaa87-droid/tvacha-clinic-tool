"use client";

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
import { useLanguage } from "@/lib/language-context";

/**
 * Chart rendering for the analytics page. Lives in its own file so the
 * ~95 KB recharts library is code-split out of the analytics page's initial
 * bundle — the page shell + stat cards hydrate first, then this chunk loads.
 *
 * Exports two separate components (MainChartsGrid + EarningsCharts) so the
 * parent can show matching skeletons in the right layout slots while the
 * shared recharts chunk is loading.
 */

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

const STATUS_COLORS = ["#4a9a4a", "#d97706", "#8a7e70", "#b8936a"];

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
      <div
        className="w-10 h-10 rounded-full mb-3 flex items-center justify-center"
        style={{ background: "var(--color-primary-200)" }}
      >
        <span style={{ color: "#b8936a", fontSize: "18px" }}>∅</span>
      </div>
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        {t("analytics_no_data")}
      </p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl bg-card overflow-hidden"
      style={{ border: "1px solid rgba(184,147,106,0.2)", boxShadow: "0 1px 4px rgba(90,60,20,0.05)" }}
    >
      <div className="px-3 sm:px-5 pt-4 sm:pt-5 pb-3">
        <h3 className="font-serif font-semibold text-base sm:text-lg" style={{ color: "var(--color-text-primary)" }}>
          {title}
        </h3>
        <div className="mt-2 h-px" style={{ background: "rgba(184,147,106,0.2)" }} />
      </div>
      <div className="px-2 sm:px-5 pb-4 sm:pb-5">{children}</div>
    </div>
  );
}

function ChartLegend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-4">
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
          <span className="text-xs capitalize" style={{ color: "var(--color-text-secondary)" }}>
            {item.name}
          </span>
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

// ── Main charts grid (8 charts) ──────────────────────────────────────────────
interface MainChartsGridProps {
  patientGrowth: Array<{ month: string; count: number }>;
  diseaseDistribution: Array<{ name: string; value: number }>;
  treatmentStatus: Array<{ name: string; value: number }>;
  severityData: Array<{ name: string; value: number }>;
  topConditions: Array<{ name: string; value: number }>;
  appointmentCompletion: Array<{ name: string; value: number }>;
  ageData: Array<{ name: string; value: number }>;
  genderData: Array<{ name: string; value: number }>;
}

export function MainChartsGrid({
  patientGrowth,
  diseaseDistribution,
  treatmentStatus,
  severityData,
  topConditions,
  appointmentCompletion,
  ageData,
  genderData,
}: MainChartsGridProps) {
  const { t } = useLanguage();
  return (
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
              <ChartLegend
                items={diseaseDistribution.map((d, i) => ({
                  name: d.name,
                  color: CHART_COLORS[i % CHART_COLORS.length],
                }))}
              />
            </>
          )
        ) : (
          <NoData />
        )}
      </ChartCard>

      {/* Treatment Status */}
      <ChartCard title={t("analytics_treatment_status")}>
        {treatmentStatus.length > 0 ? (
          treatmentStatus.filter((d) => d.value > 0).length === 1 ? (
            <SinglePieStat
              name={treatmentStatus.find((d) => d.value > 0)!.name}
              value={treatmentStatus.find((d) => d.value > 0)!.value}
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
              <ChartLegend
                items={treatmentStatus.map((d, i) => ({
                  name: d.name,
                  color: CHART_COLORS[i % CHART_COLORS.length],
                }))}
              />
            </>
          )
        ) : (
          <NoData />
        )}
      </ChartCard>

      {/* Severity Distribution */}
      <ChartCard title={t("analytics_severity_dist")}>
        {severityData.some((d) => d.value > 0) ? (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={severityData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barSize={36}>
                <CartesianGrid {...GRID_PROPS} vertical={false} />
                <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(184,147,106,0.06)" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {severityData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={SEVERITY_COLORS[entry.name] ?? CHART_COLORS[0]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <ChartLegend
              items={severityData.map((d) => ({
                name: d.name,
                color: SEVERITY_COLORS[d.name] ?? CHART_COLORS[0],
              }))}
            />
          </>
        ) : (
          <NoData />
        )}
      </ChartCard>

      {/* Top Diagnosed Conditions */}
      <ChartCard title={t("analytics_top_conditions")}>
        {topConditions.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topConditions} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barSize={14}>
              <CartesianGrid {...GRID_PROPS} horizontal={false} />
              <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ ...AXIS_STYLE, fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(184,147,106,0.06)" }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {topConditions.map((_, i) => (
                  <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <NoData />
        )}
      </ChartCard>

      {/* Appointment Completion */}
      <ChartCard title={t("analytics_apt_completion")}>
        {appointmentCompletion.length > 0 ? (
          appointmentCompletion.filter((d) => d.value > 0).length === 1 ? (
            <SinglePieStat
              name={appointmentCompletion.find((d) => d.value > 0)!.name}
              value={appointmentCompletion.find((d) => d.value > 0)!.value}
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
              <ChartLegend
                items={appointmentCompletion.map((d, i) => ({
                  name: d.name,
                  color: CHART_COLORS[i % CHART_COLORS.length],
                }))}
              />
            </>
          )
        ) : (
          <NoData />
        )}
      </ChartCard>

      {/* Age Distribution */}
      <ChartCard title={t("analytics_age_dist")}>
        {ageData.some((d) => d.value > 0) ? (
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
            <ChartLegend
              items={ageData
                .filter((d) => d.value > 0)
                .map((d, i) => ({ name: d.name, color: CHART_COLORS[i % CHART_COLORS.length] }))}
            />
          </>
        ) : (
          <NoData />
        )}
      </ChartCard>

      {/* Gender Distribution */}
      <ChartCard title={t("analytics_gender_dist")}>
        {genderData.length > 0 ? (
          genderData.filter((d) => d.value > 0).length === 1 ? (
            <SinglePieStat
              name={genderData.find((d) => d.value > 0)!.name}
              value={genderData.find((d) => d.value > 0)!.value}
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
              <ChartLegend
                items={genderData.map((d, i) => ({
                  name: d.name,
                  color: CHART_COLORS[i % CHART_COLORS.length],
                }))}
              />
            </>
          )
        ) : (
          <NoData />
        )}
      </ChartCard>
    </div>
  );
}

// ── Earnings charts (3 charts) ───────────────────────────────────────────────
interface EarningsChartsProps {
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  dailyEarnings: Array<{ day: number; amount: number }>;
  statusPie: Array<{ name: string; value: number }>;
  formatINR: (n: number) => string;
}

export function EarningsCharts({
  monthlyRevenue,
  dailyEarnings,
  statusPie,
  formatINR,
}: EarningsChartsProps) {
  const today = new Date().getDate();
  const monthYear = new Date().toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <ChartCard title="Monthly Revenue">
          {monthlyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="month" tick={AXIS_STYLE} />
                <YAxis tick={AXIS_STYLE} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number) => formatINR(v)}
                />
                <Bar dataKey="revenue" fill="#b8936a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoData />
          )}
        </ChartCard>

        <ChartCard title="Payment Status">
          {statusPie.length > 0 ? (
            statusPie.length === 1 ? (
              <SinglePieStat
                name={statusPie[0].name}
                value={statusPie[0].value}
                color={STATUS_COLORS[0]}
              />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={statusPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusPie.map((_, i) => (
                        <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <ChartLegend
                  items={statusPie.map((d, i) => ({
                    name: `${d.name} (${d.value})`,
                    color: STATUS_COLORS[i % STATUS_COLORS.length],
                  }))}
                />
              </>
            )
          ) : (
            <NoData />
          )}
        </ChartCard>
      </div>

      <ChartCard title={`Daily Earnings — ${monthYear}`}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={dailyEarnings}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="day" tick={AXIS_STYLE} />
            <YAxis tick={AXIS_STYLE} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number) => formatINR(v)}
            />
            <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
              {dailyEarnings.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.day === today ? "#2d4a3e" : "#b8936a"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </>
  );
}
