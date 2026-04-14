"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Trash2,
  X,
  Check,
  Pencil,
  Plus,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import type { LesionMarking, ClinicalPhoto } from "@/lib/types";
import {
  BODY_REGIONS,
  LESION_TYPES,
  type BodyView,
} from "./bodyMapRegions";

interface PatientBodyMapTabProps {
  doctorId: string;
  patientId: string;
  visits: Array<{ id: string; visit_date: string | null; diagnosis: string | null }>;
}

type VisitFilter = "all" | "current" | string;

export function PatientBodyMapTab({
  doctorId,
  patientId,
  visits,
}: PatientBodyMapTabProps) {
  const { t } = useLanguage();
  const [view, setView] = useState<BodyView>("front");
  const [markings, setMarkings] = useState<LesionMarking[]>([]);
  const [photos, setPhotos] = useState<ClinicalPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [visitFilter, setVisitFilter] = useState<VisitFilter>("all");
  const [editing, setEditing] = useState<LesionMarking | null>(null);
  const [newRegion, setNewRegion] = useState<{ region: string; x: number; y: number } | null>(null);
  const [viewingRegion, setViewingRegion] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!doctorId || !patientId) return;
    setLoading(true);
    const [mrks, phs] = await Promise.all([
      supabase
        .from("lesion_markings")
        .select("*")
        .eq("doctor_id", doctorId)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: true }),
      supabase
        .from("clinical_photos")
        .select("*")
        .eq("doctor_id", doctorId)
        .eq("patient_id", patientId)
        .order("taken_at", { ascending: false }),
    ]);
    setMarkings((mrks.data as LesionMarking[]) ?? []);
    setPhotos((phs.data as ClinicalPhoto[]) ?? []);
    setLoading(false);
  }, [doctorId, patientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === "visible") fetchData(); };
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [fetchData]);

  const regionsForView = useMemo(
    () => BODY_REGIONS.filter((r) => r.view === view),
    [view]
  );

  const filteredMarkings = useMemo(() => {
    let base = markings.filter((m) => m.body_view === view);
    if (visitFilter === "current") {
      base = base.filter((m) => m.visit_id === null);
    } else if (visitFilter !== "all") {
      base = base.filter((m) => m.visit_id === visitFilter);
    }
    return base;
  }, [markings, view, visitFilter]);

  const markedRegionKeys = useMemo(() => {
    const keys = new Set<string>();
    filteredMarkings.forEach((m) => keys.add(m.body_region));
    return keys;
  }, [filteredMarkings]);

  const markingsByRegion = useMemo(() => {
    const map = new Map<string, LesionMarking[]>();
    filteredMarkings.forEach((m) => {
      const list = map.get(m.body_region) ?? [];
      map.set(m.body_region, [...list, m]);
    });
    return map;
  }, [filteredMarkings]);

  // Auto-close detail panel if the region loses all its markings
  useEffect(() => {
    if (viewingRegion && !markedRegionKeys.has(viewingRegion)) {
      setViewingRegion(null);
    }
  }, [markedRegionKeys, viewingRegion]);

  const handleRegionClick = (regionKey: string, evt: React.MouseEvent<SVGPathElement>) => {
    if (markedRegionKeys.has(regionKey)) {
      setViewingRegion(regionKey);
      return;
    }
    const svg = evt.currentTarget.ownerSVGElement as SVGSVGElement | null;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((evt.clientX - rect.left) / rect.width) * (svg.viewBox.baseVal.width || 200);
    const y = ((evt.clientY - rect.top) / rect.height) * (svg.viewBox.baseVal.height || 500);
    setNewRegion({ region: regionKey, x, y });
  };

  const saveMarking = async (payload: Partial<LesionMarking>) => {
    if (!doctorId || !patientId) return;
    const visitId = visitFilter !== "all" && visitFilter !== "current" ? visitFilter : null;

    if (editing) {
      const { data, error } = await supabase
        .from("lesion_markings")
        .update({
          lesion_type: payload.lesion_type ?? null,
          size_mm: payload.size_mm ?? null,
          color: payload.color ?? null,
          shape: payload.shape ?? null,
          count: payload.count ?? null,
          notes: payload.notes ?? null,
          clinical_photo_id: payload.clinical_photo_id ?? null,
        })
        .eq("id", editing.id)
        .eq("doctor_id", doctorId)
        .select("*")
        .single();
      if (!error && data) {
        setMarkings((prev) =>
          prev.map((m) => (m.id === editing.id ? (data as LesionMarking) : m))
        );
      }
      setEditing(null);
      return;
    }

    if (!newRegion) return;
    const { data, error } = await supabase
      .from("lesion_markings")
      .insert({
        patient_id: patientId,
        doctor_id: doctorId,
        visit_id: visitId,
        body_view: view,
        body_region: newRegion.region,
        position_x: newRegion.x,
        position_y: newRegion.y,
        lesion_type: payload.lesion_type ?? null,
        size_mm: payload.size_mm ?? null,
        color: payload.color ?? null,
        shape: payload.shape ?? null,
        count: payload.count ?? null,
        notes: payload.notes ?? null,
        clinical_photo_id: payload.clinical_photo_id ?? null,
      })
      .select("*")
      .single();
    if (!error && data) {
      setMarkings((prev) => [...prev, data as LesionMarking]);
    }
    setNewRegion(null);
  };

  const deleteMarking = async (m: LesionMarking) => {
    if (!confirm(t("bodymap_delete_confirm"))) return;
    const prev = markings;
    setMarkings((list) => list.filter((x) => x.id !== m.id));
    setEditing(null);
    const { error } = await supabase
      .from("lesion_markings")
      .delete()
      .eq("id", m.id)
      .eq("doctor_id", doctorId);
    if (error) setMarkings(prev);
  };

  const handleAddAnotherToRegion = (regionKey: string) => {
    const existing = markingsByRegion.get(regionKey);
    const ref = existing?.[0];
    setNewRegion({
      region: regionKey,
      x: ref?.position_x ?? 100,
      y: ref?.position_y ?? 250,
    });
    setViewingRegion(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h3
            className="text-lg sm:text-xl font-semibold text-text-primary"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {t("bodymap_tab_title")}
          </h3>
          <p className="text-text-secondary text-sm mt-0.5">
            {t("bodymap_tab_subtitle")}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-text-muted mb-1 uppercase tracking-wide">
            {t("bodymap_tab_title")}
          </label>
          <div
            className="inline-flex rounded-lg overflow-hidden"
            style={{ border: "1px solid rgba(184,147,106,0.3)" }}
          >
            {(["front", "back"] as BodyView[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className="px-4 py-2 text-sm transition-colors min-h-[44px]"
                style={{
                  backgroundColor: view === v ? "rgba(184,147,106,0.18)" : "transparent",
                  color: view === v ? "#b8936a" : "inherit",
                  fontWeight: view === v ? 600 : 400,
                }}
              >
                {v === "front" ? t("bodymap_view_front") : t("bodymap_view_back")}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs text-text-muted mb-1 uppercase tracking-wide">
            {t("bodymap_visit_label")}
          </label>
          <select
            value={visitFilter}
            onChange={(e) => setVisitFilter(e.target.value as VisitFilter)}
            className="w-full px-3 py-2.5 border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors min-h-[44px]"
            style={{ borderColor: "rgba(184,147,106,0.3)" }}
          >
            <option value="all">{t("bodymap_visit_all")}</option>
            <option value="current">{t("bodymap_visit_current")}</option>
            {visits.map((v) => (
              <option key={v.id} value={v.id}>
                {v.visit_date ? format(new Date(v.visit_date), "dd MMM yyyy") : "—"}
                {v.diagnosis ? ` — ${v.diagnosis}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div
          className="inline-flex rounded-lg overflow-hidden"
          style={{ border: "1px solid rgba(184,147,106,0.3)" }}
        >
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
            aria-label={t("bodymap_zoom_out")}
            disabled={zoom <= 1}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-text-secondary disabled:opacity-40"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            aria-label={t("bodymap_zoom_reset")}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-text-secondary"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            aria-label={t("bodymap_zoom_in")}
            disabled={zoom >= 3}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-text-secondary disabled:opacity-40"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Card>
        <CardBody>
          {loading ? (
            <div className="text-text-muted text-sm py-10 text-center">Loading…</div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-text-muted text-center">
                {t("bodymap_tap_hint")}
              </p>
              <BodyMapSvg
                view={view}
                zoom={zoom}
                regions={regionsForView}
                markedRegionKeys={markedRegionKeys}
                onRegionClick={handleRegionClick}
                t={t}
              />
              <p className="text-xs text-text-muted text-center">
                {t("bodymap_summary").replace("{n}", String(filteredMarkings.length))}
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Add-marking modal */}
      <AnimatePresence>
        {newRegion && (
          <MarkingPopover
            mode="new"
            regionKey={newRegion.region}
            photos={photos}
            onClose={() => setNewRegion(null)}
            onSave={saveMarking}
          />
        )}
      </AnimatePresence>

      {/* Edit-marking modal */}
      <AnimatePresence>
        {editing && (
          <MarkingPopover
            mode="edit"
            regionKey={editing.body_region}
            initial={editing}
            photos={photos}
            onClose={() => setEditing(null)}
            onSave={saveMarking}
            onDelete={() => deleteMarking(editing)}
          />
        )}
      </AnimatePresence>

      {/* Region detail panel */}
      <AnimatePresence>
        {viewingRegion && !editing && (
          <RegionDetailPanel
            regionKey={viewingRegion}
            markings={markingsByRegion.get(viewingRegion) ?? []}
            onClose={() => setViewingRegion(null)}
            onEdit={(m) => { setEditing(m); setViewingRegion(null); }}
            onDelete={deleteMarking}
            onAddAnother={() => handleAddAnotherToRegion(viewingRegion)}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Body map SVG ── */

function BodyMapSvg({
  view: _view,
  zoom,
  regions,
  markedRegionKeys,
  onRegionClick,
  t,
}: {
  view: BodyView;
  zoom: number;
  regions: typeof BODY_REGIONS;
  markedRegionKeys: Set<string>;
  onRegionClick: (key: string, evt: React.MouseEvent<SVGPathElement>) => void;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverRegion, setHoverRegion] = useState<string | null>(null);

  return (
    <div
      ref={containerRef}
      className="mx-auto w-full overflow-auto touch-pan-x touch-pan-y"
      style={{ maxWidth: 520, backgroundColor: "var(--color-background)", borderRadius: 12 }}
    >
      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: "top center",
          transition: "transform 0.2s ease",
        }}
      >
        <svg
          viewBox="0 0 200 500"
          className="w-full h-auto block"
          style={{ touchAction: "manipulation" }}
        >
          {/* ── Decorative silhouette backdrop (non-interactive) ── */}
          <g
            fill="rgba(184,147,106,0.04)"
            stroke="#b8936a"
            strokeWidth="0.5"
            strokeLinejoin="round"
            style={{ pointerEvents: "none" }}
          >
            {/* Head (full oval) */}
            <ellipse cx="100" cy="44" rx="30" ry="36" />
            {/* Neck */}
            <path d="M 90 80 C 90 92 89 108 89 118 L 111 118 C 111 108 110 92 110 80 Z" />
            {/* Torso */}
            <path d="M 89 118 C 80 118 63 124 57 136 L 55 196 L 55 260 C 59 250 63 260 137 260 C 141 250 145 196 145 196 L 143 136 C 137 124 120 118 111 118 Z" />
            {/* Right arm (viewer's left) */}
            <path d="M 62 122 C 55 124 45 136 43 148 L 39 196 L 33 258 L 55 258 L 57 196 L 57 196 C 58 164 61 140 62 122 Z" />
            {/* Left arm (viewer's right) */}
            <path d="M 138 122 C 145 124 155 136 157 148 L 161 196 L 167 258 L 147 258 L 143 196 C 142 164 139 140 138 122 Z" />
            {/* Right hand */}
            <path d="M 33 260 L 55 260 C 56 274 56 286 52 290 C 47 295 37 295 33 290 C 30 286 30 274 33 260 Z" />
            {/* Left hand */}
            <path d="M 147 260 L 169 260 C 171 274 169 286 165 290 C 160 295 150 295 146 290 C 143 286 143 274 147 260 Z" />
            {/* Right thigh */}
            <path d="M 69 262 L 100 262 C 100 298 98 332 94 366 L 73 366 C 69 332 67 298 69 262 Z" />
            {/* Left thigh */}
            <path d="M 100 262 L 131 262 C 132 298 129 332 125 366 L 104 366 C 100 332 98 298 100 262 Z" />
            {/* Right lower leg */}
            <path d="M 73 368 L 94 368 C 96 404 96 436 94 454 L 78 454 C 76 436 74 404 73 368 Z" />
            {/* Left lower leg */}
            <path d="M 104 368 L 125 368 C 125 404 123 436 121 454 L 106 454 C 104 436 102 404 104 368 Z" />
            {/* Right foot */}
            <path d="M 92 455 C 92 463 90 471 84 475 C 76 479 64 476 60 468 C 58 461 61 455 74 455 Z" />
            {/* Left foot */}
            <path d="M 106 455 C 106 463 109 471 117 475 C 125 479 137 476 140 468 C 142 461 139 455 126 455 Z" />
          </g>

          {/* ── Interactive region overlays ── */}
          <g strokeLinejoin="round">
            {regions.map((r) => {
              const isMarked = markedRegionKeys.has(r.key);
              const isHovered = hoverRegion === r.key;
              return (
                <path
                  key={`${r.view}-${r.key}`}
                  d={r.path}
                  fill={
                    isMarked
                      ? isHovered
                        ? "rgba(220,38,38,0.30)"
                        : "rgba(220,38,38,0.18)"
                      : isHovered
                      ? "rgba(184,147,106,0.22)"
                      : "transparent"
                  }
                  stroke={isMarked ? "#dc2626" : isHovered ? "#b8936a" : "transparent"}
                  strokeWidth={isMarked ? "1.4" : "1"}
                  style={{ cursor: "pointer", transition: "fill 0.12s ease" }}
                  onMouseEnter={() => setHoverRegion(r.key)}
                  onMouseLeave={() => setHoverRegion(null)}
                  onClick={(e) => onRegionClick(r.key, e)}
                >
                  <title>
                    {t(r.labelKey as never)}
                    {isMarked ? " — click to view" : " — click to mark"}
                  </title>
                </path>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}

/* ── Region detail panel ── */

function RegionDetailPanel({
  regionKey,
  markings,
  onClose,
  onEdit,
  onDelete,
  onAddAnother,
  t,
}: {
  regionKey: string;
  markings: LesionMarking[];
  onClose: () => void;
  onEdit: (m: LesionMarking) => void;
  onDelete: (m: LesionMarking) => void;
  onAddAnother: () => void;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
        aria-label="Close"
      />
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[85vh]"
        style={{ backgroundColor: "var(--color-card)", border: "1px solid #e8dfcf" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: "rgba(184,147,106,0.25)" }}
        >
          <div>
            <h3
              className="text-lg font-semibold text-text-primary"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {t(`bodymap_region_${regionKey}` as never)}
            </h3>
            <p className="text-xs text-text-muted">
              {markings.length} {markings.length === 1 ? "marking" : "markings"} recorded
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Marking list */}
        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-3">
          {markings.map((m, idx) => (
            <div
              key={m.id}
              className="rounded-xl p-4 space-y-2"
              style={{
                background: "rgba(220,38,38,0.05)",
                border: "1px solid rgba(220,38,38,0.15)",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white flex-shrink-0"
                    style={{ background: "#dc2626" }}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-sm font-semibold text-text-primary">
                    {m.lesion_type
                      ? t(`bodymap_lesion_type_${m.lesion_type}` as never)
                      : "Unspecified lesion"}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onEdit(m)}
                    className="p-1.5 rounded-lg text-text-secondary hover:text-[#b8936a] transition-colors"
                    style={{ hover: { background: "rgba(184,147,106,0.1)" } } as React.CSSProperties}
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(m)}
                    className="p-1.5 rounded-lg text-text-secondary hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Detail chips */}
              {(m.size_mm != null || m.count != null || m.color || m.shape) && (
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 pl-8 text-xs text-text-secondary">
                  {m.size_mm != null && (
                    <span>
                      Size:{" "}
                      <span className="text-text-primary font-medium">{m.size_mm} mm</span>
                    </span>
                  )}
                  {m.count != null && (
                    <span>
                      Count:{" "}
                      <span className="text-text-primary font-medium">{m.count}</span>
                    </span>
                  )}
                  {m.color && (
                    <span>
                      Color:{" "}
                      <span className="text-text-primary font-medium">{m.color}</span>
                    </span>
                  )}
                  {m.shape && (
                    <span>
                      Shape:{" "}
                      <span className="text-text-primary font-medium">{m.shape}</span>
                    </span>
                  )}
                </div>
              )}

              {m.notes && (
                <p className="text-xs text-text-secondary pl-8 line-clamp-3">{m.notes}</p>
              )}

              <p className="text-[10px] text-text-muted pl-8">
                {format(new Date(m.created_at), "dd MMM yyyy, hh:mm a")}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="flex justify-between items-center gap-3 px-5 py-4 border-t flex-shrink-0"
          style={{ borderColor: "rgba(184,147,106,0.25)" }}
        >
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={onAddAnother}
            className="inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Another
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Add / Edit popover ── */

function MarkingPopover({
  mode,
  regionKey,
  initial,
  photos,
  onClose,
  onSave,
  onDelete,
}: {
  mode: "new" | "edit";
  regionKey: string;
  initial?: LesionMarking;
  photos: ClinicalPhoto[];
  onClose: () => void;
  onSave: (payload: Partial<LesionMarking>) => Promise<void> | void;
  onDelete?: () => void;
}) {
  const { t } = useLanguage();
  const [lesionType, setLesionType] = useState<string>(initial?.lesion_type ?? "");
  const [sizeMm, setSizeMm] = useState<string>(
    initial?.size_mm != null ? String(initial.size_mm) : ""
  );
  const [color, setColor] = useState<string>(initial?.color ?? "");
  const [shape, setShape] = useState<string>(initial?.shape ?? "");
  const [count, setCount] = useState<string>(
    initial?.count != null ? String(initial.count) : ""
  );
  const [notes, setNotes] = useState<string>(initial?.notes ?? "");
  const [photoId, setPhotoId] = useState<string>(initial?.clinical_photo_id ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await onSave({
        lesion_type: lesionType || null,
        size_mm: sizeMm ? Number(sizeMm) : null,
        color: color || null,
        shape: shape || null,
        count: count ? Number(count) : null,
        notes: notes || null,
        clinical_photo_id: photoId || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
        aria-label="Close"
      />
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[90vh]"
        style={{ backgroundColor: "var(--color-card)", border: "1px solid #e8dfcf" }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: "rgba(184,147,106,0.25)" }}
        >
          <div>
            <h3
              className="text-lg font-semibold text-text-primary"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {mode === "edit" ? "Edit Marking" : t("bodymap_marking_title")}
            </h3>
            <p className="text-xs text-text-muted">
              {t("bodymap_region_label")}:{" "}
              {t(`bodymap_region_${regionKey}` as never)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              {t("bodymap_lesion_type")}
            </label>
            <select
              value={lesionType}
              onChange={(e) => setLesionType(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors min-h-[44px]"
              style={{ borderColor: "rgba(184,147,106,0.3)" }}
            >
              <option value="">—</option>
              {LESION_TYPES.map((lt) => (
                <option key={lt} value={lt}>
                  {t(`bodymap_lesion_type_${lt}` as never)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t("bodymap_size_mm")}
              type="number"
              min={0}
              step="0.1"
              value={sizeMm}
              onChange={(e) => setSizeMm(e.target.value)}
            />
            <Input
              label={t("bodymap_count")}
              type="number"
              min={1}
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
            <Input
              label={t("bodymap_color")}
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="e.g. Erythematous"
            />
            <Input
              label={t("bodymap_shape")}
              value={shape}
              onChange={(e) => setShape(e.target.value)}
              placeholder="e.g. Round, annular"
            />
          </div>

          <Textarea
            label={t("bodymap_notes")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />

          {photos.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                {t("bodymap_link_photo")}
              </label>
              <select
                value={photoId}
                onChange={(e) => setPhotoId(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors min-h-[44px]"
                style={{ borderColor: "rgba(184,147,106,0.3)" }}
              >
                <option value="">{t("bodymap_link_photo_none")}</option>
                {photos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.photo_type.toUpperCase()} •{" "}
                    {format(new Date(p.taken_at), "dd MMM yyyy")}
                    {p.body_region ? ` • ${p.body_region}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div
          className="flex justify-between gap-3 px-5 py-4 border-t flex-shrink-0"
          style={{ borderColor: "rgba(184,147,106,0.25)" }}
        >
          {mode === "edit" && onDelete ? (
            <Button
              variant="ghost"
              onClick={onDelete}
              disabled={saving}
              className="inline-flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              {t("bodymap_delete")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              {t("bodymap_cancel")}
            </Button>
            <Button
              variant="primary"
              onClick={submit}
              loading={saving}
              disabled={saving}
              className="inline-flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
              {saving ? t("bodymap_saving") : t("bodymap_save")}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
