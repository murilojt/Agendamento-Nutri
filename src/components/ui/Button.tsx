import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "text-danger" | "outline";
};

export function Button({ variant = "primary", className = "", style, ...props }: Props) {
  if (variant === "text-danger") {
    return <button className={`text-xs font-medium ${className}`} style={{ color: "var(--color-danger)", ...style }} {...props} />;
  }

  if (variant === "outline") {
    return (
      <button
        className={`rounded-full border-2 px-5 py-2.5 font-semibold disabled:opacity-60 ${className}`}
        style={{ borderColor: "var(--color-text)", color: "var(--color-text)", ...style }}
        {...props}
      />
    );
  }

  return (
    <button
      className={`rounded-full px-5 py-2.5 font-semibold disabled:opacity-60 ${className}`}
      style={{ background: "var(--color-primary)", color: "var(--color-on-primary)", ...style }}
      {...props}
    />
  );
}
