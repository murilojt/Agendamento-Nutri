export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;

  return (
    <p className="text-sm mb-2" style={{ color: "var(--color-danger)" }}>
      {children}
    </p>
  );
}
