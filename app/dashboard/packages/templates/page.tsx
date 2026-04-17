"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil, Plus, Power, Check, X, Trash2, Package as PackageIcon } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import type { PackageTemplate } from "@/lib/types";

type DraftTemplate = Omit<
  PackageTemplate,
  "id" | "doctor_id" | "clinic_id" | "created_at" | "updated_at"
>;

function emptyDraft(): DraftTemplate {
  return {
    name: "",
    total_sessions: 6,
    suggested_price: 0,
    session_interval_days: 14,
    validity_months: 6,
    notes: null,
    equipment_needed: null,
    is_active: true,
  };
}

export default function PackageTemplatesPage() {
  const { doctor } = useAuthStore();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<PackageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<DraftTemplate>(emptyDraft());
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!doctor?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("package_templates")
      .select("*")
      .eq("doctor_id", doctor.id)
      .order("name", { ascending: true });
    setTemplates((data as PackageTemplate[]) ?? []);
    setLoading(false);
  }, [doctor?.id]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") fetchTemplates();
    };
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [fetchTemplates]);

  const startNew = () => {
    setDraft(emptyDraft());
    setEditingId("new");
  };

  const startEdit = (p: PackageTemplate) => {
    setDraft({
      name: p.name,
      total_sessions: p.total_sessions,
      suggested_price: p.suggested_price,
      session_interval_days: p.session_interval_days,
      validity_months: p.validity_months,
      notes: p.notes,
      equipment_needed: p.equipment_needed,
      is_active: p.is_active,
    });
    setEditingId(p.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const save = async () => {
    if (!doctor?.id || !draft.name.trim()) return;
    setSaving(true);
    try {
      if (editingId === "new") {
        const { data, error } = await supabase
          .from("package_templates")
          .insert({ ...draft, doctor_id: doctor.id, clinic_id: doctor.id })
          .select("*")
          .single();
        if (error) {
          showToast({ message: t("common_error") });
          return;
        }
        if (data) {
          setTemplates((prev) =>
            [...prev, data as PackageTemplate].sort((a, b) =>
              a.name.localeCompare(b.name)
            )
          );
        }
      } else if (editingId) {
        const { data, error } = await supabase
          .from("package_templates")
          .update(draft)
          .eq("id", editingId)
          .eq("doctor_id", doctor.id)
          .select("*")
          .single();
        if (error) {
          showToast({ message: t("common_error") });
          return;
        }
        if (data) {
          setTemplates((prev) =>
            prev.map((p) => (p.id === editingId ? (data as PackageTemplate) : p))
          );
        }
      }
      cancelEdit();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: PackageTemplate) => {
    if (p.is_active && !confirm(t("packages_template_confirm_delete"))) return;
    const next = !p.is_active;
    const prev = templates;
    setTemplates((list) =>
      list.map((x) => (x.id === p.id ? { ...x, is_active: next } : x))
    );
    const { error } = await supabase
      .from("package_templates")
      .update({ is_active: next })
      .eq("id", p.id)
      .eq("doctor_id", doctor?.id ?? "");
    if (error) setTemplates(prev);
  };

  const deleteTemplate = async (p: PackageTemplate) => {
    if (!confirm(`Permanently delete "${p.name}"? This cannot be undone.`)) return;
    const prev = templates;
    setTemplates((list) => list.filter((x) => x.id !== p.id));
    const { error } = await supabase
      .from("package_templates")
      .delete()
      .eq("id", p.id)
      .eq("doctor_id", doctor?.id ?? "");
    if (error) {
      setTemplates(prev);
      showToast({ message: t("common_error") });
    }
  };

  const isEditing = editingId !== null;
  const canSave = useMemo(
    () =>
      draft.name.trim().length > 0 &&
      draft.total_sessions > 0 &&
      draft.session_interval_days > 0 &&
      draft.validity_months > 0,
    [draft]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <Link
            href="/dashboard/packages"
            className="text-sm hover:underline inline-block mb-2"
            style={{ color: "#b8936a" }}
          >
            {t("packages_back_to_packages")}
          </Link>
          <h1
            className="text-2xl sm:text-3xl md:text-4xl font-semibold text-text-primary"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {t("packages_templates_title")}
          </h1>
          <p className="text-text-secondary mt-1 text-sm sm:text-base">
            {t("packages_templates_subtitle")}
          </p>
        </div>
        <Button
          onClick={startNew}
          disabled={isEditing}
          className="min-h-[44px] inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("packages_template_add")}
        </Button>
      </div>

      <AnimatePresence>
        {editingId === "new" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <TemplateEditor
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
      ) : templates.length === 0 && editingId !== "new" ? (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center justify-center py-10 text-text-muted">
              <PackageIcon size={36} className="mb-3 opacity-30" />
              <p className="text-sm">{t("packages_template_empty")}</p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {templates.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                layout
              >
                {editingId === p.id ? (
                  <TemplateEditor
                    t={t}
                    draft={draft}
                    setDraft={setDraft}
                    onSave={save}
                    onCancel={cancelEdit}
                    saving={saving}
                    canSave={canSave}
                  />
                ) : (
                  <TemplateRow
                    t={t}
                    template={p}
                    onEdit={() => startEdit(p)}
                    onToggle={() => toggleActive(p)}
                    onDelete={() => deleteTemplate(p)}
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

function TemplateRow({
  t,
  template,
  onEdit,
  onToggle,
  onDelete,
  disabled,
}: {
  t: ReturnType<typeof useLanguage>["t"];
  template: PackageTemplate;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3
                className="text-lg font-semibold text-text-primary"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {template.name}
              </h3>
              {!template.is_active && (
                <Badge variant="warning">{t("packages_template_inactive")}</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
              <span>
                {t("packages_template_sessions")}:{" "}
                <strong>{template.total_sessions}</strong>
              </span>
              <span>
                ₹<strong>{Number(template.suggested_price).toLocaleString("en-IN")}</strong>
              </span>
              <span>
                {t("packages_template_interval")}:{" "}
                <strong>{template.session_interval_days}</strong>
              </span>
              <span>
                {t("packages_template_validity")}:{" "}
                <strong>{template.validity_months}</strong>
              </span>
            </div>
            {template.equipment_needed && (
              <p className="mt-2 text-sm text-text-muted">
                {template.equipment_needed}
              </p>
            )}
            {template.notes && (
              <p className="mt-1 text-sm text-text-muted italic">
                {template.notes}
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
              {t("packages_edit")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              disabled={disabled}
              className="min-h-[44px] inline-flex items-center gap-1"
            >
              <Power className="w-4 h-4" />
              {template.is_active
                ? t("packages_template_deactivate")
                : t("packages_template_reactivate")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={disabled}
              className="min-h-[44px] inline-flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function TemplateEditor({
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
  draft: DraftTemplate;
  setDraft: (d: DraftTemplate) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  canSave: boolean;
  isNew?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <h3
          className="text-lg font-semibold text-text-primary"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {isNew ? t("packages_template_new") : t("packages_template_edit")}
        </h3>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t("packages_template_name")}
            required
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="e.g. Laser Hair Removal — 6 Sessions"
          />
          <Input
            label={t("packages_template_price")}
            type="number"
            min={0}
            value={draft.suggested_price}
            onChange={(e) =>
              setDraft({ ...draft, suggested_price: Math.max(0, Number(e.target.value) || 0) })
            }
          />
          <Input
            label={t("packages_template_sessions")}
            type="number"
            min={1}
            required
            value={draft.total_sessions}
            onChange={(e) =>
              setDraft({ ...draft, total_sessions: Math.max(1, Number(e.target.value) || 0) })
            }
          />
          <Input
            label={t("packages_template_interval")}
            type="number"
            min={1}
            required
            value={draft.session_interval_days}
            onChange={(e) =>
              setDraft({ ...draft, session_interval_days: Math.max(1, Number(e.target.value) || 0) })
            }
          />
          <Input
            label={t("packages_template_validity")}
            type="number"
            min={1}
            required
            value={draft.validity_months}
            onChange={(e) =>
              setDraft({ ...draft, validity_months: Math.max(1, Number(e.target.value) || 0) })
            }
          />
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none min-h-[44px]">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                className="w-5 h-5 rounded border-primary-200 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-text-primary">
                {t("packages_template_active")}
              </span>
            </label>
          </div>
        </div>

        <div className="mt-4">
          <Textarea
            label={t("packages_template_equipment")}
            value={draft.equipment_needed ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, equipment_needed: e.target.value || null })
            }
            rows={2}
            placeholder="e.g. Diode laser machine, cooling gel"
          />
        </div>

        <div className="mt-4">
          <Textarea
            label={t("packages_template_notes")}
            value={draft.notes ?? ""}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value || null })}
            rows={2}
          />
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={saving}
            className="min-h-[44px] inline-flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            {t("packages_cancel")}
          </Button>
          <Button
            onClick={onSave}
            disabled={!canSave || saving}
            loading={saving}
            className="min-h-[44px] inline-flex items-center gap-1"
          >
            <Check className="w-4 h-4" />
            {saving ? t("packages_saving") : t("packages_save")}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
