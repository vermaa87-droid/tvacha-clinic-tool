"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Package as PackageIcon,
  AlertTriangle,
  CheckCircle2,
  IndianRupee,
  Settings as SettingsIcon,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import {
  expireOverduePackages,
  getPackageProgress,
} from "@/lib/usePackageSession";
import type { Patient, PatientPackage } from "@/lib/types";

type PatientLite = Pick<Patient, "id" | "name" | "phone">;
type PackageWithPatient = Omit<PatientPackage, "patients"> & {
  patients?: PatientLite | null;
};

export default function PackagesDashboardPage() {
  const { doctor } = useAuthStore();
  const { t } = useLanguage();
  const [packages, setPackages] = useState<PackageWithPatient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPackages = useCallback(async () => {
    if (!doctor?.id) return;
    setLoading(true);
    await expireOverduePackages(doctor.id);
    const { data, error } = await supabase
      .from("patient_packages")
      .select("*, patients(id, name, phone)")
      .eq("doctor_id", doctor.id)
      .order("created_at", { ascending: false });
    if (error) console.error("[packages-dash] fetch error:", error);
    setPackages((data as PackageWithPatient[]) ?? []);
    setLoading(false);
  }, [doctor?.id]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") fetchPackages();
    };
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [fetchPackages]);

  const groups = useMemo(() => {
    const active = packages.filter((p) => p.status === "active");
    const expiring = active.filter(
      (p) => getPackageProgress(p as unknown as PatientPackage).isExpiringSoon
    );
    const completed = packages.filter((p) => p.status === "completed");
    const totalRevenue = packages.reduce(
      (sum, p) => sum + Number(p.amount_paid || 0),
      0
    );
    const pendingRevenue = active.reduce(
      (sum, p) =>
        sum + Math.max(0, Number(p.total_price || 0) - Number(p.amount_paid || 0)),
      0
    );
    return { active, expiring, completed, totalRevenue, pendingRevenue };
  }, [packages]);

  const groupedByPatient = useMemo(() => {
    const map = new Map<string, { patient: PackageWithPatient["patients"]; pkgs: PackageWithPatient[] }>();
    for (const p of groups.active) {
      const key = p.patient_id;
      if (!map.has(key)) {
        map.set(key, { patient: p.patients ?? null, pkgs: [] });
      }
      map.get(key)!.pkgs.push(p);
    }
    return Array.from(map.entries()).map(([patientId, v]) => ({ patientId, ...v }));
  }, [groups.active]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1
            className="text-2xl sm:text-3xl md:text-4xl font-semibold text-text-primary"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {t("packages_title")}
          </h1>
          <p className="text-text-secondary mt-1 text-sm sm:text-base">
            {t("packages_subtitle")}
          </p>
        </div>
        <Link href="/dashboard/packages/templates">
          <Button
            variant="outline"
            className="min-h-[44px] inline-flex items-center gap-2"
          >
            <SettingsIcon className="w-4 h-4" />
            {t("packages_dash_manage_templates")}
          </Button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<PackageIcon size={28} />}
          label={t("packages_dash_active")}
          value={String(groups.active.length)}
        />
        <StatCard
          icon={<AlertTriangle size={28} />}
          label={t("packages_dash_expiring")}
          value={String(groups.expiring.length)}
          accent={groups.expiring.length > 0 ? "amber" : undefined}
        />
        <StatCard
          icon={<IndianRupee size={28} />}
          label={t("packages_dash_revenue")}
          value={`₹${groups.totalRevenue.toLocaleString("en-IN")}`}
          subValue={
            groups.pendingRevenue > 0
              ? `${t("packages_dash_revenue_pending")}: ₹${groups.pendingRevenue.toLocaleString("en-IN")}`
              : t("packages_dash_revenue_total")
          }
        />
        <StatCard
          icon={<CheckCircle2 size={28} />}
          label={t("packages_dash_completed")}
          value={String(groups.completed.length)}
        />
      </div>

      {loading ? (
        <Card>
          <CardBody>
            <div className="text-text-muted text-sm">Loading…</div>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Expiring soon section */}
          {groups.expiring.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" style={{ color: "#b45309" }} />
                <h2
                  className="text-xl font-semibold text-text-primary"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {t("packages_dash_expiring")}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {groups.expiring.map((p) => (
                  <PackagePatientCard
                    key={p.id}
                    pkg={p}
                    t={t}
                    highlight="amber"
                  />
                ))}
              </div>
            </section>
          )}

          {/* Active grouped by patient */}
          <section className="space-y-3">
            <h2
              className="text-xl font-semibold text-text-primary"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {t("packages_dash_active")}
            </h2>
            {groupedByPatient.length === 0 ? (
              <Card>
                <CardBody>
                  <div className="flex flex-col items-center justify-center py-10 text-text-muted">
                    <PackageIcon size={36} className="mb-3 opacity-30" />
                    <p className="text-sm">{t("packages_dash_empty_active")}</p>
                  </div>
                </CardBody>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {groupedByPatient.map(({ patientId, patient, pkgs }) => (
                  <motion.div
                    key={patientId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <PatientGroupCard
                      patientId={patientId}
                      patient={patient}
                      pkgs={pkgs}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* Completed archive */}
          {groups.completed.length > 0 && (
            <section className="space-y-3">
              <h2
                className="text-xl font-semibold text-text-primary"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {t("packages_dash_completed")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {groups.completed.slice(0, 8).map((p) => (
                  <PackagePatientCard key={p.id} pkg={p} t={t} muted />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subValue,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  accent?: "amber";
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-text-muted text-sm">{label}</p>
            <p
              className="text-2xl sm:text-3xl font-semibold text-text-primary mt-1"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                color: accent === "amber" ? "#b45309" : undefined,
              }}
            >
              {value}
            </p>
            {subValue && (
              <p className="text-xs text-text-muted mt-1">{subValue}</p>
            )}
          </div>
          <span
            className="flex-shrink-0 opacity-50"
            style={{ color: accent === "amber" ? "#b45309" : "#b8936a" }}
          >
            {icon}
          </span>
        </div>
      </CardBody>
    </Card>
  );
}

function PatientGroupCard({
  patientId,
  patient,
  pkgs,
}: {
  patientId: string;
  patient: PackageWithPatient["patients"];
  pkgs: PackageWithPatient[];
}) {
  return (
    <Link
      href={`/dashboard/patients/${patientId}?tab=packages`}
      className="block group"
    >
      <Card hover className="h-full">
        <CardBody>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0 flex-1">
              <h3
                className="text-lg font-semibold text-text-primary truncate"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {patient?.name ?? "Patient"}
              </h3>
              {patient?.phone && (
                <p className="text-xs text-text-muted">{patient.phone}</p>
              )}
            </div>
            <ArrowRight
              size={16}
              className="text-text-muted group-hover:translate-x-0.5 transition-transform flex-shrink-0"
              style={{ color: "#b8936a" }}
            />
          </div>
          <div className="space-y-2">
            {pkgs.map((p) => {
              const prog = getPackageProgress(p as unknown as PatientPackage);
              return (
                <div key={p.id} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-text-primary font-medium truncate">
                      {p.package_name}
                    </span>
                    <span className="text-xs text-text-secondary flex-shrink-0">
                      {p.sessions_completed}/{p.total_sessions}
                    </span>
                  </div>
                  <div
                    className="h-1.5 mt-1 rounded-full overflow-hidden"
                    style={{ background: "rgba(184,147,106,0.15)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${prog.percentComplete}%`,
                        background: "#b8936a",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}

function PackagePatientCard({
  pkg,
  t,
  highlight,
  muted,
}: {
  pkg: PackageWithPatient;
  t: ReturnType<typeof useLanguage>["t"];
  highlight?: "amber";
  muted?: boolean;
}) {
  const prog = getPackageProgress(pkg as unknown as PatientPackage);
  return (
    <Link
      href={`/dashboard/patients/${pkg.patient_id}?tab=packages`}
      className="block group"
    >
      <Card hover>
        <CardBody>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3
                className="text-base font-semibold text-text-primary truncate"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {pkg.patients?.name ?? "Patient"}
              </h3>
              <p className="text-sm text-text-secondary mt-0.5 truncate">
                {pkg.package_name}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                <span className="text-text-secondary">
                  {pkg.sessions_completed}/{pkg.total_sessions} sessions
                </span>
                {highlight === "amber" && (
                  <Badge variant="warning">
                    {t("packages_progress_expires_in").replace(
                      "{days}",
                      String(prog.daysUntilExpiry)
                    )}
                  </Badge>
                )}
                {muted && (
                  <span className="text-text-muted">
                    {format(new Date(pkg.expiry_date), "dd MMM yyyy")}
                  </span>
                )}
              </div>
            </div>
            <ArrowRight
              size={16}
              className="text-text-muted group-hover:translate-x-0.5 transition-transform flex-shrink-0"
              style={{ color: "#b8936a" }}
            />
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
