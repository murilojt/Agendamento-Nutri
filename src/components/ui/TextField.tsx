"use client";

import { InputHTMLAttributes, useId } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  containerClassName?: string;
};

export function TextField({
  label,
  hint,
  id,
  className = "",
  containerClassName = "mb-4",
  ...props
}: Props) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div className={containerClassName}>
      <label htmlFor={fieldId} className="block text-sm font-medium mb-1">
        {label}
      </label>
      <input
        id={fieldId}
        className={`w-full rounded-2xl border px-4 py-3 ${className}`}
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        {...props}
      />
      {hint && (
        <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
