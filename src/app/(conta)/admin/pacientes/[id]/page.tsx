"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Carregando } from "@/components/ui/Carregando";
import { ErrorText } from "@/components/ui/ErrorText";
import { useDieta } from "@/components/dieta/useDieta";
import { LinhaRefeicao } from "@/components/dieta/LinhaRefeicao";
import { AnaliseNutrientes } from "@/components/dieta/AnaliseNutrientes";
import { ChipsMacros } from "@/components/dieta/Macros";
import { MensagensEConsultas } from "@/components/dieta/MensagensEConsultas";
import { ExportarPdfModal } from "@/components/dieta/ExportarPdfModal";
import { baixarPdfDieta } from "@/components/dieta/gerarPdf";
import { supabase } from "@/lib/supabase";
import type { OpcoesPdf } from "@/lib/pdfDieta.ts";
import { AnamneseModal, DadosPacienteModal, FavoritasModal, ListaComprasModal, ProtocoloModal, TextoModal } from "@/components/dieta/Formularios";
import { IcoMais } from "@/components/dieta/Icones";

type Janela = "pdf" | "protocolo" | "dados" | "anamnese" | "favoritas" | "suplementos" | "receitas" | "compras" | null;

const idade = (nasc: string | null) => {
  if (!nasc) return null;
  const n = new Date(`${nasc}T12:00:00`);
  const h = new Date();
  let a = h.getFullYear() - n.getFullYear();
  if (h < new Date(h.getFullYear(), n.getMonth(), n.getDate())) a--;
  return a;
};

const botaoSecundario = "rounded-2xl border px-4 py-3 text-sm font-semibold";

