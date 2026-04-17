"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  ChevronDown,
  ChevronUp,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  TrendingDown,
  X,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import {
  allocatePoNumber,
  downloadPurchaseOrderPDF,
  fetchExpiryAlerts,
  fetchLowStockAlerts,
  fiscalYearForDate,
} from "@/lib/inventory";
import { fetchLetterheadFromDoctor } from "@/lib/export";
import type {
  CurrentStockRow,
  DrugReference,
  InventoryCategory,
  InventoryItem,
  InventorySupplier,
} from "@/lib/types";
import type { TranslationKey } from "@/lib/translations";

// ─── helpers ────────────────────────────────────────────────────────────────

const CATEGORIES: InventoryCategory[] = [
  "medicine",
  "consumable",
  "equipment",
  "cosmetic",
  "injectable",
  "other",
];

function daysFromNow(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = parseISO(iso);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

function fmtDate(iso: string): string {
  return format(parseISO(iso), "dd MMM yy");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Add Item Modal ──────────────────────────────────────────────────────────

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string;
  clinicId: string;
  onSaved: () => void;
}

function AddItemModal({ isOpen, onClose, doctorId, clinicId, onSaved }: AddItemModalProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [saving, setSaving] = useState(false);
  const [drugQuery, setDrugQuery] = useState("");
  const [drugResults, setDrugResults] = useState<DrugReference[]>([]);
  const [suppliers, setSuppliers] = useState<InventorySupplier[]>([]);
  const [form, setForm] = useState({
    name: "",
    generic_name: "",
    category: "medicine" as InventoryCategory,
    form_type: "",
    strength: "",
    unit: "strip",
    hsn_sac: "",
    gst_rate: "",
    mrp: "",
    selling_price: "",
    reorder_level: "5",
    reorder_quantity: "20",
    is_schedule_h: false,
    notes: "",
    preferred_supplier_id: "",
  });

  // Fetch suppliers once on open
  useEffect(() => {
    if (!isOpen || !doctorId) return;
    supabase
      .from("inventory_suppliers")
      .select("id, name")
      .eq("doctor_id", doctorId)
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => setSuppliers((data ?? []) as InventorySupplier[]));
  }, [isOpen, doctorId]);

  // Drug reference search
  useEffect(() => {
    if (drugQuery.trim().length < 2) { setDrugResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("drug_reference")
        .select("*")
        .or(`doctor_id.is.null,doctor_id.eq.${doctorId}`)
        .ilike("name", `%${drugQuery}%`)
        .limit(8);
      setDrugResults((data ?? []) as DrugReference[]);
    }, 300);
    return () => clearTimeout(timer);
  }, [drugQuery, doctorId]);

  function applyDrug(d: DrugReference) {
    setForm((prev) => ({
      ...prev,
      name: d.name,
      generic_name: d.generic_name ?? "",
      category: (d.category ?? "medicine") as InventoryCategory,
      form_type: d.form ?? "",
      is_schedule_h: d.is_schedule_h,
    }));
    setDrugQuery(d.name);
    setDrugResults([]);
  }

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      showToast({ message: "Item name is required." });
      return;
    }
    setSaving(true);
    const payload = {
      doctor_id: doctorId,
      clinic_id: clinicId,
      name: form.name.trim(),
      generic_name: form.generic_name.trim() || null,
      category: form.category,
      form: form.form_type.trim() || null,
      strength: form.strength.trim() || null,
      unit: form.unit.trim() || "unit",
      hsn_sac: form.hsn_sac.trim() || null,
      gst_rate: form.gst_rate ? Number(form.gst_rate) : null,
      mrp: form.mrp ? Number(form.mrp) : null,
      selling_price: form.selling_price ? Number(form.selling_price) : null,
      reorder_level: Number(form.reorder_level) || 5,
      reorder_quantity: Number(form.reorder_quantity) || 20,
      is_schedule_h: form.is_schedule_h,
      notes: form.notes.trim() || null,
      is_active: true,
    };
    const { error } = await supabase.from("inventory_items").insert(payload);
    setSaving(false);
    if (error) {
      showToast({ message: t("inv_toast_error") });
      return;
    }
    showToast({ message: t("inv_toast_saved") });
    onSaved();
    onClose();
  }

  const inputCls =
    "w-full rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary-400";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("inv_drawer_add_title")} size="lg">
      <div className="space-y-4">
        {/* Drug reference search */}
        <div className="relative">
          <label className="block text-xs font-medium text-text-secondary mb-1">{t("inv_field_name")} *</label>
          <input
            className={inputCls}
            placeholder={t("inv_field_name_placeholder")}
            value={drugQuery}
            onChange={(e) => {
              setDrugQuery(e.target.value);
              set("name", e.target.value);
            }}
          />
          {drugResults.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-primary-50 border border-primary-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {drugResults.map((d) => (
                <button
                  key={d.id}
                  onClick={() => applyDrug(d)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-primary-100 flex items-center gap-2"
                >
                  <span className="font-medium text-text-primary">{d.name}</span>
                  {d.generic_name && <span className="text-text-secondary text-xs">{d.generic_name}</span>}
                  {d.is_schedule_h && <span className="text-xs text-red-500 font-medium">H</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("inv_field_generic")}</label>
            <input className={inputCls} value={form.generic_name} onChange={(e) => set("generic_name", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("inv_field_category")}</label>
            <select className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{capitalize(c)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("inv_field_form")}</label>
            <input className={inputCls} placeholder="Tablet, Cream, Injection…" value={form.form_type} onChange={(e) => set("form_type", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("inv_field_strength")}</label>
            <input className={inputCls} placeholder="500mg, 1%, 10ml…" value={form.strength} onChange={(e) => set("strength", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("inv_field_unit")}</label>
            <input className={inputCls} placeholder="strip, tube, vial, piece…" value={form.unit} onChange={(e) => set("unit", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("inv_field_hsn")}</label>
            <input className={inputCls} value={form.hsn_sac} onChange={(e) => set("hsn_sac", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("inv_field_gst")}</label>
            <input type="number" min="0" max="28" className={inputCls} value={form.gst_rate} onChange={(e) => set("gst_rate", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("inv_field_mrp")}</label>
            <input type="number" min="0" className={inputCls} value={form.mrp} onChange={(e) => set("mrp", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("inv_field_selling_price")}</label>
            <input type="number" min="0" className={inputCls} value={form.selling_price} onChange={(e) => set("selling_price", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("inv_field_reorder_level")}</label>
            <input type="number" min="0" className={inputCls} value={form.reorder_level} onChange={(e) => set("reorder_level", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("inv_field_reorder_qty")}</label>
            <input type="number" min="1" className={inputCls} value={form.reorder_quantity} onChange={(e) => set("reorder_quantity", e.target.value)} />
          </div>
          {suppliers.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">{t("inv_field_preferred_supplier")}</label>
              <select className={inputCls} value={form.preferred_supplier_id} onChange={(e) => set("preferred_supplier_id", e.target.value)}>
                <option value="">— None —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            id="schedule_h"
            type="checkbox"
            checked={form.is_schedule_h}
            onChange={(e) => set("is_schedule_h", e.target.checked)}
            className="accent-primary-500"
          />
          <label htmlFor="schedule_h" className="text-sm text-text-secondary">{t("inv_field_schedule_h")}</label>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">{t("inv_field_notes")}</label>
          <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" size="sm" onClick={onClose}>{t("inv_btn_cancel")}</Button>
        <Button size="sm" loading={saving} onClick={handleSave}>{t("inv_btn_save")}</Button>
      </div>
    </Modal>
  );
}

// ─── Stock In Modal ──────────────────────────────────────────────────────────

interface StockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string;
  clinicId: string;
  preselectedItemId?: string | null;
  onSaved: () => void;
}

function StockInModal({ isOpen, onClose, doctorId, clinicId, preselectedItemId, onSaved }: StockInModalProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<InventorySupplier[]>([]);
  const [form, setForm] = useState({
    item_id: preselectedItemId ?? "",
    batch_number: "",
    qty: "",
    cost_per_unit: "",
    mrp_per_unit: "",
    expiry_date: "",
    manufacture_date: "",
    supplier_id: "",
    invoice_number: "",
  });

  // Sync preselectedItemId
  useEffect(() => {
    if (preselectedItemId) setForm((prev) => ({ ...prev, item_id: preselectedItemId }));
  }, [preselectedItemId]);

  useEffect(() => {
    if (!isOpen || !doctorId) return;
    Promise.all([
      supabase
        .from("inventory_items")
        .select("id, name, unit, category")
        .eq("doctor_id", doctorId)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("inventory_suppliers")
        .select("id, name")
        .eq("doctor_id", doctorId)
        .eq("is_active", true)
        .order("name"),
    ]).then(([itemsRes, supRes]) => {
      setItems((itemsRes.data ?? []) as InventoryItem[]);
      setSuppliers((supRes.data ?? []) as InventorySupplier[]);
    });
  }, [isOpen, doctorId]);

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.item_id || !form.qty || !form.batch_number) {
      showToast({ message: t("inv_sin_required_msg") });
      return;
    }
    setSaving(true);
    const payload = {
      item_id: form.item_id,
      doctor_id: doctorId,
      clinic_id: clinicId,
      batch_number: form.batch_number.trim(),
      quantity_received: Number(form.qty),
      quantity_on_hand: Number(form.qty),
      cost_per_unit: form.cost_per_unit ? Number(form.cost_per_unit) : null,
      mrp_per_unit: form.mrp_per_unit ? Number(form.mrp_per_unit) : null,
      expiry_date: form.expiry_date || null,
      manufacture_date: form.manufacture_date || null,
      supplier_id: form.supplier_id || null,
      invoice_number: form.invoice_number.trim() || null,
      received_date: new Date().toISOString().slice(0, 10),
    };
    const { error: batchError } = await supabase.from("inventory_batches").insert(payload);
    if (batchError) {
      setSaving(false);
      showToast({ message: t("inv_toast_error") });
      return;
    }
    // Log stock transaction (audit entry — non-critical, batch already saved above)
    const { error: txError } = await supabase.from("stock_transactions").insert({
      item_id: form.item_id,
      doctor_id: doctorId,
      clinic_id: clinicId,
      transaction_type: "receipt",
      quantity_change: Number(form.qty),
      reference_type: form.invoice_number.trim() ? "invoice" : null,
      reason: form.invoice_number.trim()
        ? `Stock received — Invoice: ${form.invoice_number.trim()}`
        : "Stock received",
    });
    if (txError) console.warn("[inventory] stock_transactions insert failed:", txError);
    setSaving(false);
    showToast({ message: t("inv_toast_batch_added") });
    onSaved();
    onClose();
  }

  const inputCls =
    "w-full rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary-400";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("inv_drawer_stock_in_title")} size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">{t("inv_sin_select_item")} *</label>
          <select className={inputCls} value={form.item_id} onChange={(e) => set("item_id", e.target.value)}>
            <option value="">— Select item —</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("inv_sin_batch_number")} *</label>
            <input className={inputCls} value={form.batch_number} onChange={(e) => set("batch_number", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("inv_sin_qty_purchased")} *</label>
            <input type="number" min="1" className={inputCls} value={form.qty} onChange={(e) => set("qty", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("inv_sin_purchase_price")}</label>
            <input type="number" min="0" className={inputCls} value={form.cost_per_unit} onChange={(e) => set("cost_per_unit", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("inv_sin_mrp_per_unit")}</label>
            <input type="number" min="0" className={inputCls} value={form.mrp_per_unit} onChange={(e) => set("mrp_per_unit", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("inv_sin_expiry")}</label>
            <input type="date" className={inputCls} value={form.expiry_date} onChange={(e) => set("expiry_date", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("inv_sin_mfg")}</label>
            <input type="date" className={inputCls} value={form.manufacture_date} onChange={(e) => set("manufacture_date", e.target.value)} />
          </div>
          {suppliers.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">{t("inv_sin_supplier")}</label>
              <select className={inputCls} value={form.supplier_id} onChange={(e) => set("supplier_id", e.target.value)}>
                <option value="">— None —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("inv_sin_invoice")}</label>
            <input className={inputCls} value={form.invoice_number} onChange={(e) => set("invoice_number", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" size="sm" onClick={onClose}>{t("inv_btn_cancel")}</Button>
        <Button size="sm" loading={saving} onClick={handleSave}>{t("inv_sin_save")}</Button>
      </div>
    </Modal>
  );
}

// ─── Reorder Modal ───────────────────────────────────────────────────────────

interface ReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string;
  lowStockItems: CurrentStockRow[];
}

function ReorderModal({ isOpen, onClose, doctorId, lowStockItems }: ReorderModalProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) setSelected(new Set(lowStockItems.map((i) => i.item_id)));
  }, [isOpen, lowStockItems]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleGenerate() {
    if (selected.size === 0) return;
    setGenerating(true);
    try {
      const fy = fiscalYearForDate();
      const { poNumber } = await allocatePoNumber(doctorId, fy);
      const letterhead = await fetchLetterheadFromDoctor(doctorId);
      if (!letterhead || !poNumber) {
        showToast({ message: t("inv_toast_error") });
        return;
      }
      const lines = lowStockItems
        .filter((i) => selected.has(i.item_id))
        .map((i) => ({
          itemName: i.name,
          quantity: i.reorder_quantity,
          unit: i.unit ?? undefined,
          unitCost: 0,
          gstRate: null,
        }));
      await downloadPurchaseOrderPDF(`PO-${poNumber}.pdf`, {
        letterhead,
        poNumber,
        poDate: new Date().toISOString().slice(0, 10),
        fiscalYear: fy,
        items: lines,
      });
      showToast({ message: t("inv_toast_reorder_generated") });
      onClose();
    } catch {
      showToast({ message: t("inv_toast_error") });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("inv_reorder_title")} size="md">
      {lowStockItems.length === 0 ? (
        <p className="text-text-secondary text-sm py-4">{t("inv_reorder_no_items")}</p>
      ) : (
        <div className="space-y-2">
          {lowStockItems.map((item) => (
            <label
              key={item.item_id}
              className="flex items-center gap-3 p-3 rounded-lg border border-primary-200 hover:bg-primary-100 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(item.item_id)}
                onChange={() => toggle(item.item_id)}
                className="accent-primary-500"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{item.name}</p>
                <p className="text-xs text-text-secondary">
                  On hand: {item.total_on_hand} · Reorder qty: {item.reorder_quantity} {item.unit}
                </p>
              </div>
            </label>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" size="sm" onClick={onClose}>{t("inv_btn_cancel")}</Button>
        {lowStockItems.length > 0 && (
          <Button size="sm" loading={generating} onClick={handleGenerate}>
            {t("inv_reorder_download")}
          </Button>
        )}
      </div>
    </Modal>
  );
}

// ─── Expiry Alerts Panel ─────────────────────────────────────────────────────

function ExpiryAlertsPanel({
  alerts,
  loading,
}: {
  alerts: Awaited<ReturnType<typeof fetchExpiryAlerts>> | null;
  loading: boolean;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const total =
    (alerts?.expired.length ?? 0) +
    (alerts?.within30.length ?? 0) +
    (alerts?.within60.length ?? 0) +
    (alerts?.within90.length ?? 0);

  if (!loading && total === 0) return null;

  const sections = [
    { key: "expired", items: alerts?.expired ?? [], label: t("inv_expiry_expired"), color: "text-red-600" },
    { key: "30d", items: alerts?.within30 ?? [], label: t("inv_expiry_30d"), color: "text-orange-500" },
    { key: "60d", items: alerts?.within60 ?? [], label: t("inv_expiry_60d"), color: "text-yellow-600" },
    { key: "90d", items: alerts?.within90 ?? [], label: t("inv_expiry_90d"), color: "text-text-secondary" },
  ];

  return (
    <Card className="mb-4">
      <CardBody className="p-0">
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-left"
          onClick={() => setOpen((o) => !o)}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-500" />
            <span className="font-medium text-text-primary text-sm">{t("inv_expiry_title")}</span>
            {total > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                {total}
              </span>
            )}
          </div>
          {open ? <ChevronUp size={16} className="text-text-secondary" /> : <ChevronDown size={16} className="text-text-secondary" />}
        </button>

        {open && (
          <div className="border-t border-primary-200 px-4 pb-4 space-y-4 pt-3">
            {loading ? (
              <p className="text-sm text-text-secondary">{t("common_loading")}</p>
            ) : (
              sections.map((sec) =>
                sec.items.length > 0 ? (
                  <div key={sec.key}>
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${sec.color}`}>{sec.label}</p>
                    <div className="space-y-1">
                      {sec.items.map((entry) => {
                        const d = entry.daysUntilExpiry;
                        const label =
                          d < 0
                            ? t("inv_days_ago").replace("{n}", String(Math.abs(d)))
                            : t("inv_days_left").replace("{n}", String(d));
                        return (
                          <div key={entry.batch.id} className="flex items-center justify-between text-sm">
                            <span className="text-text-primary">{entry.itemName}</span>
                            <span className="text-xs text-text-secondary">
                              {t("inv_batch_label")} {entry.batch.batch_number} · {label}
                              {entry.batch.expiry_date && ` (${fmtDate(entry.batch.expiry_date)})`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null
              )
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ─── Low Stock Panel ─────────────────────────────────────────────────────────

function LowStockPanel({
  items,
  loading,
  onStockIn,
}: {
  items: CurrentStockRow[];
  loading: boolean;
  onStockIn: (itemId: string) => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  if (!loading && items.length === 0) return null;

  return (
    <Card className="mb-4">
      <CardBody className="p-0">
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-left"
          onClick={() => setOpen((o) => !o)}
        >
          <div className="flex items-center gap-2">
            <TrendingDown size={16} className="text-red-500" />
            <span className="font-medium text-text-primary text-sm">{t("inv_low_stock_title")}</span>
            {items.length > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                {items.length}
              </span>
            )}
          </div>
          {open ? <ChevronUp size={16} className="text-text-secondary" /> : <ChevronDown size={16} className="text-text-secondary" />}
        </button>

        {open && (
          <div className="border-t border-primary-200 px-4 pb-4 pt-3 space-y-2">
            {loading ? (
              <p className="text-sm text-text-secondary">{t("common_loading")}</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-text-secondary">{t("inv_low_stock_empty")}</p>
            ) : (
              items.map((item) => (
                <div key={item.item_id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-text-primary font-medium">{item.name}</span>
                    <span className="text-xs text-text-secondary ml-2">
                      {item.total_on_hand} on hand ·{" "}
                      {t("inv_low_stock_reorder_level").replace("{n}", String(item.reorder_level))}
                    </span>
                  </div>
                  <button
                    onClick={() => onStockIn(item.item_id)}
                    className="text-xs text-primary-600 hover:text-primary-800 font-medium whitespace-nowrap ml-4"
                  >
                    + {t("inv_stock_in")}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────────────

function StockStatusBadge({ row }: { row: CurrentStockRow }) {
  const { t } = useLanguage();
  if (row.total_on_hand === 0) {
    return <Badge variant="error">{t("inv_status_out_of_stock")}</Badge>;
  }
  if (row.is_low_stock) {
    return <Badge variant="warning">{t("inv_status_low_stock")}</Badge>;
  }
  return <Badge variant="success">{t("inv_status_in_stock")}</Badge>;
}

// ─── Category Tab Labels ─────────────────────────────────────────────────────

function categoryLabel(cat: InventoryCategory | "all", t: (k: TranslationKey) => string): string {
  const map: Record<string, string> = {
    all: t("inv_tab_all"),
    medicine: t("inv_tab_medicine"),
    consumable: t("inv_tab_consumable"),
    equipment: t("inv_tab_equipment"),
    cosmetic: t("inv_tab_cosmetic"),
    injectable: t("inv_tab_injectable"),
    other: t("inv_tab_other"),
  };
  return map[cat] ?? capitalize(cat);
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { doctor } = useAuthStore();
  const { t } = useLanguage();

  const [stock, setStock] = useState<CurrentStockRow[]>([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [expiryAlerts, setExpiryAlerts] = useState<Awaited<ReturnType<typeof fetchExpiryAlerts>> | null>(null);
  const [loadingExpiry, setLoadingExpiry] = useState(false);
  const [lowStock, setLowStock] = useState<CurrentStockRow[]>([]);
  const [loadingLow, setLoadingLow] = useState(false);

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<InventoryCategory | "all">("all");

  const [showAddItem, setShowAddItem] = useState(false);
  const [showStockIn, setShowStockIn] = useState(false);
  const [stockInItemId, setStockInItemId] = useState<string | null>(null);
  const [showReorder, setShowReorder] = useState(false);

  const { showToast } = useToast();
  const doctorId = doctor?.id ?? "";
  const clinicId = doctor?.id ?? ""; // clinic_id = doctor_id convention in this schema

  // ── Fetch current stock ──
  const fetchStock = useCallback(async () => {
    if (!doctorId) return;
    setLoadingStock(true);
    const { data, error } = await supabase
      .from("current_stock")
      .select("*")
      .eq("doctor_id", doctorId)
      .eq("is_active", true)
      .order("name");
    if (error) console.error("[inventory] stock fetch error:", error);
    setStock((data ?? []) as CurrentStockRow[]);
    setLoadingStock(false);
  }, [doctorId]);

  // ── Fetch expiry + low stock ──
  const fetchAlerts = useCallback(async () => {
    if (!doctorId) return;
    setLoadingExpiry(true);
    setLoadingLow(true);
    const [exp, low] = await Promise.all([
      fetchExpiryAlerts(doctorId),
      fetchLowStockAlerts(doctorId),
    ]);
    setExpiryAlerts(exp);
    setLoadingExpiry(false);
    setLowStock(low);
    setLoadingLow(false);
  }, [doctorId]);

  useEffect(() => {
    fetchStock();
    fetchAlerts();
  }, [fetchStock, fetchAlerts]);

  function refresh() {
    fetchStock();
    fetchAlerts();
  }

  // ── Filtered list ──
  const displayed = stock.filter((row) => {
    const matchCat = catFilter === "all" || row.category === catFilter;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      row.name.toLowerCase().includes(q) ||
      (row.generic_name ?? "").toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  // ── Summary stats ──
  const totalItems = stock.length;
  const lowStockCount = stock.filter((r) => r.is_low_stock).length;
  const outCount = stock.filter((r) => r.total_on_hand === 0).length;
  const expiryCount =
    (expiryAlerts?.expired.length ?? 0) + (expiryAlerts?.within30.length ?? 0);

  function openStockIn(itemId?: string) {
    setStockInItemId(itemId ?? null);
    setShowStockIn(true);
  }

  async function handleDeleteItem(itemId: string, itemName: string) {
    if (!confirm(`Delete "${itemName}" and all its stock batches? This cannot be undone.`)) return;
    const prev = stock;
    setStock((list) => list.filter((r) => r.item_id !== itemId));
    const { error } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", itemId)
      .eq("doctor_id", doctorId);
    if (error) {
      setStock(prev);
      showToast({ message: t("inv_toast_error") });
    }
  }

  // ── Near-expiry warning banner ──
  const nearExpiryRows = stock.filter((r) => r.has_near_expiry);

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t("inv_title")}</h1>
          <p className="text-text-secondary text-sm mt-0.5">{t("inv_subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={refresh}
            className="p-2 rounded-lg border border-primary-200 text-text-secondary hover:text-text-primary hover:bg-primary-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <Button variant="outline" size="sm" onClick={() => setShowReorder(true)}>
            <ShoppingCart size={16} className="mr-1" />
            {t("inv_reorder")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => openStockIn()}>
            <PackagePlus size={16} className="mr-1" />
            {t("inv_stock_in")}
          </Button>
          <Button size="sm" onClick={() => setShowAddItem(true)}>
            <Plus size={16} className="mr-1" />
            {t("inv_add_item")}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardBody className="p-3">
            <p className="text-xs text-text-secondary mb-1">Total Items</p>
            <p className="text-2xl font-bold text-text-primary">{totalItems}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-3">
            <p className="text-xs text-text-secondary mb-1">{t("inv_low_stock_title")}</p>
            <p className={`text-2xl font-bold ${lowStockCount > 0 ? "text-orange-500" : "text-text-primary"}`}>
              {lowStockCount}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-3">
            <p className="text-xs text-text-secondary mb-1">{t("inv_status_out_of_stock")}</p>
            <p className={`text-2xl font-bold ${outCount > 0 ? "text-red-500" : "text-text-primary"}`}>
              {outCount}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-3">
            <p className="text-xs text-text-secondary mb-1">{t("inv_widget_expiring_soon")}</p>
            <p className={`text-2xl font-bold ${expiryCount > 0 ? "text-orange-500" : "text-text-primary"}`}>
              {expiryCount}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Near-expiry banner */}
      {nearExpiryRows.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-sm">
          <AlertTriangle size={16} className="shrink-0" />
          {t("inv_near_expiry_warn").replace("{count}", String(nearExpiryRows.length))}
        </div>
      )}

      {/* Expiry + low-stock panels */}
      <ExpiryAlertsPanel alerts={expiryAlerts} loading={loadingExpiry} />
      <LowStockPanel
        items={lowStock}
        loading={loadingLow}
        onStockIn={openStockIn}
      />

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-primary-200 bg-primary-50 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary-400"
            placeholder={t("inv_search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {(["all", ...CATEGORIES] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              catFilter === cat
                ? "bg-primary-500 text-white"
                : "bg-primary-100 text-text-secondary hover:bg-primary-200"
            }`}
          >
            {categoryLabel(cat, t)}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardBody className="p-0 overflow-x-auto">
          {loadingStock ? (
            <div className="flex items-center justify-center py-16 text-text-secondary">
              <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mr-3" />
              {t("common_loading")}
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
              <Boxes size={40} className="mb-3 opacity-30" />
              <p className="text-sm">{search || catFilter !== "all" ? t("inv_empty_filtered") : t("inv_empty")}</p>
              {!search && catFilter === "all" && (
                <button
                  onClick={() => setShowAddItem(true)}
                  className="mt-3 text-sm text-primary-600 hover:text-primary-800 font-medium"
                >
                  + {t("inv_add_item")}
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-200 bg-primary-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    {t("inv_col_name")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide hidden sm:table-cell">
                    {t("inv_col_category")}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    {t("inv_col_on_hand")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide hidden md:table-cell">
                    {t("inv_col_earliest_expiry")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    {t("inv_col_status")}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    {t("inv_col_actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100">
                {displayed.map((row) => {
                  const expiryDays = row.nearest_expiry ? daysFromNow(row.nearest_expiry) : null;
                  const expiryColor =
                    expiryDays === null
                      ? "text-text-secondary"
                      : expiryDays < 0
                      ? "text-red-600 font-medium"
                      : expiryDays <= 30
                      ? "text-orange-500 font-medium"
                      : expiryDays <= 90
                      ? "text-yellow-600"
                      : "text-text-secondary";

                  return (
                    <tr key={row.item_id} className="hover:bg-primary-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-primary">{row.name}</p>
                        {row.generic_name && (
                          <p className="text-xs text-text-secondary mt-0.5">{row.generic_name}</p>
                        )}
                        {row.is_schedule_h && (
                          <span className="text-xs text-red-500 font-medium">Schedule H</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-text-secondary capitalize">{row.category}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${row.total_on_hand === 0 ? "text-red-500" : row.is_low_stock ? "text-orange-500" : "text-text-primary"}`}>
                          {row.total_on_hand}
                        </span>
                        <span className="text-text-secondary text-xs ml-1">{row.unit}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {row.nearest_expiry ? (
                          <span className={`text-xs ${expiryColor}`}>
                            {fmtDate(row.nearest_expiry)}
                            {expiryDays !== null && (
                              <span className="ml-1">
                                ({expiryDays < 0 ? `${Math.abs(expiryDays)}d ago` : `${expiryDays}d`})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-text-secondary text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StockStatusBadge row={row} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openStockIn(row.item_id)}
                            className="text-xs text-primary-600 hover:text-primary-800 font-medium px-2 py-1 rounded hover:bg-primary-100 transition-colors"
                          >
                            + {t("inv_stock_in")}
                          </button>
                          <button
                            onClick={() => handleDeleteItem(row.item_id, row.name)}
                            className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Modals */}
      <AddItemModal
        isOpen={showAddItem}
        onClose={() => setShowAddItem(false)}
        doctorId={doctorId}
        clinicId={clinicId}
        onSaved={refresh}
      />
      <StockInModal
        isOpen={showStockIn}
        onClose={() => { setShowStockIn(false); setStockInItemId(null); }}
        doctorId={doctorId}
        clinicId={clinicId}
        preselectedItemId={stockInItemId}
        onSaved={refresh}
      />
      <ReorderModal
        isOpen={showReorder}
        onClose={() => setShowReorder(false)}
        doctorId={doctorId}
        lowStockItems={lowStock}
      />
    </div>
  );
}
