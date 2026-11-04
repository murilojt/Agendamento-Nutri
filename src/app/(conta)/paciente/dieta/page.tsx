"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Carregando } from "@/components/ui/Carregando";
import { ErrorText } from "@/components/ui/ErrorText";
import { quantidadeParaMostrar } from "@/lib/medidas";
import { somar } from "@/lib/nutricao";
import { OPCOES_PADRAO } from "@/lib/pdfDieta.ts";
import { carregarConfigRodapeDe } from "@/lib/configuracoesNutri";
import { baixarPdfDieta } from "@/components/dieta/gerarPdf";
import { useDietaDoPaciente } from "@/components/paciente/useDietaDoPaciente";
import { ListaComprasPaciente } from "@/components/paciente/ListaComprasPaciente";

type Aba = "plano" | "compras" | "orientacoes";
const ABAS: { id: Aba; rotulo: string }[] = [
  { id: "plano", rotulo: "Plano alimentar" },
  { id: "compras", rotulo: "Lista de compras" },
  { id: "orientacoes", rotulo: "Receitas e orientações" },
];

const suave = { color: "var(--color-text-muted)" };
const hora = (t: string | null) => (t ? t.slice(0, 5) : null);
const g = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} g`;

export default function DietaPage() {
  const d = useDietaDoPaciente();
  const [aba, setAba] = useState<Aba>("plano");
  const [gerando, setGerando] = useState(false);
  const [erroPdf, setErroPdf] = useState<string | null>(null);

  async function exportarPdf() {
    if (!d.dieta || !d.perfil) return;
    setGerando(true);
    setErroPdf(null);
    try {
      const rodape = await carregarConfigRodapeDe(d.perfil.nutritionist_id);
      await baixarPdfDieta({
        rodape,
        clinica: process.env.NEXT_PUBLIC_NOME_CLINICA ?? "Ayllus Nutrição",
        nutricionista: rodape.display_name?.trim() || null,
        paciente: d.perfil,
        dieta: d.dieta,
        refeicoes: d.refeicoes,
        itens: d.itens,
        substitutos: d.substitutos,
        medicoes: d.medicoes,
        opcoes: OPCOES_PADRAO,
      });
    } catch (e) {
      console.error(e);
      setErroPdf("Não foi possível gerar o PDF. Atualize a página e tente de novo.");
    } finally {
      setGerando(false);
    }
  }

  if (d.carregando) return <Carregando />;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Minha dieta</h1>
          {d.dieta && <p className="mt-1 text-sm" style={suave}>{d.dieta.title}</p>}
        </div>
        {d.dieta && d.refeicoes.length > 0 && (
          <button
            type="button"
            onClick={exportarPdf}
            disabled={gerando}
            className="rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
            style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
          >
            {gerando ? "Gerando PDF…" : "Exportar PDF"}
          </button>
        )}
      </div>

      <ErrorText>{d.erro ?? erroPdf}</ErrorText>

      {!d.dieta ? (
        <Card className="p-8 text-center">
          <p style={suave}>Nenhuma dieta cadastrada ainda. Volte mais tarde.</p>
        </Card>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Seções da dieta">
            {ABAS.map((a) => (
              <button
                key={a.id}
                role="tab"
                aria-selected={aba === a.id}
                onClick={() => setAba(a.id)}
                className="rounded-full border px-4 py-2 text-sm font-semibold"
                style={aba === a.id ? { background: "var(--color-primary)", color: "var(--color-on-primary)", borderColor: "var(--color-primary)" } : { borderColor: "var(--color-border)", background: "var(--color-surface)" }}
              >
                {a.rotulo}
              </button>
            ))}
          </div>

          {aba === "plano" && (
            <div className="flex flex-col gap-3">
              {d.refeicoes.length === 0 && <Card className="p-8 text-center"><p style={suave}>A dieta ainda não tem refeições.</p></Card>}
              {d.refeicoes.map((r) => {
                const doDia = d.itens.filter((i) => i.meal_id === r.id);
                const total = somar(doDia);
                return (
                  <Card key={r.id} className="p-5">
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <span className="text-lg font-semibold">{r.meal_name}</span>
                      {r.meal_time && <span className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>{hora(r.meal_time)}</span>}
                    </div>
                    {doDia.length > 0 ? (
                      <ul className="flex flex-col gap-1.5 text-sm">
                        {doDia.map((i) => {
                          const subs = d.substitutos.filter((s) => s.item_id === i.id);
                          return (
                            <li key={i.id} className="flex justify-between gap-3">
                              <span>
                                {i.name}
                                {subs.length > 0 && (
                                  <span className="block text-xs italic" style={suave}>
                                    Pode trocar por: {subs.map((s) => `${g(s.quantity_g)} ${s.name}`).join(" · ")}
                                  </span>
                                )}
                              </span>
                              <span className="shrink-0 text-right" style={suave}>
                                {(() => {
                                  const q = quantidadeParaMostrar(i.quantity_g, i);
                                  return q.gramas ? (<>{q.principal}<span className="block text-xs">{q.gramas}</span></>) : q.principal;
                                })()}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm" style={suave}>Nenhum alimento definido para esta refeição.</p>
                    )}
                    {r.notes && <p className="mt-2 text-sm italic" style={suave}>{r.notes}</p>}
                    {doDia.length > 0 && <p className="mt-3 text-xs font-semibold" style={suave}>{Math.round(total.kcal)} kcal</p>}
                  </Card>
                );
              })}
            </div>
          )}

          {aba === "compras" && <ListaComprasPaciente dietaId={d.dieta.id} itens={d.itens} />}

          {aba === "orientacoes" && (
            <div className="flex flex-col gap-8">
              {!d.dieta.objective?.trim() && !d.dieta.supplements?.trim() && !d.dieta.recipes?.trim() && (
                <Card className="p-8 text-center"><p style={suave}>Sua nutricionista ainda não incluiu receitas ou orientações.</p></Card>
              )}
              {d.dieta.objective?.trim() && (
                <section>
                  <h2 className="mb-3 text-2xl">Objetivo e orientações</h2>
                  <Card className="whitespace-pre-line p-5 text-sm">{d.dieta.objective}</Card>
                </section>
              )}
              {d.dieta.supplements?.trim() && (
                <section>
                  <h2 className="mb-3 text-2xl">Suplementos e produtos</h2>
                  <Card className="whitespace-pre-line p-5 text-sm">{d.dieta.supplements}</Card>
                </section>
              )}
              {d.dieta.recipes?.trim() && (
                <section>
                  <h2 className="mb-3 text-2xl">Receitas</h2>
                  <Card className="whitespace-pre-line p-5 text-sm">{d.dieta.recipes}</Card>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
