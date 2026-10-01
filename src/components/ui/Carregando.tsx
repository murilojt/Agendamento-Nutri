export function Carregando({ texto = "Carregando..." }: { texto?: string }) {
  return <p style={{ color: "var(--color-text-muted)" }}>{texto}</p>;
}
