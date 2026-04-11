"use client";

import { useCallback, useRef, useState } from "react";

/**
 * A reusable form-validation feedback hook.
 *
 * Wires up:
 *  - Per-field error messages (errors[fieldName])
 *  - Field refs (so we can scroll to the first invalid field)
 *  - Scroll-to-error + blink animation on validateAll() failure
 *  - Real-time clearing as the user fixes a field
 *
 * It does NOT replace your existing form state — it sits alongside it.
 * You still own state, submission, and the validation rules. This hook
 * just turns rule failures into the visual feedback the user sees.
 */
export interface ValidationRule {
  field: string;
  message: string;
  /** True = pass, false = fail. Only the FIRST failing rule per field wins. */
  valid: boolean;
}

export function useFormValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const setFieldRef = useCallback(
    (name: string) =>
      (el: HTMLElement | null): void => {
        fieldRefs.current[name] = el;
      },
    []
  );

  const validateAll = useCallback((rules: ValidationRule[]): boolean => {
    const newErrors: Record<string, string> = {};
    let firstField: string | null = null;

    for (const r of rules) {
      // Only register the FIRST failing rule per field — keeps the message
      // human ("Email is required" vs. an avalanche of all rules at once).
      if (!r.valid && !newErrors[r.field]) {
        newErrors[r.field] = r.message;
        if (!firstField) firstField = r.field;
      }
    }

    setErrors(newErrors);

    if (firstField) {
      // Defer one frame so the DOM has settled (error message rendered, etc.)
      requestAnimationFrame(() => {
        const target = firstField ? fieldRefs.current[firstField] : null;
        if (!target) return;
        try {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch {
          // Older browsers — ignore.
        }
        // Trigger blink animation. Re-trigger by removing + re-adding.
        target.classList.remove("field-blink");
        // Force reflow so the re-add restarts the animation.
        void (target as HTMLElement).offsetWidth;
        target.classList.add("field-blink");
        window.setTimeout(() => {
          target.classList.remove("field-blink");
        }, 1700);
      });
    }

    return Object.keys(newErrors).length === 0;
  }, []);

  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const setError = useCallback((field: string, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    errors,
    setFieldRef,
    validateAll,
    clearError,
    setError,
    clearAllErrors,
  };
}

/* ------------------------------------------------------------------ */
/* Common reusable validators                                          */
/* ------------------------------------------------------------------ */

export const isFilled = (v: unknown): boolean => {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return !Number.isNaN(v);
  if (Array.isArray(v)) return v.length > 0;
  return Boolean(v);
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (v: string): boolean => EMAIL_RE.test(v.trim());

export const isValidIndianPhone = (v: string): boolean => {
  const digits = v.replace(/\D/g, "");
  return digits.length === 10;
};
