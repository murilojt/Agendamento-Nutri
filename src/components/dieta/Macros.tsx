import type { Macros } from "@/lib/nutricao";

export const g1 = (n: number) => `${(Math.round(n * 10) / 10).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}g`;
export const kcal0 = (n: number) => `${Math.round(n).toLocaleString("pt-BR")} kcal`;

/** Chips de proteína, lipídio, carboidrato e calorias (mesmas cores em toda a tela). */
export function ChipsMacros({ m, compacto = false }: { m: Macros; compacto?: boolean }) {
  const chip = "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap";
  const estilo = { borderColor: "var(--color-border)", background: "var(--color-surface)" };
  const ponto = (cor: string) => <span className="h-2 w-2 rounded-full" style={{ background: cor }} aria-hidden="true" />;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compacto ? "text-[11px]" : ""}`}>
      <span className={chip} style={estilo} title="Proteínas">{ponto("var(--macro-prot)")}<span className="sr-only">Proteínas </span>{g1(m.protein_g)}</span>
      <span className={chip} style={estilo} title="Lipídios">{ponto("var(--macro-lip)")}<span className="sr-only">Lipídios </span>{g1(m.fat_g)}</span>
      <span className={chip} style={estilo} title="Carboidratos">{ponto("var(--macro-carb)")}<span className="sr-only">Carboidratos </span>{g1(m.carb_g)}</span>
      <span className={chip} style={{ ...estilo, background: "var(--fundo-alt)" }}>{kcal0(m.kcal)}</span>
    </div>
  );
}
