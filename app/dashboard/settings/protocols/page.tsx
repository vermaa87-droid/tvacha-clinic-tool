"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil, Plus, Trash2, FlaskConical, Check, X } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import type { FollowUpProtocol } from "@/lib/types";

type DraftProtocol = Omit<
  FollowUpProtocol,
  "id" | "doctor_id" | "created_at" | "updated_at" | "is_default"
>;

function emptyDraft(): DraftProtocol {
  return {
    condition_name: "",
    interval_days: 14,
    max_sessions: null,
    requires_labs: false,
    lab_instructions: null,
    notes: null,
    is_active: true,
  };
}

export default function ProtocolsPage() {
  const { doctor } = useAuthStore();
  const { t } = useLanguage();
  const [protocols, setProtocols] = useState<FollowUpProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<DraftProtocol>(emptyDraft());
  const [saving, setSaving] = useState(false);

  const fetchProtocols = useCallback(async () => {
    if (!doctor?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("follow_up_protocols")
      .select("*")
      .eq("doctor_id", doctor.id)
      .order("condition_name", { ascending: true });
    setProtocols((data as FollowUpProtocol[]) ?? []);
    setLoading(false);
  }, [doctor?.id]);

  useEffect(() => {
    fetchProtocols();
  }, [fetchProtocols]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") fetchProtocols();
    };
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [fetchProtocols]);

  const startNew = () => {
    setDraft(emptyDraft());
    setEditingId("new");
  };

  const startEdit = (p: FollowUpProtocol) => {
    setDraft({
      condition_name: p.condition_name,
      interval_days: p.interval_days,
      max_sessions: p.max_sessions,
      requires_labs: p.requires_labs,
      lab_instructions: p.lab_instructions,
      notes: p.notes,
      is_active: p.is_active,
    });
    setEditingId(p.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const save = async () => {
    if (!doctor?.id || !draft.condition_name.trim()) return;
    setSaving(true);
    try {
      if (editingId === "new") {
        const { data, error } = await supabase
          .from("follow_up_protocols")
          .insert({ ...draft, doctor_id: doctor.id })
          .select("*")
          .single();
        if (!error && data) {
          setProtocols((prev) =>
            [...prev, data as FollowUpProtocol].sort((a, b) =>
              a.condition_name.localeCompare(b.condition_name)
            )
          );
        }
      } else if (editingId) {
        const { data, error } = await supabase
          .from("follow_up_protocols")
          .update(draft)
          .eq("id", editingId)
          .select("*")
          .single();
        if (!error && data) {
          setProtocols((prev) =>
            prev.map((p) => (p.id === editingId ? (data as FollowUpProtocol) : p))
          );
        }
      }
      cancelEdit();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t("protocols_confirm_delete"))) return;
    const prev = protocols;
    setProtocols((p) => p.filter((x) => x.id !== id));
    const { error } = await supabase
      .from("follow_up_protocols")
      .delete()
      .eq("id", id);
    if (error) setProtocols(prev);
  };

  const isEditing = editingId !== null;
  const canSave = useMemo(
    () => draft.condition_name.trim().length > 0 && draft.interval_days > 0,
    [draft]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <Link
            href="/dashboard/settings"
            className="text-sm text-primary-500 hover:underline inline-block mb-2"
          >
            {t("protocols_back_to_settings")}
          </Link>
          <h1
            className="text-2xl sm:text-3xl md:text-4xl font-serif font-semibold text-text-primary"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {t("protocols_title")}
          </h1>
          <p className="text-text-secondary mt-1 text-sm sm:text-base">
            {t("protocols_subtitle")}
          </p>
        </div>
        <Button
          onClick={startNew}
          disabled={isEditing}
          className="min-h-[44px] inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("protocols_add")}
        </Button>
      </div>

      <AnimatePresence>
        {editingId === "new" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ProtocolEditor
              t={t}
              draft={draft}
              setDraft={setDraft}
              onSave={save}
              onCancel={cancelEdit}
              saving={saving}
              canSave={canSave}
              isNew
            />
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <Card>
          <CardBody>
            <div className="text-text-muted text-sm">Loading…</div>
          </CardBody>
        </Card>
      ) : protocols.length === 0 && editingId !== "new" ? (
        <Card>
          <CardBody>
            <p className="text-center text-text-muted py-6">{t("protocols_empty")}</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {protocols.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                layout
              >
                {editingId === p.id ? (
                  <ProtocolEditor
                    t={t}
                    draft={draft}
                    setDraft={setDraft}
                    onSave={save}
                    onCancel={cancelEdit}
                    saving={saving}
                    canSave={canSave}
                  />
                ) : (
                  <ProtocolRow
                    t={t}
                    protocol={p}
                    onEdit={() => startEdit(p)}
                    onDelete={() => remove(p.id)}
                    disabled={isEditing}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function ProtocolRow({
  t,
  protocol,
  onEdit,
  onDelete,
  disabled,
}: {
  t: ReturnType<typeof useLanguage>["t"];
  protocol: FollowUpProtocol;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="text-lg font-serif font-semibold text-text-primary">
                {protocol.condition_name}
              </h3>
              {protocol.is_default && (
                <Badge variant="info">{t("protocols_default_badge")}</Badge>
              )}
              {!protocol.is_active && (
                <Badge variant="warning">{t("protocols_inactive")}</Badge>
              )}
              {protocol.requires_labs && (
                <span
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                  style={{
                    color: "#b8936a",
                    backgroundColor: "rgba(184,147,106,0.12)",
                  }}
                >
                  <FlaskConical className="w-3 h-3" />
                  {t("protocols_requires_labs")}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
              <span>
                {t("protocols_interval")}: <strong>{protocol.interval_days}</strong>
              </span>
              {protocol.max_sessions && (
                <span>
                  {t("protocols_max_sessions")}:{" "}
                  <strong>{protocol.max_sessions}</strong>
                </span>
              )}
            </div>
            {protocol.requires_labs && protocol.lab_instructions && (
              <p className="mt-2 text-sm text-text-muted">
                {protocol.lab_instructions}
              </p>
            )}
            {protocol.notes && (
              <p className="mt-1 text-sm text-text-muted italic">
                {protocol.notes}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              disabled={disabled}
              className="min-h-[44px] inline-flex items-center gap-1"
            >
              <Pencil className="w-4 h-4" />
              {t("protocols_edit")}
            </Button>
            {!protocol.is_default && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                disabled={disabled}
                className="min-h-[44px] inline-flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function ProtocolEditor({
  t,
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
  canSave,
  isNew,
}: {
  t: ReturnType<typeof useLanguage>["t"];
  draft: DraftProtocol;
  setDraft: (d: DraftProtocol) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  canSave: boolean;
  isNew?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-serif font-semibold text-text-primary">
          {isNew ? t("protocols_new") : t("protocols_edit")}
        </h3>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t("protocols_condition")}
            required
            value={draft.condition_name}
            onChange={(e) => setDraft({ ...draft, condition_name: e.target.value })}
            placeholder="e.g. Psoriasis"
          />
          <Input
            label={t("protocols_interval")}
            type="number"
            min={1}
            required
            value={draft.interval_days}
            onChange={(e) =>
              setDraft({ ...draft, interval_days: Math.max(1, Number(e.target.value) || 0) })
            }
          />
          <Input
            label={t("protocols_max_sessions")}
            type="number"
            min={1}
            value={draft.max_sessions ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                max_sessions: e.target.value ? Number(e.target.value) : null,
              })
            }
            placeholder="Unlimited"
          />
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none min-h-[44px]">
              <input
                type="checkbox"
                checked={draft.requires_labs}
                onChange={(e) =>
                  setDraft({ ...draft, requires_labs: e.target.checked })
                }
                className="w-5 h-5 rounded border-primary-200 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-text-primary">
                {t("protocols_requires_labs")}
              </span>
            </label>
          </div>
        </div>

        {draft.requires_labs && (
          <div className="mt-4">
            <Textarea
              label={t("protocols_lab_instructions")}
              value={draft.lab_instructions ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, lab_instructions: e.target.value || null })
              }
              rows={2}
              placeholder="e.g. LFT, CBC before next visit"
            />
          </div>
        )}

        <div className="mt-4">
          <Textarea
            label={t("protocols_notes")}
            value={draft.notes ?? ""}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value || null })}
            rows={2}
          />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
              className="w-5 h-5 rounded border-primary-200 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-text-primary">
              {t("protocols_active")}
            </span>
          </label>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={saving}
            className="min-h-[44px] inline-flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            {t("protocols_cancel")}
          </Button>
          <Button
            onClick={onSave}
            disabled={!canSave || saving}
            loading={saving}
            className="min-h-[44px] inline-flex items-center gap-1"
          >
            <Check className="w-4 h-4" />
            {saving ? t("protocols_saving") : t("protocols_save")}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
