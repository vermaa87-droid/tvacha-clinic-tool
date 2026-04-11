"use client";

/**
 * Renders a small inline error message below a form field.
 * Returns null when there's no error, so it's safe to inline.
 *
 *   <input className={errors.email ? "field-error-input" : ""} ... />
 *   <FieldError message={errors.email} />
 */
export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <span className="field-error-message" role="alert" aria-live="polite">
      {message}
    </span>
  );
}

/**
 * Summary error shown near the submit button.
 * Picks the first errored field and either echoes its message
 * (when only one is wrong) or builds a count summary.
 *
 *   <FormErrorSummary
 *     errors={errors}
 *     fieldLabels={{ email: "Email", phone: "Phone Number" }}
 *   />
 *   <button type="submit">Sign Up</button>
 */
export function FormErrorSummary({
  errors,
  fieldLabels,
}: {
  errors: Record<string, string>;
  fieldLabels?: Record<string, string>;
}) {
  const fields = Object.keys(errors);
  if (fields.length === 0) return null;

  const firstField = fields[0];
  const firstMessage = errors[firstField];
  const firstLabel = fieldLabels?.[firstField] || firstField;

  let text: string;
  if (fields.length === 1) {
    text = firstMessage;
  } else {
    const otherCount = fields.length - 1;
    text = `Please fill in ${firstLabel} and ${otherCount} other required field${
      otherCount > 1 ? "s" : ""
    }`;
  }

  return (
    <p className="form-error-summary" role="alert" aria-live="polite">
      {text}
    </p>
  );
}
