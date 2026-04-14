"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText, FileSpreadsheet, Printer, Calendar, ChevronDown, X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import {
  applyDateRange,
  DateRangePresets,
  downloadCSV,
  downloadPDFReport,
  printCurrentView,
  type ClinicLetterhead,
  type DateRange,
  type ExportColumn,
} from "@/lib/export";

type PresetKey = "today" | "thisWeek" | "thisMonth" | "last3Months" | "allTime" | "custom";

interface Props<T> {
  title: string;
  filename: string;
  letterhead: ClinicLetterhead | null;
  columns: ExportColumn<T>[];
  rows: T[];
  dateField?: keyof T & string;
  subtitle?: string;
}

function getPresetRange(key: PresetKey): DateRange | null {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  switch (key) {
    case "today":
      return DateRangePresets.today();
    case "thisWeek": {
      const day = today.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const start = new Date(today);
      start.setDate(today.getDate() - diff);
      return { from: iso(start), to: iso(today) };
    }
    case "thisMonth":
      return DateRangePresets.thisMonth();
    case "last3Months": {
      const start = new Date(today);
      start.setMonth(today.getMonth() - 3);
      return { from: iso(start), to: iso(today) };
    }
    case "allTime":
      return null;
    default:
      return null;
  }
}

export function ExportMenu<T>({
  title,
  filename,
  letterhead,
  columns,
  rows,
  dateField,
  subtitle,
}: Props<T>) {
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [preset, setPreset] = useState<PresetKey>("allTime");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
        setDateOpen(false);
      }
    };
    if (menuOpen || dateOpen) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [menuOpen, dateOpen]);

  const activeRange: DateRange | null = useMemo(() => {
    if (preset === "custom") {
      if (customFrom && customTo) return { from: customFrom, to: customTo };
      return null;
    }
    return getPresetRange(preset);
  }, [preset, customFrom, customTo]);

  const filteredRows = useMemo(() => {
    if (!activeRange || !dateField) return rows;
    return applyDateRange(rows as (T & { [k: string]: unknown })[], activeRange, dateField);
  }, [rows, activeRange, dateField]);

  const presetLabel = (() => {
    switch (preset) {
      case "today":
        return t("export_preset_today");
      case "thisWeek":
        return t("export_preset_this_week");
      case "thisMonth":
        return t("export_preset_this_month");
      case "last3Months":
        return t("export_preset_last_3m");
      case "custom":
        return activeRange
          ? `${activeRange.from} → ${activeRange.to}`
          : t("export_preset_custom");
      case "allTime":
      default:
        return t("export_preset_all_time");
    }
  })();

  const handleCSV = () => {
    setMenuOpen(false);
    downloadCSV(filename, filteredRows, columns);
  };

  const handlePDF = async () => {
    setMenuOpen(false);
    if (!letterhead) return;
    setBusy(true);
    try {
      await downloadPDFReport(filename, {
        title,
        subtitle,
        letterhead,
        columns,
        rows: filteredRows,
        dateRange: activeRange,
      });
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => {
    setMenuOpen(false);
    printCurrentView();
  };

  return (
    <div className="flex items-center gap-2">
      {/* Date range popover trigger */}
      {dateField && (
        <div className="relative" ref={dateRef}>
          <button
            type="button"
            onClick={() => setDateOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-lg text-sm font-medium border transition-colors"
            style={{
              borderColor: "rgba(184,147,106,0.4)",
              color: "var(--color-text-primary)",
              backgroundColor: "var(--color-card)",
            }}
          >
            <Calendar className="w-4 h-4" style={{ color: "#b8936a" }} />
            <span className="hidden sm:inline">{presetLabel}</span>
            <ChevronDown className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
          </button>

          {dateOpen && (
            <div
              className="absolute right-0 mt-2 w-72 rounded-xl shadow-lg z-40 p-3"
              style={{
                backgroundColor: "var(--color-card)",
                border: "1px solid var(--color-separator)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <p
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "#b8936a", letterSpacing: "0.1em" }}
                >
                  {t("export_date_range")}
                </p>
                <button
                  onClick={() => setDateOpen(false)}
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                {([
                  ["today", t("export_preset_today")],
                  ["thisWeek", t("export_preset_this_week")],
                  ["thisMonth", t("export_preset_this_month")],
                  ["last3Months", t("export_preset_last_3m")],
                  ["allTime", t("export_preset_all_time")],
                ] as [PresetKey, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setPreset(key);
                      setDateOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
                    style={
                      preset === key
                        ? { backgroundColor: "rgba(184,147,106,0.12)", color: "#7a5c35" }
                        : { color: "var(--color-text-primary)" }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div
                className="mt-3 pt-3"
                style={{ borderTop: "1px solid var(--color-separator)" }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: "#b8936a", letterSpacing: "0.1em" }}
                >
                  {t("export_preset_custom")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="px-2 py-1.5 rounded-md border text-sm"
                    style={{
                      borderColor: "rgba(184,147,106,0.4)",
                      backgroundColor: "var(--color-card)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="px-2 py-1.5 rounded-md border text-sm"
                    style={{
                      borderColor: "rgba(184,147,106,0.4)",
                      backgroundColor: "var(--color-card)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                </div>
                <button
                  type="button"
                  disabled={!customFrom || !customTo}
                  onClick={() => {
                    setPreset("custom");
                    setDateOpen(false);
                  }}
                  className="mt-2 w-full min-h-[36px] rounded-md text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: "#b8936a" }}
                >
                  {t("export_apply")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Export dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-lg text-sm font-medium transition-colors text-white disabled:opacity-50"
          style={{ backgroundColor: "#b8936a" }}
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">{t("export_label")}</span>
          <ChevronDown className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 mt-2 w-56 rounded-xl shadow-lg z-40 overflow-hidden"
            style={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-separator)",
            }}
          >
            <MenuItem icon={<FileSpreadsheet className="w-4 h-4" />} label={t("export_csv")} onClick={handleCSV} />
            <MenuItem
              icon={<FileText className="w-4 h-4" />}
              label={t("export_pdf")}
              onClick={handlePDF}
              disabled={!letterhead}
            />
            <MenuItem icon={<Printer className="w-4 h-4" />} label={t("export_print")} onClick={handlePrint} />
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left px-3 py-2.5 min-h-[44px] inline-flex items-center gap-2 text-sm transition-colors disabled:opacity-50 hover:bg-primary-50"
      style={{ color: "var(--color-text-primary)" }}
    >
      <span style={{ color: "#b8936a" }}>{icon}</span>
      {label}
    </button>
  );
}
