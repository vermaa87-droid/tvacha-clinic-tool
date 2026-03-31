"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Download, Plus, Check } from "lucide-react";

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  onCellEdit?: (rowIndex: number, columnId: string, value: unknown) => void;
  onAddRow?: () => void;
  addRowLabel?: string;
  searchPlaceholder?: string;
  exportFilename?: string;
  pageSize?: number;
  loading?: boolean;
  emptyMessage?: string;
  emptyAction?: string;
}

// Editable cell component
function EditableCell({
  value: initialValue,
  onSave,
  type = "text",
  options,
  colorMap,
}: {
  value: unknown;
  onSave: (val: unknown) => void;
  type?: "text" | "number" | "select" | "date";
  options?: { value: string; label: string }[];
  colorMap?: Record<string, string>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => { setValue(initialValue); }, [initialValue]);
  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const save = () => {
    setEditing(false);
    if (value !== initialValue) onSave(value);
  };

  if (type === "select" && !editing) {
    const display = options?.find((o) => o.value === value)?.label || String(value || "—");
    const color = colorMap?.[String(value)] || "";
    return (
      <span
        onClick={() => setEditing(true)}
        className={cn("cursor-pointer px-2 py-0.5 rounded text-xs font-medium", color || "hover:bg-primary-100")}
      >
        {display}
      </span>
    );
  }

  if (editing) {
    if (type === "select") {
      return (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={String(value || "")}
          onChange={(e) => { setValue(e.target.value); }}
          onBlur={save}
          className="w-full px-1 py-0.5 text-xs border border-primary-300 rounded bg-surface focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">—</option>
          {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type}
        value={String(value ?? "")}
        onChange={(e) => setValue(type === "number" ? Number(e.target.value) : e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setValue(initialValue); setEditing(false); } }}
        className="w-full px-1 py-0.5 text-xs border border-primary-300 rounded bg-surface focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
    );
  }

  return (
    <span onClick={() => setEditing(true)} className="cursor-pointer hover:bg-primary-100 px-1 py-0.5 rounded block min-h-[20px] text-xs">
      {value != null && value !== "" ? String(value) : "—"}
    </span>
  );
}

// Auto-save toast
function SaveToast({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm z-50 animate-fade-in">
      <Check size={16} /> Saved
    </div>
  );
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  onCellEdit,
  onAddRow,
  addRowLabel = "Add Row",
  searchPlaceholder = "Search...",
  exportFilename = "export",
  pageSize = 50,
  loading = false,
  emptyMessage = "No records yet",
  emptyAction,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [showSaveToast, setShowSaveToast] = useState(false);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
    meta: {
      updateData: (rowIndex: number, columnId: string, value: unknown) => {
        onCellEdit?.(rowIndex, columnId, value);
        setShowSaveToast(true);
        setTimeout(() => setShowSaveToast(false), 1500);
      },
    },
  });

  const exportCSV = useCallback(() => {
    const headers = columns.map((c) => String((c as { header?: string }).header || (c as { id?: string }).id || "")).join(",");
    const rows = table.getFilteredRowModel().rows.map((row) =>
      columns.map((col) => {
        const id = (col as { accessorKey?: string }).accessorKey || (col as { id?: string }).id || "";
        const val = row.getValue(id);
        const str = String(val ?? "").replace(/"/g, '""');
        return `"${str}"`;
      }).join(",")
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFilename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [columns, table, exportFilename]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-primary-200 rounded animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SaveToast show={showSaveToast} />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-primary-200 rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text-secondary border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
          {onAddRow && (
            <button
              onClick={onAddRow}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Plus size={14} /> {addRowLabel}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border border-primary-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-primary-100 sticky top-0 z-10">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-3 py-2.5 text-left text-xs font-semibold text-text-primary whitespace-nowrap border-b border-primary-200 select-none"
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          className="flex items-center gap-1 hover:text-primary-600"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === "asc" ? <ArrowUp size={12} /> :
                            header.column.getIsSorted() === "desc" ? <ArrowDown size={12} /> :
                              <ArrowUpDown size={12} className="opacity-30" />}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-12 text-text-muted text-sm">
                    {emptyMessage}
                    {emptyAction && onAddRow && (
                      <button onClick={onAddRow} className="block mx-auto mt-2 text-primary-500 hover:text-primary-600 font-medium">
                        {emptyAction}
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, i) => (
                  <tr key={row.id} className={cn("group border-b border-primary-100 hover:bg-primary-50 transition-colors", i % 2 === 0 ? "bg-surface" : "bg-primary-50/50")}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>
          Showing {table.getRowModel().rows.length} of {data.length} records
        </span>
        {table.getPageCount() > 1 && (
          <div className="flex items-center gap-2">
            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="px-2 py-1 border border-primary-200 rounded hover:bg-primary-100 disabled:opacity-30">Prev</button>
            <span>Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span>
            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="px-2 py-1 border border-primary-200 rounded hover:bg-primary-100 disabled:opacity-30">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}

export { EditableCell };