export default function PacientePage() {
  const { id } = useParams<{ id: string }>();
  const d = useDieta(id);
  const [janela, setJanela] = useState<Janela>(null);
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const [arrastando, setArrastando] = useState<string | null>(null);
  const fechar = () => setJanela(null);

  if (d.carregando) return <Carregando />;
  if (d.erroGeral || !d.paciente) return <ErrorText>{d.erroGeral ?? "Paciente não encontrado."}</ErrorText>;

  const { paciente, dieta } = d;
  const anos = idade(paciente.birth_date);
  const alternar = (rid: string) => setExpandidas((s) => { const n = new Set(s); if (n.has(rid)) n.delete(rid); else n.add(rid); return n; });
  const todasAbertas = d.refeicoes.length > 0 && d.refeicoes.every((r) => expandidas.has(r.id));
  const borda = { borderColor: "var(--color-border)", background: "var(--color-surface)" };

  async function gerarPdf(opcoes: OpcoesPdf): Promise<string> {
    if (!dieta || !paciente) throw new Error("sem dieta");
    // nome de quem elabora a dieta (a nutricionista logada)
    let nutricionista: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) nutricionista = (await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()).data?.full_name ?? null;
    } catch {
      // sem o nome, o PDF sai sem a linha "Elaborado por"
    }
    return baixarPdfDieta({
      clinica: process.env.NEXT_PUBLIC_NOME_CLINICA ?? "Ayllus Nutrição",
      nutricionista,
      paciente,
      dieta,
      refeicoes: d.refeicoes,
      itens: d.itens,
      opcoes,
    });
  }

  async function soltar(sobreId: string) {
    if (!arrastando || arrastando === sobreId) return;
    const ids = d.refeicoes.map((r) => r.id).filter((x) => x !== arrastando);
    ids.splice(ids.indexOf(sobreId), 0, arrastando);
    setArrastando(null);
    await d.reordenar(ids);
  }

  async function novaRefeicao() {
    const novoId = await d.novaRefeicao();
    if (novoId) setExpandidas((s) => new Set(s).add(novoId));
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {d.aviso && (
        <div role="status" className="flex items-center justify-between gap-4 rounded-2xl px-4 py-3 text-sm font-medium" style={{ background: "var(--gema)", color: "var(--sobre-gema)" }}>
          <span>{d.aviso}</span>
          <button type="button" onClick={d.limparAviso} className="font-semibold underline">OK</button>
        </div>
      )}

      {/* Cabeçalho do paciente */}
      <Card className="p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl">{paciente.full_name || "(sem nome)"}</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
              {[paciente.phone, paciente.birth_date && `${new Date(`${paciente.birth_date}T12:00:00`).toLocaleDateString("pt-BR")}${anos != null ? ` (${anos} anos)` : ""}`, paciente.weight_kg && `${paciente.weight_kg.toLocaleString("pt-BR")} kg`, paciente.height_cm && `${paciente.height_cm.toLocaleString("pt-BR")} cm`, paciente.email].filter(Boolean).join(" · ") || "Sem dados de contato"}
              {" "}
              <button type="button" onClick={() => setJanela("dados")} className="font-semibold underline">Editar dados</button>
            </p>
          </div>
          <Link href="/admin" className="text-sm font-semibold underline">Voltar para pacientes</Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-5">
          <button type="button" disabled={!dieta} onClick={() => setJanela("protocolo")} className={`${botaoSecundario} disabled:opacity-50`} style={borda}>Protocolo nutricional</button>
          <button type="button" onClick={() => setJanela("anamnese")} className={botaoSecundario} style={borda}>Ver anamnese</button>
          <button type="button" onClick={() => setJanela("favoritas")} className={botaoSecundario} style={borda}>Refeições favoritas</button>
          <a href="#mensagens" className={`${botaoSecundario} text-center`} style={borda}>Consultas e mensagens</a>
          <button
            type="button"
            disabled={!dieta}
            onClick={() => setJanela("pdf")}
            className={`${botaoSecundario} disabled:opacity-50`}
            style={{ background: "var(--color-primary)", color: "var(--color-on-primary)", borderColor: "var(--color-primary)" }}
            title={dieta ? "Baixar a dieta em PDF" : "Crie a dieta para exportar"}
          >
            Exportar PDF
          </button>
        </div>
      </Card>

      {!dieta ? (
        <Card className="p-10 text-center">
          <p className="mb-4" style={{ color: "var(--color-text-muted)" }}>Este paciente ainda não tem uma dieta ativa.</p>
          <Button onClick={d.criarDieta}>Criar dieta</Button>
        </Card>
      ) : (
        <>
          {/* Rotina do paciente */}
          <Card className="p-5 md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl">Rotina do paciente</h2>
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{dieta.title}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setExpandidas(todasAbertas ? new Set() : new Set(d.refeicoes.map((r) => r.id)))} className="rounded-full border px-4 py-2 text-xs font-semibold" style={borda}>
                  {todasAbertas ? "recolher tudo" : "expandir tudo"}
                </button>
                <button type="button" onClick={d.ordenarPorHorario} className="rounded-full border px-4 py-2 text-xs font-semibold" style={borda}>reordenar por horário</button>
              </div>
            </div>

            {d.refeicoes.length === 0 && <p className="mb-4 text-sm" style={{ color: "var(--color-text-muted)" }}>Nenhuma refeição ainda. Comece adicionando uma abaixo ou use uma favorita.</p>}

            <ul className="flex flex-col gap-3">
              {d.refeicoes.map((r) => (
                <LinhaRefeicao
                  key={r.id}
                  refeicao={r}
                  itens={d.itensPorRefeicao.get(r.id) ?? []}
                  alimentos={d.alimentos}
                  uso={d.uso}
                  expandida={expandidas.has(r.id)}
                  alternar={() => alternar(r.id)}
                  arrastando={arrastando === r.id}
                  aoArrastar={{ iniciar: () => setArrastando(r.id), soltarSobre: () => soltar(r.id), terminar: () => setArrastando(null) }}
                  atualizar={(patch) => d.atualizarRefeicao(r.id, patch)}
                  remover={() => d.removerRefeicao(r.id)}
                  duplicar={() => d.duplicarRefeicao(r.id)}
                  favoritar={() => d.favoritar(r.id)}
                  adicionarAlimento={(a) => d.adicionarAlimento(r.id, a)}
                  mudarQuantidade={d.mudarQuantidade}
                  removerAlimento={d.removerAlimento}
                />
              ))}
            </ul>

            <button type="button" onClick={novaRefeicao} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold" style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}>
              <IcoMais className="h-4 w-4" /> nova refeição ou hábito
            </button>

            {d.refeicoes.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
                <span className="text-sm font-semibold">Total do dia</span>
                <ChipsMacros m={d.totalDia} />
              </div>
            )}
          </Card>

          {/* Finalização */}
          <Card className="p-5 md:p-6">
            <h2 className="mb-1 text-2xl">Finalização do planejamento</h2>
            <p className="mb-4 text-sm" style={{ color: "var(--color-text-muted)" }}>Complete estes passos para o paciente ter tudo na área dele.</p>
            <div className="grid gap-2 md:grid-cols-3">
              <button type="button" onClick={() => setJanela("suplementos")} className={botaoSecundario} style={borda}>
                suplementos e produtos {dieta.supplements ? "✓" : ""}
              </button>
              <button type="button" onClick={() => setJanela("receitas")} className={botaoSecundario} style={borda}>
                anexar receitas culinárias {dieta.recipes ? "✓" : ""}
              </button>
              <button type="button" onClick={() => setJanela("compras")} className={`${botaoSecundario}`} style={{ background: "var(--color-primary)", color: "var(--color-on-primary)", borderColor: "var(--color-primary)" }}>
                elaborar lista de compras
              </button>
            </div>
          </Card>

          {/* Análise de nutrientes */}
          <Card className="p-5 md:p-6">
            <h2 className="mb-5 text-2xl">Análise de nutrientes do cardápio</h2>
            <AnaliseNutrientes total={d.totalDia} massaTotal={d.massaTotal} dieta={dieta} pesoKg={paciente.weight_kg} aoDefinirMeta={() => setJanela("protocolo")} />
          </Card>
        </>
      )}

      <MensagensEConsultas patientId={id} />

      <ExportarPdfModal aberto={janela === "pdf"} aoFechar={fechar} gerar={gerarPdf} semRefeicoes={d.refeicoes.length === 0} />
      <DadosPacienteModal aberto={janela === "dados"} aoFechar={fechar} paciente={paciente} salvar={d.salvarPaciente} />
      <AnamneseModal aberto={janela === "anamnese"} aoFechar={fechar} ler={d.lerAnamnese} salvar={d.salvarAnamnese} />
      <FavoritasModal aberto={janela === "favoritas"} aoFechar={fechar} favoritas={d.favoritas} usar={dieta ? d.usarFavorita : async () => {}} apagar={d.apagarFavorita} />
      {dieta && (
        <>
          <ProtocoloModal aberto={janela === "protocolo"} aoFechar={fechar} dieta={dieta} pesoKg={paciente.weight_kg} salvar={d.salvarDieta} />
          <TextoModal aberto={janela === "suplementos"} aoFechar={fechar} titulo="Suplementos e produtos" valor={dieta.supplements} dica="Ex.: Whey protein, 1 dose após o treino" salvar={(v) => d.salvarDieta({ supplements: v })} />
          <TextoModal aberto={janela === "receitas"} aoFechar={fechar} titulo="Receitas culinárias" valor={dieta.recipes} dica="Cole aqui receitas e modos de preparo" salvar={(v) => d.salvarDieta({ recipes: v })} />
          <ListaComprasModal aberto={janela === "compras"} aoFechar={fechar} itens={d.itens} paciente={paciente.full_name ?? ""} />
        </>
      )}
    </div>
  );
}
