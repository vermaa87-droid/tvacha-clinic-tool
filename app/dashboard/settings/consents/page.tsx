"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Pencil,
  Plus,
  Power,
  Check,
  X,
  FileSignature,
  Trash2,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import type { ConsentTemplate, ConsentCheckbox } from "@/lib/types";

type DraftTemplate = Omit<
  ConsentTemplate,
  "id" | "doctor_id" | "created_at" | "updated_at"
>;

function emptyDraft(): DraftTemplate {
  return {
    title: "",
    procedure_type: "",
    body_text: "",
    checkboxes: [
      { key: "understood", label: "I have read and understood the procedure." },
      { key: "risks", label: "I understand the risks and possible side effects." },
    ],
    is_active: true,
  };
}

export default function ConsentTemplatesPage() {
  const { doctor } = useAuthStore();
  const { t } = useLanguage();
  const [templates, setTemplates] = useState<ConsentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<DraftTemplate>(emptyDraft());
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!doctor?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("consent_templates")
      .select("*")
      .eq("doctor_id", doctor.id)
      .order("title", { ascending: true });
    setTemplates((data as ConsentTemplate[]) ?? []);
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

  const startEdit = (p: ConsentTemplate) => {
    setDraft({
      title: p.title,
      procedure_type: p.procedure_type,
      body_text: p.body_text,
      checkboxes: Array.isArray(p.checkboxes) ? [...p.checkboxes] : [],
      is_active: p.is_active,
    });
    setEditingId(p.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const save = async () => {
    if (!doctor?.id || !draft.title.trim() || !draft.body_text.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...draft,
        title: draft.title.trim(),
        procedure_type: draft.procedure_type.trim(),
        body_text: draft.body_text.trim(),
        checkboxes: draft.checkboxes
          .filter((c) => c.label.trim().length > 0)
          .map((c) => ({ key: c.key, label: c.label.trim() })),
      };
      if (editingId === "new") {
        const { data, error } = await supabase
          .from("consent_templates")
          .insert({ ...payload, doctor_id: doctor.id })
          .select("*")
          .single();
        if (!error && data) {
          setTemplates((prev) =>
            [...prev, data as ConsentTemplate].sort((a, b) =>
              a.title.localeCompare(b.title)
            )
          );
        }
      } else if (editingId) {
        const { data, error } = await supabase
          .from("consent_templates")
          .update(payload)
          .eq("id", editingId)
          .eq("doctor_id", doctor.id)
          .select("*")
          .single();
        if (!error && data) {
          setTemplates((prev) =>
            prev.map((p) => (p.id === editingId ? (data as ConsentTemplate) : p))
          );
        }
      }
      cancelEdit();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: ConsentTemplate) => {
    if (p.is_active && !confirm(t("consents_template_confirm_delete"))) return;
    const next = !p.is_active;
    const prev = templates;
    setTemplates((list) =>
      list.map((x) => (x.id === p.id ? { ...x, is_active: next } : x))
    );
    const { error } = await supabase
      .from("consent_templates")
      .update({ is_active: next })
      .eq("id", p.id)
      .eq("doctor_id", doctor?.id ?? "");
    if (error) setTemplates(prev);
  };

  const isEditing = editingId !== null;
  const canSave = useMemo(
    () =>
      draft.title.trim().length > 0 &&
      draft.body_text.trim().length > 0 &&
      draft.checkboxes.some((c) => c.label.trim().length > 0),
    [draft]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <Link
            href="/dashboard/settings"
            className="text-sm hover:underline inline-block mb-2"
            style={{ color: "#b8936a" }}
          >
            {t("consents_back_to_settings")}
          </Link>
          <h1
            className="text-2xl sm:text-3xl md:text-4xl font-semibold text-text-primary"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {t("consents_templates_title")}
          </h1>
          <p className="text-text-secondary mt-1 text-sm sm:text-base">
            {t("consents_templates_subtitle")}
          </p>
        </div>
        <Button
          onClick={startNew}
          disabled={isEditing}
          className="min-h-[44px] inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("consents_template_add")}
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
              <FileSignature size={36} className="mb-3 opacity-30" />
              <p className="text-sm">{t("consents_template_empty")}</p>
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
  disabled,
}: {
  t: ReturnType<typeof useLanguage>["t"];
  template: ConsentTemplate;
  onEdit: () => void;
  onToggle: () => void;
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
                {template.title}
              </h3>
              {!template.is_active && (
                <Badge variant="warning">{t("consents_template_inactive")}</Badge>
              )}
            </div>
            {template.procedure_type && (
              <p className="text-sm text-text-secondary mb-1">
                {template.procedure_type}
              </p>
            )}
            <p className="text-sm text-text-muted line-clamp-2 whitespace-pre-line">
              {template.body_text}
            </p>
            {template.checkboxes?.length > 0 && (
              <p className="text-xs text-text-muted mt-2">
                {template.checkboxes.length} {t("consents_template_checkboxes")}
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
              {t("consents_edit")}
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
                ? t("consents_template_deactivate")
                : t("consents_template_reactivate")}
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
  const updateCheckbox = (idx: number, label: string) => {
    const next = [...draft.checkboxes];
    next[idx] = { ...next[idx], label };
    setDraft({ ...draft, checkboxes: next });
  };

  const addCheckbox = () => {
    const key = `cb_${Date.now().toString(36)}`;
    setDraft({
      ...draft,
      checkboxes: [...draft.checkboxes, { key, label: "" }],
    });
  };

  const removeCheckbox = (idx: number) => {
    setDraft({
      ...draft,
      checkboxes: draft.checkboxes.filter((_, i) => i !== idx),
    });
  };

  return (
    <Card>
      <CardHeader>
        <h3
          className="text-lg font-semibold text-text-primary"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {isNew ? t("consents_template_new") : t("consents_template_edit")}
        </h3>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t("consents_template_title_label")}
            required
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="e.g. Chemical Peel Consent"
          />
          <Input
            label={t("consents_template_procedure")}
            value={draft.procedure_type}
            onChange={(e) =>
              setDraft({ ...draft, procedure_type: e.target.value })
            }
            placeholder="e.g. Chemical Peel"
          />
        </div>

        <div className="mt-4">
          <Textarea
            label={t("consents_template_body")}
            required
            value={draft.body_text}
            onChange={(e) => setDraft({ ...draft, body_text: e.target.value })}
            rows={10}
            placeholder="Describe the procedure, risks, alternatives, and aftercare in plain language."
          />
          <p className="text-xs text-text-muted mt-1">
            {t("consents_template_body_help")}
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-text-primary">
              {t("consents_template_checkboxes")}
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={addCheckbox}
              className="min-h-[44px] inline-flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              {t("consents_template_checkbox_add")}
            </Button>
          </div>
          <div className="space-y-2">
            {draft.checkboxes.map((cb: ConsentCheckbox, idx: number) => (
              <div key={cb.key} className="flex items-start gap-2">
                <div className="flex-1">
                  <Input
                    label={`${t("consents_template_checkbox_label")} ${idx + 1}`}
                    value={cb.label}
                    onChange={(e) => updateCheckbox(idx, e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeCheckbox(idx)}
                  className="mt-7 p-2 text-text-muted hover:text-red-600 transition-colors flex-shrink-0"
                  aria-label={t("consents_template_checkbox_remove")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none min-h-[44px]">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(e) =>
                setDraft({ ...draft, is_active: e.target.checked })
              }
              className="w-5 h-5 rounded border-primary-200 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-text-primary">
              {t("consents_template_active")}
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
            {t("consents_cancel")}
          </Button>
          <Button
            onClick={onSave}
            disabled={!canSave || saving}
            loading={saving}
            className="min-h-[44px] inline-flex items-center gap-1"
          >
            <Check className="w-4 h-4" />
            {saving ? t("consents_saving") : t("consents_save")}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
