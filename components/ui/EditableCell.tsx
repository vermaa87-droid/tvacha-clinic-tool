"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Inline editable cell used by DataTable columns. Kept in its own file so
 * the Clinic Register can import it statically while dynamic-loading the
 * heavier DataTable (which pulls @tanstack/react-table).
 */
export function EditableCell({
  value: initialValue,
  onSave,
  type = "text",
  options,
  colorMap,
  displayFormatter,
  displayClassName,
}: {
  value: unknown;
  onSave: (val: unknown) => void;
  type?: "text" | "number" | "select" | "date";
  options?: { value: string; label: string }[];
  colorMap?: Record<string, string>;
  displayFormatter?: (val: unknown) => string;
  displayClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);
  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const save = () => {
    setEditing(false);
    if (value !== initialValue) onSave(value);
  };

  if (type === "select" && !editing) {
    const display =
      options?.find((o) => o.value === value)?.label || String(value || "—");
    const color = colorMap?.[String(value)] || "";
    return (
      <span
        onClick={() => setEditing(true)}
        className={cn(
          "cursor-pointer inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium",
          color || "text-text-secondary hover:bg-primary-200"
        )}
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
          onChange={(e) => {
            setValue(e.target.value);
          }}
          onBlur={save}
          className="w-full px-1 py-0.5 text-xs border border-primary-300 rounded bg-surface focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">—</option>
          {options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type}
        value={String(value ?? "")}
        onChange={(e) =>
          setValue(
            type === "number" ? Number(e.target.value) : e.target.value
          )
        }
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setValue(initialValue);
            setEditing(false);
          }
        }}
        className="w-full px-1 py-0.5 text-xs border border-primary-300 rounded bg-surface focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={cn(
        "cursor-pointer hover:bg-primary-200 px-1 py-0.5 rounded block min-h-[20px] text-xs",
        displayClassName
      )}
    >
      {displayFormatter
        ? displayFormatter(value)
        : value != null && value !== ""
        ? String(value)
        : "—"}
    </span>
  );
}
