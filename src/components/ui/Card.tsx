import { HTMLAttributes } from "react";

export function Card({
  className = "",
  style,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-3xl border ${className}`}
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-surface)",
        ...style,
      }}
      {...props}
    />
  );
}
