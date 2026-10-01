"use client";

import { TextareaHTMLAttributes, useId } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  containerClassName?: string;
};

export function TextAreaField({
  label,
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
      <textarea
        id={fieldId}
        className={`w-full rounded-2xl border px-4 py-3 ${className}`}
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        {...props}
      />
    </div>
  );
}
