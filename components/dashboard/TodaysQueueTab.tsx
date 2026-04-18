"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Phone,
  UserPlus,
  Search,
  Plus,
  Check,
  X,
  PhoneCall,
  Clock,
  Calendar,
  Footprints,
  QrCode,
} from "lucide-react";
import { CheckInQRModal } from "./CheckInQRModal";
import { format } from "date-fns";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { useLanguage } from "@/lib/language-context";
import {
  useTokenQueue,
  createToken,
  updateTokenStatus,
} from "@/lib/useTokenQueue";
import { supabase } from "@/lib/supabase";
import type { Appointment, DailyToken, Patient } from "@/lib/types";

interface Props {
  doctorId: string;
  scheduledToday?: Appointment[];
  clinicName?: string;
}

type Mode = "existing" | "quick";

interface QuickPatient {
  name: string;
  phone: string;
  age: string;
  gender: "male" | "female" | "other" | "";
  chiefComplaint: string;
}

function emptyQuick(): QuickPatient {
  return { name: "", phone: "", age: "", gender: "", chiefComplaint: "" };
}

const AVG_MINUTES_PER_TOKEN = 12;

export function TodaysQueueTab({
  doctorId,
  scheduledToday = [],
  clinicName,
}: Props) {
  const { t } = useLanguage();
  const { tokens, loading, refetch } = useTokenQueue(doctorId);
  const [showModal, setShowModal] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [mode, setMode] = useState<Mode>("quick");
  const [quick, setQuick] = useState<QuickPatient>(emptyQuick());
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = tokens.length;
    const waiting = tokens.filter((x) => x.status === "waiting").length;
    const inConsult = tokens.filter((x) => x.status === "in_consultation").length;
    const done = tokens.filter((x) => x.status === "done").length;
    const noShow = tokens.filter((x) => x.status === "no_show").length;
    return { total, waiting, inConsult, done, noShow };
  }, [tokens]);

  const runSearch = async (q: string) => {
    setSearch(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from("patients")
      .select("id, name, phone, age, gender")
      .eq("linked_doctor_id", doctorId)
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(8);
    setResults((data as Patient[]) ?? []);
    setSearching(false);
  };

  const resetModal = () => {
    setShowModal(false);
    setMode("quick");
    setQuick(emptyQuick());
    setSearch("");
    setResults([]);
    setSelectedPatient(null);
    setError(null);
  };

  const handleCreate = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "existing") {
        if (!selectedPatient) {
          setError("Select a patient or switch to Quick add.");
          return;
        }
        await createToken({
          clinicId: doctorId,
          doctorId,
          patientId: selectedPatient.id,
          chiefComplaint: quick.chiefComplaint || null,
        });
      } else {
        if (!quick.name.trim() || quick.phone.replace(/\D/g, "").length < 10) {
          setError("Name and a 10-digit phone are required.");
          return;
        }
        await createToken({
          clinicId: doctorId,
          doctorId,
          walkInName: quick.name.trim(),
          walkInPhone: quick.phone.replace(/\D/g, "").slice(-10),
          chiefComplaint: quick.chiefComplaint || null,
        });
      }
      resetModal();
      refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create token.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatus = async (
    id: string,
    status: DailyToken["status"]
  ) => {
    await updateTokenStatus(id, status);
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <StatsBar stats={stats} t={t} />
        <div className="flex-shrink-0 flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowQR(true)}
            className="min-h-[44px] inline-flex items-center gap-2"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">{t("qr_show_btn")}</span>
          </Button>
          <Button
            onClick={() => setShowModal(true)}
            className="min-h-[44px] inline-flex items-center gap-2"
            style={{ backgroundColor: "#b8936a" }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t("queue_new_token")}</span>
          </Button>
        </div>
      </div>

      <CheckInQRModal
        open={showQR}
        onClose={() => setShowQR(false)}
        clinicId={doctorId}
        clinicName={clinicName}
      />

      <UnifiedTimeline
        tokens={tokens}
        scheduled={scheduledToday}
        loading={loading}
        onStatus={handleStatus}
        t={t}
      />

      <Modal
        isOpen={showModal}
        onClose={resetModal}
        title={t("queue_new_token_title")}
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("quick")}
              className={`flex-1 min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "quick"
                  ? "text-white"
                  : "border text-[#7a5c35] hover:bg-primary-50"
              }`}
              style={
                mode === "quick"
                  ? { backgroundColor: "#b8936a" }
                  : { borderColor: "rgba(184,147,106,0.5)" }
              }
            >
              <UserPlus className="w-4 h-4 inline mr-1" />
              {t("queue_quick_add")}
            </button>
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={`flex-1 min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "existing"
                  ? "text-white"
                  : "border text-[#7a5c35] hover:bg-primary-50"
              }`}
              style={
                mode === "existing"
                  ? { backgroundColor: "#b8936a" }
                  : { borderColor: "rgba(184,147,106,0.5)" }
              }
            >
              <Search className="w-4 h-4 inline mr-1" />
              {t("queue_existing_patient")}
            </button>
          </div>

          {mode === "existing" ? (
            <div className="space-y-2">
              <Input
                placeholder={t("queue_search_placeholder")}
                value={search}
                onChange={(e) => runSearch(e.target.value)}
              />
              {selectedPatient ? (
                <div
                  className="p-3 rounded-lg border flex items-center justify-between"
                  style={{
                    borderColor: "#b8936a",
                    backgroundColor: "rgba(184,147,106,0.08)",
                  }}
                >
                  <div>
                    <p className="font-medium text-text-primary">
                      {selectedPatient.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {selectedPatient.phone}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedPatient(null)}
                    className="text-sm text-primary-500"
                    type="button"
                  >
                    {t("queue_cancel")}
                  </button>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {searching ? (
                    <p className="text-xs text-text-muted">…</p>
                  ) : (
                    results.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPatient(p)}
                        className="w-full text-left p-2 rounded-lg hover:bg-primary-50 transition-colors"
                      >
                        <p className="text-sm font-medium text-text-primary">
                          {p.name}
                        </p>
                        <p className="text-xs text-text-muted">{p.phone}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={t("queue_name")}
                required
                value={quick.name}
                onChange={(e) => setQuick({ ...quick, name: e.target.value })}
              />
              <Input
                label={t("queue_phone")}
                required
                value={quick.phone}
                onChange={(e) => setQuick({ ...quick, phone: e.target.value })}
                inputMode="tel"
                placeholder="10-digit"
              />
              <Input
                label={t("queue_age")}
                type="number"
                min={0}
                value={quick.age}
                onChange={(e) => setQuick({ ...quick, age: e.target.value })}
              />
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  {t("queue_gender")}
                </label>
                <div className="flex gap-2">
                  {(["male", "female", "other"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setQuick({ ...quick, gender: g })}
                      className={`flex-1 min-h-[40px] px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        quick.gender === g
                          ? "text-white"
                          : "border text-text-primary hover:bg-primary-50"
                      }`}
                      style={
                        quick.gender === g
                          ? { backgroundColor: "#b8936a" }
                          : { borderColor: "rgba(184,147,106,0.4)" }
                      }
                    >
                      {t(`queue_gender_${g}` as "queue_gender_male")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <ComplaintPills
            value={quick.chiefComplaint}
            onChange={(v) => setQuick({ ...quick, chiefComplaint: v })}
            t={t}
          />

          {error && (
            <p className="text-sm" style={{ color: "var(--form-error)" }}>
              {error}
            </p>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={resetModal} disabled={submitting}>
              {t("queue_cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              loading={submitting}
              disabled={submitting}
              className="inline-flex items-center gap-1"
              style={{ backgroundColor: "#b8936a" }}
            >
              <Check className="w-4 h-4" />
              {submitting ? t("queue_creating") : t("queue_create")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StatsBar({
  stats,
  t,
}: {
  stats: {
    total: number;
    waiting: number;
    inConsult: number;
    done: number;
    noShow: number;
  };
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const items: { label: string; value: number; color: string }[] = [
    { label: t("queue_stat_total"), value: stats.total, color: "#1a1612" },
    { label: t("queue_stat_waiting"), value: stats.waiting, color: "#b8936a" },
    { label: t("queue_stat_in_consult"), value: stats.inConsult, color: "#2d4a3e" },
    { label: t("queue_stat_completed"), value: stats.done, color: "#166534" },
    { label: t("queue_stat_no_show"), value: stats.noShow, color: "#991b1b" },
  ];
  return (
    <div className="flex-1 overflow-x-auto">
      <div className="flex gap-2 min-w-min">
        {items.map((i) => (
          <div
            key={i.label}
            className="flex-shrink-0 px-3 py-2 rounded-lg border text-center min-w-[72px]"
            style={{
              borderColor: "rgba(184,147,106,0.25)",
              backgroundColor: "var(--color-card)",
            }}
          >
            <p
              className="text-xl sm:text-2xl font-serif font-semibold"
              style={{ color: i.color, fontFamily: "'Cormorant Garamond', serif" }}
            >
              {i.value}
            </p>
            <p className="text-[10px] sm:text-xs text-text-muted uppercase tracking-wider leading-tight">
              {i.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComplaintPills({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (v: string) => void;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const options = [
    { key: "queue_complaint_acne", label: t("queue_complaint_acne") },
    { key: "queue_complaint_rash", label: t("queue_complaint_rash") },
    { key: "queue_complaint_pigmentation", label: t("queue_complaint_pigmentation") },
    { key: "queue_complaint_hair_fall", label: t("queue_complaint_hair_fall") },
    { key: "queue_complaint_skin_check", label: t("queue_complaint_skin_check") },
    { key: "queue_complaint_follow_up", label: t("queue_complaint_follow_up") },
    { key: "queue_complaint_other", label: t("queue_complaint_other") },
  ];
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-2">
        {t("queue_complaint")}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(value === o.label ? "" : o.label)}
            className={`min-h-[36px] px-3 py-1.5 rounded-full text-sm transition-colors ${
              value === o.label
                ? "text-white"
                : "border text-text-primary hover:bg-primary-50"
            }`}
            style={
              value === o.label
                ? { backgroundColor: "#b8936a" }
                : { borderColor: "rgba(184,147,106,0.4)" }
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

type TimelineRow =
  | { kind: "token"; sortKey: string; token: DailyToken }
  | { kind: "appt"; sortKey: string; appt: Appointment };

function UnifiedTimeline({
  tokens,
  scheduled,
  loading,
  onStatus,
  t,
}: {
  tokens: DailyToken[];
  scheduled: Appointment[];
  loading: boolean;
  onStatus: (id: string, status: DailyToken["status"]) => void;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const rows: TimelineRow[] = useMemo(() => {
    const list: TimelineRow[] = [];
    tokens.forEach((tk) =>
      list.push({
        kind: "token",
        sortKey: `T-${String(tk.token_number).padStart(3, "0")}`,
        token: tk,
      })
    );
    scheduled.forEach((a) =>
      list.push({
        kind: "appt",
        sortKey: `A-${a.appointment_time}`,
        appt: a,
      })
    );
    list.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    return list;
  }, [tokens, scheduled]);

  if (loading) {
    return (
      <Card>
        <CardBody>
          <div className="text-text-muted text-sm">…</div>
        </CardBody>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="text-center text-text-muted py-8">{t("queue_empty")}</p>
        </CardBody>
      </Card>
    );
  }

  // Calculate wait estimate per waiting token based on position
  const waitingOrder: Record<string, number> = {};
  let idx = 0;
  for (const tk of tokens) {
    if (tk.status === "waiting") {
      waitingOrder[tk.id] = idx;
      idx++;
    }
  }

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {rows.map((row) => {
          if (row.kind === "token") {
            const tk = row.token;
            const wait = waitingOrder[tk.id];
            return (
              <motion.div
                key={`t-${tk.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <TokenCard
                  token={tk}
                  waitingIndex={wait}
                  onStatus={onStatus}
                  t={t}
                />
              </motion.div>
            );
          }
          const a = row.appt;
          return (
            <motion.div
              key={`a-${a.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ScheduledCard appt={a} t={t} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function TokenCard({
  token,
  waitingIndex,
  onStatus,
  t,
}: {
  token: DailyToken;
  waitingIndex: number | undefined;
  onStatus: (id: string, status: DailyToken["status"]) => void;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const patientName =
    token.patients?.name ?? token.walk_in_name ?? t("queue_walk_in_anonymous");
  const tokenNum = `T-${String(token.token_number).padStart(3, "0")}`;
  const created = new Date(token.created_at);
  const estWait =
    waitingIndex !== undefined ? waitingIndex * AVG_MINUTES_PER_TOKEN : null;

  const statusStyle: Record<DailyToken["status"], { bg: string; color: string }> = {
    waiting: { bg: "rgba(184,147,106,0.15)", color: "#7a5c35" },
    in_consultation: { bg: "rgba(45,74,62,0.15)", color: "#2d4a3e" },
    done: { bg: "#dcfce7", color: "#166534" },
    no_show: { bg: "#fee2e2", color: "#991b1b" },
  };

  const statusLabel: Record<DailyToken["status"], string> = {
    waiting: t("queue_status_waiting"),
    in_consultation: t("queue_status_in_consult"),
    done: t("queue_status_done"),
    no_show: t("queue_status_no_show"),
  };

  return (
    <Card className="overflow-hidden">
      <CardBody className="!p-0">
        <div className="flex flex-col sm:flex-row">
          <div
            className="flex-shrink-0 flex items-center justify-center px-4 sm:px-6 py-3 sm:py-5 border-b sm:border-b-0 sm:border-r"
            style={{
              backgroundColor: "rgba(184,147,106,0.08)",
              borderColor: "rgba(184,147,106,0.25)",
            }}
          >
            <div className="text-center">
              <p
                className="text-3xl sm:text-4xl font-serif font-semibold"
                style={{
                  color: "#b8936a",
                  fontFamily: "'Cormorant Garamond', serif",
                }}
              >
                {tokenNum}
              </p>
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider mt-1"
                style={{ color: "#7a5c35" }}
              >
                <Footprints className="w-3 h-3" />
                {t("queue_walk_in_tag")}
              </span>
            </div>
          </div>

          <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-medium text-text-primary truncate">
                  {patientName}
                </h4>
                {token.chief_complaint && (
                  <span
                    className="inline-block text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: "rgba(184,147,106,0.12)",
                      color: "#7a5c35",
                    }}
                  >
                    {token.chief_complaint}
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                {token.walk_in_phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {token.walk_in_phone}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {t("queue_generated")} {t("queue_at")} {format(created, "h:mm a")}
                </span>
                <span
                  className="inline-block text-[11px] px-2 py-0.5 rounded-full font-medium"
                  style={statusStyle[token.status]}
                >
                  {statusLabel[token.status]}
                </span>
                {estWait !== null && token.status === "waiting" && estWait > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px]">
                    <Clock className="w-3 h-3" />
                    {t("queue_est_wait")}: ~{estWait} {t("queue_minutes")}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 flex-shrink-0">
              {token.status === "waiting" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => onStatus(token.id, "in_consultation")}
                    className="min-h-[40px] inline-flex items-center gap-1"
                    style={{ backgroundColor: "#b8936a" }}
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    {t("queue_call_in")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onStatus(token.id, "no_show")}
                    className="min-h-[40px] inline-flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    {t("queue_no_show")}
                  </Button>
                </>
              )}
              {token.status === "in_consultation" && (
                <Button
                  size="sm"
                  onClick={() => onStatus(token.id, "done")}
                  className="min-h-[40px] inline-flex items-center gap-1"
                  style={{ backgroundColor: "#2d4a3e" }}
                >
                  <Check className="w-3.5 h-3.5" />
                  {t("queue_complete")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function ScheduledCard({
  appt,
  t,
}: {
  appt: Appointment;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const patientName = appt.patients?.name ?? "Patient";
  const time = appt.appointment_time?.slice(0, 5) ?? "";
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-3">
          <div
            className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "rgba(45,74,62,0.1)" }}
          >
            <Calendar className="w-5 h-5" style={{ color: "#2d4a3e" }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-text-primary truncate">
                {patientName}
              </p>
              <Badge variant="info">{t("queue_scheduled_tag")}</Badge>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              {time} · {appt.reason ?? appt.type}
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
