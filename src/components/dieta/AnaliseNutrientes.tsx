"use client";

import { analisar, distribuicao, type Macros } from "@/lib/nutricao";
import type { Dieta } from "./tipos";

const f = (n: number | null, casas = 1) => (n == null ? "-" : n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }));
const sinal = (n: number | null, un: string) => (n == null ? "-" : `${n > 0 ? "+" : ""}${f(n)}${un === "kcal" ? " kcal" : un === "g" ? "g" : ""}`);

export function AnaliseNutrientes({ total, massaTotal, dieta, pesoKg, aoDefinirMeta }: { total: Macros; massaTotal: number; dieta: Dieta; pesoKg: number | null; aoDefinirMeta: () => void }) {
  const linhas = analisar(total, dieta, pesoKg, massaTotal);
  const d = distribuicao(total);
  const temMeta = linhas.some((l) => l.teorico != null);

  // Donut: três arcos proporcionais à energia de cada macro
  const R = 48;
  const C = 2 * Math.PI * R;
  const partes = [
    { chave: "Proteínas", cor: "var(--macro-prot)", ...d.proteina },
    { chave: "Carboidratos", cor: "var(--macro-carb)", ...d.carboidrato },
    { chave: "Lipídios", cor: "var(--macro-lip)", ...d.lipidio },
  ];
  let acumulado = 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[26rem] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              <th className="py-2 pr-3 font-semibold">Parâmetro</th>
              <th className="py-2 pr-3 font-semibold">Prescrito</th>
              <th className="py-2 pr-3 font-semibold">Teórico</th>
              <th className="py-2 font-semibold">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={l.rotulo} className="border-t" style={{ borderColor: "var(--color-border)", background: i % 2 ? "transparent" : "var(--fundo-alt)" }}>
                <td className="px-2 py-2.5 font-medium">{l.rotulo}</td>
                <td className="py-2.5 pr-3">
                  {f(l.prescrito, l.unidade === "kcal/g" ? 2 : 1)}
                  {l.unidade === "g" ? "g" : l.unidade === "kcal" ? " kcal" : l.unidade === "kcal/g" ? " kcal/g" : ""}
                  {l.prescritoPorKg != null && <span className="block text-xs" style={{ color: "var(--color-text-muted)" }}>({f(l.prescritoPorKg, 2)} g/kg)</span>}
                </td>
                <td className="py-2.5 pr-3">
                  {l.teorico == null ? "-" : `${f(l.teorico)}${l.unidade === "g" ? "g" : l.unidade === "kcal" ? " kcal" : ""}`}
                  {l.teoricoPorKg != null && <span className="block text-xs" style={{ color: "var(--color-text-muted)" }}>({f(l.teoricoPorKg, 2)} g/kg)</span>}
                </td>
                <td className="py-2.5 pr-2 font-semibold" style={l.diferenca != null ? { color: l.diferenca < 0 ? "var(--color-danger)" : "var(--color-primary)" } : undefined}>
                  {sinal(l.diferenca, l.unidade)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!temMeta && (
          <p className="mt-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Defina as metas para comparar o prescrito com o teórico.{pesoKg ? "" : " Cadastre também o peso do paciente (g/kg depende dele)."}
          </p>
        )}
        <button type="button" onClick={aoDefinirMeta} className="mt-4 rounded-full px-4 py-2 text-sm font-semibold" style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}>
          {temMeta ? "Editar planejamento teórico" : "+ Adicionar planejamento teórico"}
        </button>
      </div>

      <div className="flex flex-col items-center gap-5">
        <svg viewBox="0 0 120 120" className="h-52 w-52" role="img" aria-label={`Distribuição calórica: proteínas ${d.proteina.pct}%, carboidratos ${d.carboidrato.pct}%, lipídios ${d.lipidio.pct}%`}>
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--fundo-alt)" strokeWidth="22" />
          {d.totalKcal > 0 &&
            partes.map((p) => {
              const comprimento = (p.pct / 100) * C;
              const el = (
                <circle
                  key={p.chave}
                  cx="60" cy="60" r={R} fill="none" stroke={p.cor} strokeWidth="22"
                  strokeDasharray={`${comprimento} ${C - comprimento}`}
                  strokeDashoffset={-acumulado}
                  transform="rotate(-90 60 60)"
                />
              );
              acumulado += comprimento;
              return el;
            })}
        </svg>
        <div className="grid w-full grid-cols-2 gap-2 text-sm">
          {partes.map((p) => (
            <div key={p.chave} className="rounded-2xl border px-3 py-2" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
              <p className="flex items-center gap-2 font-semibold">
                <span className="h-3 w-3 rounded-full" style={{ background: p.cor }} aria-hidden="true" />
                {p.chave}
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{f(p.kcal, 1)} kcal - {f(p.pct, 1)}%</p>
            </div>
          ))}
          <div className="rounded-2xl px-3 py-2" style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}>
            <p className="font-semibold">Total de kcal</p>
            <p className="text-xs">{f(total.kcal, 0)} kcal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
