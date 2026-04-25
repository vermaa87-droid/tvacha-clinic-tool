"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import {
  Plus,
  Package as PackageIcon,
  PlayCircle,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useLanguage } from "@/lib/language-context";
import { supabase } from "@/lib/supabase";
import {
  recordPackageSession,
  getPackageProgress,
} from "@/lib/usePackageSession";
import type {
  PackageSession,
  PackageTemplate,
  PatientPackage,
} from "@/lib/types";

interface Props {
  doctorId: string;
  patientId: string;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addMonths(iso: string, months: number) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function PatientPackagesTab({ doctorId, patientId }: Props) {
  const { t } = useLanguage();
  const [packages, setPackages] = useState<PatientPackage[]>([]);
  const [sessionsByPkg, setSessionsByPkg] = useState<
    Record<string, PackageSession[]>
  >({});
  const [templates, setTemplates] = useState<PackageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [recordingFor, setRecordingFor] = useState<PatientPackage | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [pkgRes, tmplRes] = await Promise.all([
      supabase
        .from("patient_packages")
        .select("*")
        .eq("doctor_id", doctorId)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
      supabase
        .from("package_templates")
        .select("*")
        .eq("doctor_id", doctorId)
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ]);
    const pkgs = (pkgRes.data as PatientPackage[]) ?? [];
    setPackages(pkgs);
    setTemplates((tmplRes.data as PackageTemplate[]) ?? []);

    if (pkgs.length > 0) {
      const ids = pkgs.map((p) => p.id);
      const { data: sess } = await supabase
        .from("package_sessions")
        .select("*")
        .eq("doctor_id", doctorId)
        .in("package_id", ids)
        .order("session_number", { ascending: true });
      const map: Record<string, PackageSession[]> = {};
      ((sess as PackageSession[]) ?? []).forEach((s) => {
        (map[s.package_id] ??= []).push(s);
      });
      setSessionsByPkg(map);
    } else {
      setSessionsByPkg({});
    }
    setLoading(false);
  }, [doctorId, patientId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") fetchAll();
    };
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [fetchAll]);

  const active = packages.filter((p) => p.status === "active");
  const past = packages.filter((p) => p.status !== "active");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h3
          className="text-lg sm:text-xl font-semibold text-text-primary"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {t("packages_patient_tab_title")}
        </h3>
        <Button
          variant="primary"
          size="sm"
          className="min-h-[44px]"
          onClick={() => setShowAssign(true)}
        >
          <span className="inline-flex items-center gap-1.5">
            <Plus size={14} /> {t("packages_patient_add")}
          </span>
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardBody>
            <div className="text-text-muted text-sm">Loading…</div>
          </CardBody>
        </Card>
      ) : packages.length === 0 ? (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center justify-center py-10 text-text-muted">
              <PackageIcon size={36} className="mb-3 opacity-30" />
              <p className="text-sm">{t("packages_patient_empty")}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 min-h-[44px]"
                onClick={() => setShowAssign(true)}
              >
                {t("packages_patient_add")}
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm uppercase tracking-wide text-text-muted font-medium">
                {t("packages_patient_active")}
              </h4>
              <AnimatePresence initial={false}>
                {active.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <PackageCard
                      t={t}
                      pkg={p}
                      sessions={sessionsByPkg[p.id] ?? []}
                      onRecord={() => setRecordingFor(p)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {past.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm uppercase tracking-wide text-text-muted font-medium">
                {t("packages_patient_history")}
              </h4>
              <AnimatePresence initial={false}>
                {past.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <PackageCard
                      t={t}
                      pkg={p}
                      sessions={sessionsByPkg[p.id] ?? []}
                      onRecord={null}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      <AssignPackageModal
        t={t}
        open={showAssign}
        onClose={() => setShowAssign(false)}
        templates={templates}
        doctorId={doctorId}
        patientId={patientId}
        onCreated={() => {
          setShowAssign(false);
          fetchAll();
        }}
      />

      <RecordSessionModal
        t={t}
        pkg={recordingFor}
        doctorId={doctorId}
        onClose={() => setRecordingFor(null)}
        onSaved={() => {
          setRecordingFor(null);
          fetchAll();
        }}
      />
    </div>
  );
}

// ─── Package card with progress dots ────────────────────────────────────────

function PackageCard({
  t,
  pkg,
  sessions,
  onRecord,
}: {
  t: ReturnType<typeof useLanguage>["t"];
  pkg: PatientPackage;
  sessions: PackageSession[];
  onRecord: (() => void) | null;
}) {
  const progress = getPackageProgress(pkg);
  const statusBadge = (() => {
    switch (pkg.status) {
      case "active":
        return (
          <Badge variant="success">
            {t("packages_progress_active")}
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="info">
            {t("packages_progress_completed")}
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="error">
            {t("packages_progress_expired")}
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="default">
            {t("packages_progress_cancelled")}
          </Badge>
        );
    }
  })();

  return (
    <Card>
      <CardBody>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3
                className="text-lg font-semibold text-text-primary truncate"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {pkg.package_name}
              </h3>
              {statusBadge}
              {pkg.status === "active" && progress.isExpiringSoon && (
                <span
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                  style={{
                    color: "#92400e",
                    backgroundColor: "rgba(245,158,11,0.12)",
                  }}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {t("packages_progress_expiring_soon")}
                </span>
              )}
            </div>

            {/* Progress dots */}
            <div className="flex flex-wrap gap-1.5 mb-3" aria-label="Session progress">
              {Array.from({ length: pkg.total_sessions }).map((_, i) => {
                const done = i < pkg.sessions_completed;
                return (
                  <span
                    key={i}
                    className="inline-block rounded-full"
                    style={{
                      width: 12,
                      height: 12,
                      background: done ? "#b8936a" : "rgba(184,147,106,0.18)",
                      border: done
                        ? "1px solid #b8936a"
                        : "1px solid rgba(184,147,106,0.35)",
                    }}
                  />
                );
              })}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
              <span>
                <strong>{pkg.sessions_completed}</strong>{" "}
                {t("packages_progress_of")}{" "}
                <strong>{pkg.total_sessions}</strong>{" "}
                {t("packages_progress_sessions_done")}
              </span>
              <span>
                ₹
                <strong>
                  {Number(pkg.amount_paid).toLocaleString("en-IN")}
                </strong>{" "}
                / ₹{Number(pkg.total_price).toLocaleString("en-IN")}
              </span>
              {pkg.status === "active" && progress.daysUntilExpiry >= 0 && (
                <span>
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {t("packages_progress_expires_in").replace(
                    "{days}",
                    String(progress.daysUntilExpiry)
                  )}
                </span>
              )}
            </div>

            {sessions.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-text-muted cursor-pointer hover:text-text-primary">
                  {sessions.length} session{sessions.length !== 1 ? "s" : ""} recorded
                </summary>
                <ul className="mt-2 space-y-1 text-xs text-text-secondary pl-4 border-l-2 border-primary-200">
                  {sessions.map((s) => (
                    <li key={s.id}>
                      #{s.session_number} —{" "}
                      {s.session_date
                        ? format(new Date(s.session_date), "dd MMM yyyy")
                        : "—"}
                      {s.notes && <span className="text-text-muted"> · {s.notes}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          {onRecord && (
            <div className="flex flex-shrink-0">
              <Button
                variant="primary"
                size="sm"
                onClick={onRecord}
                className="min-h-[44px] inline-flex items-center gap-1.5"
              >
                <PlayCircle size={16} />
                {t("packages_record_session")}
              </Button>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

// ─── Assign / start package modal ───────────────────────────────────────────

function AssignPackageModal({
  t,
  open,
  onClose,
  templates,
  doctorId,
  patientId,
  onCreated,
}: {
  t: ReturnType<typeof useLanguage>["t"];
  open: boolean;
  onClose: () => void;
  templates: PackageTemplate[];
  doctorId: string;
  patientId: string;
  onCreated: () => void;
}) {
  const [tmplId, setTmplId] = useState<string>("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState<string>("");
  const [paid, setPaid] = useState<string>("0");
  const [start, setStart] = useState<string>(todayIso());
  const [validityMonths, setValidityMonths] = useState<number>(6);
  const [totalSessions, setTotalSessions] = useState<number>(6);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTmplId("");
      setName("");
      setPrice("");
      setPaid("0");
      setStart(todayIso());
      setValidityMonths(6);
      setTotalSessions(6);
      setErr(null);
    }
  }, [open]);

  const onPickTemplate = (id: string) => {
    setTmplId(id);
    const tpl = templates.find((x) => x.id === id);
    if (tpl) {
      setName(tpl.name);
      setPrice(String(tpl.suggested_price));
      setValidityMonths(tpl.validity_months);
      setTotalSessions(tpl.total_sessions);
    }
  };

  const expiry = useMemo(() => addMonths(start, validityMonths), [start, validityMonths]);

  const canSave =
    name.trim().length > 0 &&
    totalSessions > 0 &&
    Number(price) >= 0 &&
    Number(paid) >= 0 &&
    Number(paid) <= Number(price);

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    setErr(null);
    const { error } = await supabase.from("patient_packages").insert({
      patient_id: patientId,
      doctor_id: doctorId,
      template_id: tmplId || null,
      package_name: name.trim(),
      total_sessions: totalSessions,
      sessions_completed: 0,
      total_price: Number(price) || 0,
      amount_paid: Number(paid) || 0,
      start_date: start,
      expiry_date: expiry,
      status: "active",
    });
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    onCreated();
  };

  if (!open) return null;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={t("packages_assign_title")}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t("packages_cancel")}
          </Button>
          <Button onClick={submit} disabled={!canSave} loading={saving}>
            {t("packages_assign_start_btn")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {templates.length === 0 ? (
          <div
            className="text-sm p-3 rounded-lg"
            style={{
              background: "rgba(184,147,106,0.08)",
              border: "1px solid rgba(184,147,106,0.25)",
              color: "#5c4030",
            }}
          >
            {t("packages_no_templates")}{" "}
            <Link
              href="/dashboard/packages/templates"
              className="underline"
              style={{ color: "#b8936a" }}
            >
              {t("packages_dash_manage_templates")}
            </Link>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              {t("packages_assign_template")}
            </label>
            <select
              value={tmplId}
              onChange={(e) => onPickTemplate(e.target.value)}
              className="w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">— Custom —</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} · {tpl.total_sessions} sessions · ₹
                  {Number(tpl.suggested_price).toLocaleString("en-IN")}
                </option>
              ))}
            </select>
          </div>
        )}

        <Input
          label={t("packages_assign_custom_name")}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t("packages_template_sessions")}
            type="number"
            min={1}
            value={totalSessions}
            onChange={(e) =>
              setTotalSessions(Math.max(1, Number(e.target.value) || 0))
            }
          />
          <Input
            label={t("packages_template_validity")}
            type="number"
            min={1}
            value={validityMonths}
            onChange={(e) =>
              setValidityMonths(Math.max(1, Number(e.target.value) || 0))
            }
          />
          <Input
            label={t("packages_assign_price")}
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <Input
            label={t("packages_assign_paid")}
            type="number"
            min={0}
            value={paid}
            onChange={(e) => setPaid(e.target.value)}
          />
          <Input
            label={t("packages_assign_start")}
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              {t("packages_assign_expiry")}
            </label>
            <div className="px-4 py-2.5 border border-primary-200 rounded-lg bg-primary-100 text-text-secondary text-sm">
              {expiry}
            </div>
          </div>
        </div>

        {err && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {err}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Record session modal ───────────────────────────────────────────────────

function RecordSessionModal({
  t,
  pkg,
  doctorId,
  onClose,
  onSaved,
}: {
  t: ReturnType<typeof useLanguage>["t"];
  pkg: PatientPackage | null;
  doctorId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!pkg) {
      setDate(todayIso());
      setNotes("");
      setPerformedBy("");
      setBeforeFile(null);
      setAfterFile(null);
      setErr(null);
      setSuccess(null);
    }
  }, [pkg]);

  if (!pkg) return null;

  const uploadPhoto = async (file: File, label: "before" | "after"): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("patient_id", pkg.patient_id);
    formData.append("doctor_id", doctorId);
    formData.append("photo_type", label);
    formData.append("subfolder", `package-${pkg.id}`);
    formData.append("notes", `${pkg.package_name} — session ${pkg.sessions_completed + 1} (${label})`);
    try {
      const res = await fetch("/api/upload-clinical-photo", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        console.error(`[record-session] ${label} upload error:`, json.error);
        return null;
      }
      return (json.photoUrl as string) ?? null;
    } catch (err) {
      console.error(`[record-session] ${label} upload threw:`, err);
      return null;
    }
  };

  const submit = async () => {
    setSaving(true);
    setErr(null);
    setSuccess(null);
    let beforeUrl: string | null = null;
    let afterUrl: string | null = null;
    if (beforeFile) beforeUrl = await uploadPhoto(beforeFile, "before");
    if (afterFile) afterUrl = await uploadPhoto(afterFile, "after");

    const result = await recordPackageSession({
      doctorId,
      packageId: pkg.id,
      sessionNumber: pkg.sessions_completed + 1,
      sessionDate: date,
      notes: notes.trim() || null,
      beforePhotoUrl: beforeUrl,
      afterPhotoUrl: afterUrl,
      performedBy: performedBy.trim() || null,
    });
    setSaving(false);
    if (result.error) {
      setErr(result.error.message || t("packages_record_error"));
      return;
    }
    setSuccess(
      result.updatedPackage?.status === "completed"
        ? t("packages_record_success_complete")
        : t("packages_record_success")
    );
    setTimeout(onSaved, 900);
  };

  return (
    <Modal
      isOpen={!!pkg}
      onClose={onClose}
      title={`${t("packages_record_title")} #${pkg.sessions_completed + 1}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t("packages_cancel")}
          </Button>
          <Button onClick={submit} loading={saving} disabled={saving || !!success}>
            {saving ? t("packages_record_saving") : t("packages_record_save")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="text-sm text-text-secondary">
          <strong>{pkg.package_name}</strong> — Session{" "}
          {pkg.sessions_completed + 1} of {pkg.total_sessions}
        </div>

        <Input
          label={t("packages_record_date")}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <Input
          label={t("packages_record_performed_by")}
          value={performedBy}
          onChange={(e) => setPerformedBy(e.target.value)}
          placeholder="e.g. Dr. Sharma"
        />

        <Textarea
          label={t("packages_record_notes")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PhotoPicker
            label={t("packages_record_before")}
            file={beforeFile}
            onChange={setBeforeFile}
          />
          <PhotoPicker
            label={t("packages_record_after")}
            file={afterFile}
            onChange={setAfterFile}
          />
        </div>

        {err && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 inline-flex items-center gap-2">
            <XCircle size={16} />
            {err}
          </div>
        )}
        {success && (
          <div
            className="text-sm rounded-lg p-3 inline-flex items-center gap-2"
            style={{
              background: "rgba(45,74,62,0.08)",
              border: "1px solid rgba(45,74,62,0.25)",
              color: "#2d4a3e",
            }}
          >
            <CheckCircle2 size={16} />
            {success}
          </div>
        )}
      </div>
    </Modal>
  );
}

function PhotoPicker({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-2">
        {label}
      </label>
      {preview && (
        <div className="mb-2 inline-block rounded-lg overflow-hidden border border-primary-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={label} className="h-24 object-cover" />
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-100 file:text-primary-700 hover:file:bg-primary-200 cursor-pointer"
      />
    </div>
  );
}
