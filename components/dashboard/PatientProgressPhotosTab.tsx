"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Camera,
  Upload,
  Download,
  Trash2,
  X,
  Image as ImageIcon,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import {
  ReactCompareSlider,
  ReactCompareSliderImage,
  ReactCompareSliderHandle,
} from "react-compare-slider";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import { uploadClinicalPhoto } from "@/lib/usePhotoCompression";
import { downloadComparison } from "@/lib/comparisonExport";
import { fetchLetterheadFromDoctor, type ClinicLetterhead } from "@/lib/export";
import type { ClinicalPhoto } from "@/lib/types";

interface PatientProgressPhotosTabProps {
  doctorId: string;
  patientId: string;
  patientName?: string;
}

type OverlayKind = "off" | "face" | "body";

const PHOTO_TYPES: ClinicalPhoto["photo_type"][] = ["before", "during", "after"];
const ANGLES: ClinicalPhoto["angle"][] = [
  "front",
  "left_profile",
  "right_profile",
  "top",
  "close_up",
  "other",
];

export function PatientProgressPhotosTab({
  doctorId,
  patientId,
  patientName,
}: PatientProgressPhotosTabProps) {
  const { t } = useLanguage();
  const [photos, setPhotos] = useState<ClinicalPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [viewing, setViewing] = useState<ClinicalPhoto | null>(null);

  // Compare slider selection
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);

  // Export modal
  const [exportOpen, setExportOpen] = useState(false);

  const fetchPhotos = useCallback(async () => {
    if (!doctorId || !patientId) return;
    setLoading(true);
    const { data } = await supabase
      .from("clinical_photos")
      .select("*")
      .eq("doctor_id", doctorId)
      .eq("patient_id", patientId)
      .in("photo_type", ["before", "during", "after"])
      .order("taken_at", { ascending: true });
    const list = (data as ClinicalPhoto[]) ?? [];
    setPhotos(list);
    setLoading(false);

    // Auto-pick first 'before' and last 'after' if available
    setBeforeId((prev) => {
      if (prev && list.some((p) => p.id === prev)) return prev;
      return list.find((p) => p.photo_type === "before")?.id ?? null;
    });
    setAfterId((prev) => {
      if (prev && list.some((p) => p.id === prev)) return prev;
      const afters = list.filter((p) => p.photo_type === "after");
      return afters[afters.length - 1]?.id ?? null;
    });
  }, [doctorId, patientId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") fetchPhotos();
    };
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [fetchPhotos]);

  const beforePhoto = useMemo(
    () => photos.find((p) => p.id === beforeId) ?? null,
    [photos, beforeId]
  );
  const afterPhoto = useMemo(
    () => photos.find((p) => p.id === afterId) ?? null,
    [photos, afterId]
  );

  const removePhoto = async (photo: ClinicalPhoto) => {
    if (!confirm(t("progress_delete_confirm"))) return;
    const prev = photos;
    setPhotos((list) => list.filter((p) => p.id !== photo.id));
    if (beforeId === photo.id) setBeforeId(null);
    if (afterId === photo.id) setAfterId(null);
    const { error } = await supabase
      .from("clinical_photos")
      .delete()
      .eq("id", photo.id)
      .eq("doctor_id", doctorId);
    if (error) setPhotos(prev);
  };

  const beforeOptions = photos;
  const afterOptions = photos;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h3
            className="text-lg sm:text-xl font-semibold text-text-primary"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {t("progress_tab_title")}
          </h3>
          <p className="text-text-secondary text-sm mt-0.5">
            {t("progress_tab_subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCaptureOpen(true)}
            className="min-h-[44px] inline-flex items-center gap-1.5"
          >
            <Camera className="w-4 h-4" />
            {t("progress_capture")}
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardBody>
            <div className="text-text-muted text-sm">Loading…</div>
          </CardBody>
        </Card>
      ) : photos.length === 0 ? (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
              <Sparkles size={36} className="mb-3 opacity-30" />
              <p className="text-sm text-center max-w-md">
                {t("progress_empty")}
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Timeline */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wide px-1">
              {t("progress_timeline_title")}
            </h4>
            <div
              className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1"
              style={{ scrollSnapType: "x mandatory" }}
            >
              {photos.map((p) => (
                <TimelineThumb
                  key={p.id}
                  photo={p}
                  onClick={() => setViewing(p)}
                  t={t}
                />
              ))}
            </div>
          </section>

          {/* Compare slider */}
          <section
            className="rounded-xl p-4 sm:p-5 space-y-3"
            style={{
              backgroundColor: "var(--color-card)",
              border: "1px solid #e8dfcf",
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h4
                className="text-lg font-semibold text-text-primary"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {t("progress_compare_title")}
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportOpen(true)}
                disabled={!beforePhoto || !afterPhoto}
                className="min-h-[44px] inline-flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                {t("progress_export")}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <PhotoPicker
                label={t("progress_compare_pick_before")}
                value={beforeId}
                options={beforeOptions}
                onChange={setBeforeId}
              />
              <PhotoPicker
                label={t("progress_compare_pick_after")}
                value={afterId}
                options={afterOptions}
                onChange={setAfterId}
              />
            </div>

            {beforePhoto && afterPhoto ? (
              <div className="rounded-lg overflow-hidden" style={{ aspectRatio: "4/3" }}>
                <ReactCompareSlider
                  itemOne={
                    <ReactCompareSliderImage
                      src={beforePhoto.photo_url}
                      alt="Before"
                      style={{ objectFit: "contain", backgroundColor: "#1a1612" }}
                    />
                  }
                  itemTwo={
                    <ReactCompareSliderImage
                      src={afterPhoto.photo_url}
                      alt="After"
                      style={{ objectFit: "contain", backgroundColor: "#1a1612" }}
                    />
                  }
                  handle={
                    <ReactCompareSliderHandle
                      buttonStyle={{
                        backgroundColor: "#b8936a",
                        border: "2px solid #faf8f4",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                      }}
                      linesStyle={{ backgroundColor: "#b8936a", width: 3 }}
                    />
                  }
                />
                <p className="text-xs text-text-muted text-center mt-2">
                  {t("progress_compare_slider_hint")}
                </p>
              </div>
            ) : (
              <div
                className="rounded-lg flex items-center justify-center text-text-muted text-sm py-12"
                style={{
                  border: "1px dashed rgba(184,147,106,0.3)",
                }}
              >
                <ImageIcon size={32} className="opacity-30 mr-2" />
                Pick a Before and After photo above.
              </div>
            )}
          </section>

          {/* Grid */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wide px-1">
              {t("progress_grid_title")}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map((p) => (
                <GridCard
                  key={p.id}
                  photo={p}
                  onView={() => setViewing(p)}
                  onDelete={() => removePhoto(p)}
                  t={t}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <CaptureModal
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
        doctorId={doctorId}
        patientId={patientId}
        existingSessions={photos}
        onSaved={() => {
          setCaptureOpen(false);
          fetchPhotos();
        }}
      />

      <ViewerModal photo={viewing} onClose={() => setViewing(null)} />

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        before={beforePhoto}
        after={afterPhoto}
        doctorId={doctorId}
        patientId={patientId}
        patientName={patientName ?? null}
      />
    </div>
  );
}

function TimelineThumb({
  photo,
  onClick,
  t,
}: {
  photo: ClinicalPhoto;
  onClick: () => void;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const tagKey =
    photo.photo_type === "before"
      ? "progress_photo_type_before"
      : photo.photo_type === "after"
        ? "progress_photo_type_after"
        : "progress_photo_type_during";
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-shrink-0 group"
      style={{ scrollSnapAlign: "start" }}
    >
      <div
        className="relative w-24 h-24 rounded-lg overflow-hidden"
        style={{
          border: "2px solid rgba(184,147,106,0.4)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.photo_url}
          alt={photo.photo_type}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        <span
          className="absolute top-1 left-1 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: "rgba(26,22,18,0.7)",
            color: "#faf8f4",
          }}
        >
          {t(tagKey as never)}
        </span>
      </div>
      <p className="text-xs text-text-muted mt-1 text-center w-24 truncate">
        {format(new Date(photo.taken_at), "dd MMM")}
      </p>
    </button>
  );
}

function PhotoPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: ClinicalPhoto[];
  onChange: (id: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-text-primary mb-1">
        {label}
      </span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors min-h-[44px]"
        style={{ borderColor: "rgba(184,147,106,0.3)" }}
      >
        <option value="">—</option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.photo_type.toUpperCase()} • {format(new Date(p.taken_at), "dd MMM yyyy")}
            {p.body_region ? ` • ${p.body_region}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

function GridCard({
  photo,
  onView,
  onDelete,
  t,
}: {
  photo: ClinicalPhoto;
  onView: () => void;
  onDelete: () => void;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const tagKey =
    photo.photo_type === "before"
      ? "progress_photo_type_before"
      : photo.photo_type === "after"
        ? "progress_photo_type_after"
        : "progress_photo_type_during";
  const variant: "info" | "success" | "warning" =
    photo.photo_type === "before"
      ? "info"
      : photo.photo_type === "after"
        ? "success"
        : "warning";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative group rounded-lg overflow-hidden"
      style={{
        border: "1px solid #e8dfcf",
        backgroundColor: "var(--color-card)",
      }}
    >
      <button
        type="button"
        onClick={onView}
        className="block w-full"
        style={{ aspectRatio: "1/1" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.photo_url}
          alt={photo.photo_type}
          className="w-full h-full object-cover"
        />
      </button>
      <div className="absolute top-2 left-2">
        <Badge variant={variant}>{t(tagKey as never)}</Badge>
      </div>
      <button
        type="button"
        onClick={onDelete}
        aria-label={t("progress_delete")}
        className="absolute top-2 right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          backgroundColor: "rgba(26,22,18,0.7)",
          color: "#faf8f4",
        }}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
      <div className="p-2">
        <p className="text-xs text-text-muted">
          {format(new Date(photo.taken_at), "dd MMM yyyy")}
        </p>
        {photo.body_region && (
          <p className="text-xs text-text-secondary truncate">
            {photo.body_region}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function ViewerModal({
  photo,
  onClose,
}: {
  photo: ClinicalPhoto | null;
  onClose: () => void;
}) {
  if (!photo) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.photo_url}
        alt={photo.photo_type}
        className="max-w-full max-h-full object-contain rounded-lg"
      />
    </div>
  );
}

// ─── Capture Modal ──────────────────────────────────────────────────────────

function CaptureModal({
  open,
  onClose,
  doctorId,
  patientId,
  existingSessions,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  doctorId: string;
  patientId: string;
  existingSessions: ClinicalPhoto[];
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<OverlayKind>("face");
  const [photoType, setPhotoType] =
    useState<ClinicalPhoto["photo_type"]>("before");
  const [angle, setAngle] = useState<ClinicalPhoto["angle"]>("front");
  const [bodyRegion, setBodyRegion] = useState("");
  const [notes, setNotes] = useState("");
  const [sessionNum, setSessionNum] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setPreview(null);
      setOverlay("face");
      setPhotoType("before");
      setAngle("front");
      setBodyRegion("");
      setNotes("");
      setSessionNum("");
      setSaving(false);
      setProgressMsg(null);
      setErrorMsg(null);
    }
  }, [open]);

  // Suggest next session number when 'during'
  useEffect(() => {
    if (photoType !== "during") return;
    const usedNums = existingSessions
      .map((p) => {
        if (p.photo_type !== "during") return 0;
        const m = p.notes?.match(/Session\s*(\d+)/i);
        return m ? Number(m[1]) : 0;
      })
      .filter((n) => n > 0);
    const next = (usedNums.length ? Math.max(...usedNums) : 0) + 1;
    setSessionNum(String(next));
  }, [photoType, existingSessions]);

  const onSelectFile = (f: File | null) => {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const save = async () => {
    if (!file) return;
    setSaving(true);
    setErrorMsg(null);
    setProgressMsg(t("progress_compress_progress").replace("{done}", "0").replace("{total}", "1"));
    try {
      const noteWithSession =
        photoType === "during" && sessionNum
          ? `Session ${sessionNum}${notes ? ` — ${notes}` : ""}`
          : notes || null;

      setProgressMsg(t("progress_uploading"));
      const result = await uploadClinicalPhoto({
        doctorId,
        patientId,
        file,
        photoType,
        angle,
        bodyRegion: bodyRegion || null,
        notes: noteWithSession,
      });
      if (result.error) {
        setErrorMsg(result.error.message);
        setSaving(false);
        setProgressMsg(null);
        return;
      }
      onSaved();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setSaving(false);
      setProgressMsg(null);
    }
  };

  if (!open) return null;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={t("progress_capture_title")}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t("progress_cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={save}
            disabled={!file || saving}
            loading={saving}
          >
            {saving ? t("progress_saving") : t("progress_save")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Capture / preview area with overlay */}
        <div
          className="relative rounded-lg overflow-hidden"
          style={{
            backgroundColor: "#1a1612",
            aspectRatio: "4/3",
            border: "1px solid rgba(184,147,106,0.3)",
          }}
        >
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={() => onSelectFile(null)}
                className="absolute top-2 right-2 p-2 rounded-full"
                style={{
                  backgroundColor: "rgba(0,0,0,0.55)",
                  color: "#faf8f4",
                }}
                aria-label={t("progress_capture_retake")}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 flex flex-col items-center justify-center text-text-muted gap-2"
              style={{ color: "#e8dfcf" }}
            >
              <Upload className="w-10 h-10 opacity-60" />
              <span className="text-sm">{t("progress_capture_select_file")}</span>
            </button>
          )}

          {overlay !== "off" && (
            <OverlayGuide kind={overlay} />
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)}
        />

        {/* Overlay toggle */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t("progress_capture_overlay_label")}
          </label>
          <div className="inline-flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(184,147,106,0.3)" }}>
            {(["face", "body", "off"] as OverlayKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setOverlay(k)}
                className="px-3 py-2 text-sm transition-colors min-h-[44px]"
                style={{
                  backgroundColor:
                    overlay === k ? "rgba(184,147,106,0.18)" : "transparent",
                  color: overlay === k ? "#b8936a" : "var(--color-text-secondary, #9a8a76)",
                  fontWeight: overlay === k ? 600 : 400,
                }}
              >
                {k === "face"
                  ? t("progress_capture_overlay_face")
                  : k === "body"
                    ? t("progress_capture_overlay_body")
                    : t("progress_capture_overlay_off")}
              </button>
            ))}
          </div>
        </div>

        {/* Form fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              {t("progress_photo_type")}
            </label>
            <div className="inline-flex rounded-lg overflow-hidden w-full" style={{ border: "1px solid rgba(184,147,106,0.3)" }}>
              {PHOTO_TYPES.map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setPhotoType(tp)}
                  className="flex-1 px-3 py-2 text-sm transition-colors min-h-[44px]"
                  style={{
                    backgroundColor:
                      photoType === tp ? "rgba(184,147,106,0.18)" : "transparent",
                    color: photoType === tp ? "#b8936a" : "inherit",
                    fontWeight: photoType === tp ? 600 : 400,
                  }}
                >
                  {tp === "before"
                    ? t("progress_photo_type_before")
                    : tp === "during"
                      ? t("progress_photo_type_during")
                      : t("progress_photo_type_after")}
                </button>
              ))}
            </div>
          </div>

          {photoType === "during" && (
            <Input
              label={t("progress_session_number")}
              type="number"
              min={1}
              value={sessionNum}
              onChange={(e) => setSessionNum(e.target.value)}
            />
          )}

          <Input
            label={t("progress_body_region")}
            value={bodyRegion}
            onChange={(e) => setBodyRegion(e.target.value)}
            placeholder="e.g. Left cheek"
          />

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              {t("progress_angle")}
            </label>
            <select
              value={angle}
              onChange={(e) =>
                setAngle(e.target.value as ClinicalPhoto["angle"])
              }
              className="w-full px-3 py-2.5 border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors min-h-[44px]"
              style={{ borderColor: "rgba(184,147,106,0.3)" }}
            >
              {ANGLES.map((a) => (
                <option key={a} value={a}>
                  {t(`progress_angle_${a}` as never)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Textarea
          label={t("progress_notes")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        {progressMsg && (
          <p className="text-xs text-text-muted">{progressMsg}</p>
        )}
        {errorMsg && (
          <p className="text-sm" style={{ color: "#b91c1c" }}>
            {errorMsg}
          </p>
        )}
      </div>
    </Modal>
  );
}

function OverlayGuide({ kind }: { kind: "face" | "body" }) {
  // 15-20% opacity outline for repeatable angle alignment.
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      style={{ opacity: 0.18 }}
    >
      {kind === "face" ? (
        <g
          fill="none"
          stroke="#b8936a"
          strokeWidth="0.5"
          strokeLinecap="round"
        >
          {/* Face oval */}
          <ellipse cx="50" cy="48" rx="22" ry="30" />
          {/* Hairline */}
          <path d="M28,38 Q50,18 72,38" />
          {/* Eyes */}
          <ellipse cx="41" cy="46" rx="3" ry="1.5" />
          <ellipse cx="59" cy="46" rx="3" ry="1.5" />
          {/* Nose */}
          <path d="M50,49 Q49,57 50,60 Q51,57 50,49" />
          {/* Mouth */}
          <path d="M44,68 Q50,72 56,68" />
          {/* Center axis */}
          <line x1="50" y1="20" x2="50" y2="76" strokeDasharray="1 1.5" />
        </g>
      ) : (
        <g
          fill="none"
          stroke="#b8936a"
          strokeWidth="0.5"
          strokeLinecap="round"
        >
          {/* Head */}
          <circle cx="50" cy="14" r="6" />
          {/* Neck */}
          <line x1="50" y1="20" x2="50" y2="26" />
          {/* Shoulders + torso */}
          <path d="M30,32 L50,26 L70,32 L66,68 L34,68 Z" />
          {/* Arms */}
          <line x1="30" y1="32" x2="22" y2="62" />
          <line x1="70" y1="32" x2="78" y2="62" />
          {/* Hips + legs */}
          <line x1="40" y1="68" x2="38" y2="92" />
          <line x1="60" y1="68" x2="62" y2="92" />
          {/* Center axis */}
          <line x1="50" y1="6" x2="50" y2="92" strokeDasharray="1 1.5" />
        </g>
      )}
    </svg>
  );
}

// ─── Export Modal ───────────────────────────────────────────────────────────

function ExportModal({
  open,
  onClose,
  before,
  after,
  doctorId,
  patientId,
  patientName,
}: {
  open: boolean;
  onClose: () => void;
  before: ClinicalPhoto | null;
  after: ClinicalPhoto | null;
  doctorId: string;
  patientId: string;
  patientName: string | null;
}) {
  const { t } = useLanguage();
  const [layout, setLayout] = useState<"side_by_side" | "stacked">(
    "side_by_side"
  );
  const [fmt, setFmt] = useState<"jpeg" | "png">("jpeg");
  const [showName, setShowName] = useState(false);
  const [letterhead, setLetterhead] = useState<ClinicLetterhead | null>(null);
  const [exporting, setExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !doctorId) return;
    fetchLetterheadFromDoctor(doctorId)
      .then(setLetterhead)
      .catch(() => setLetterhead(null));
  }, [open, doctorId]);

  const handleExport = async () => {
    if (!before || !after) return;
    setExporting(true);
    setErrorMsg(null);
    try {
      const filename = `tvacha-comparison-${patientId}-${Date.now()}`;
      await downloadComparison(
        filename,
        {
          beforeUrl: before.photo_url,
          afterUrl: after.photo_url,
          beforeDate: before.taken_at,
          afterDate: after.taken_at,
          patientName,
          patientId,
          bodyRegion: before.body_region ?? after.body_region ?? null,
          letterhead,
          layout,
          showPatientName: showName,
          watermark: letterhead?.clinicName ?? "Tvacha Clinic",
        },
        { format: fmt, quality: 0.92 }
      );
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : t("progress_export_error")
      );
    } finally {
      setExporting(false);
    }
  };

  if (!open) return null;
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={t("progress_export")}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={exporting}>
            {t("progress_cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={!before || !after || exporting}
            loading={exporting}
          >
            <Download className="w-4 h-4 mr-1.5" />
            {exporting ? t("progress_exporting") : t("progress_export_download")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t("progress_export_layout")}
          </label>
          <div className="inline-flex rounded-lg overflow-hidden w-full" style={{ border: "1px solid rgba(184,147,106,0.3)" }}>
            {(["side_by_side", "stacked"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setLayout(k)}
                className="flex-1 px-3 py-2 text-sm transition-colors min-h-[44px]"
                style={{
                  backgroundColor:
                    layout === k ? "rgba(184,147,106,0.18)" : "transparent",
                  color: layout === k ? "#b8936a" : "inherit",
                  fontWeight: layout === k ? 600 : 400,
                }}
              >
                {k === "side_by_side"
                  ? t("progress_export_layout_side")
                  : t("progress_export_layout_stacked")}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t("progress_export_format")}
          </label>
          <div className="inline-flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(184,147,106,0.3)" }}>
            {(["jpeg", "png"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setFmt(k)}
                className="px-4 py-2 text-sm transition-colors min-h-[44px]"
                style={{
                  backgroundColor:
                    fmt === k ? "rgba(184,147,106,0.18)" : "transparent",
                  color: fmt === k ? "#b8936a" : "inherit",
                  fontWeight: fmt === k ? 600 : 400,
                }}
              >
                {k.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none min-h-[44px]">
          <input
            type="checkbox"
            checked={showName}
            onChange={(e) => setShowName(e.target.checked)}
            className="w-5 h-5 rounded border-primary-200 text-primary-500 focus:ring-primary-500"
          />
          <span className="text-sm text-text-primary">
            {t("progress_export_show_name")}
          </span>
        </label>

        {errorMsg && (
          <p className="text-sm" style={{ color: "#b91c1c" }}>
            {errorMsg}
          </p>
        )}
      </div>
    </Modal>
  );
}
