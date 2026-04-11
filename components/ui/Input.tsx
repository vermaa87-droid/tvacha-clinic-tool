"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helpText, className, required, ...props },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-2">
          {label}
          {required && <span style={{ color: "var(--form-error)" }}> *</span>}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          "w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors",
          error && "field-error-input",
          className
        )}
        {...props}
      />
      {error && <span className="field-error-message">{error}</span>}
      {helpText && !error && (
        <p className="text-text-muted text-sm mt-1">{helpText}</p>
      )}
    </div>
  );
});

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helpText?: string;
  required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { label, error, helpText, className, required, ...props },
    ref
  ) {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-2">
            {label}
            {required && <span style={{ color: "var(--form-error)" }}> *</span>}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            "w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors",
            error && "field-error-input",
            className
          )}
          {...props}
        />
        {error && <span className="field-error-message">{error}</span>}
        {helpText && !error && (
          <p className="text-text-muted text-sm mt-1">{helpText}</p>
        )}
      </div>
    );
  }
);
