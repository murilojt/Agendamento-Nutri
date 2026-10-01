"use client";

import { useEffect, useState } from "react";
import { listaDeCompras, somar, metaTeorica, type ItemRefeicao } from "@/lib/nutricao";
import type { Anamnese, Dieta, Favorita, Paciente } from "./tipos";
import { Modal } from "./Modal";
import { g1, kcal0 } from "./Macros";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";

const numOuNull = (s: string) => {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
const str = (n: number | null) => (n == null ? "" : String(n));

/* ---------- Protocolo nutricional / planejamento teórico ---------- */
export function ProtocoloModal({ aberto, aoFechar, dieta, pesoKg, salvar }: { aberto: boolean; aoFechar: () => void; dieta: Dieta; pesoKg: number | null; salvar: (p: Partial<Dieta>) => Promise<boolean> }) {
  const [titulo, setTitulo] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [kcal, setKcal] = useState("");
  const [prot, setProt] = useState("");
  const [lip, setLip] = useState("");
  const [carb, setCarb] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    setTitulo(dieta.title); setObjetivo(dieta.objective ?? ""); setKcal(str(dieta.target_kcal));
    setProt(str(dieta.target_protein_gkg)); setLip(str(dieta.target_fat_gkg)); setCarb(str(dieta.target_carb_gkg)); setErro(null);
  }, [aberto, dieta]);

  const valores = { target_kcal: numOuNull(kcal), target_protein_gkg: numOuNull(prot), target_fat_gkg: numOuNull(lip), target_carb_gkg: numOuNull(carb) };
  const previa = metaTeorica(valores as never, pesoKg);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (Object.values(valores).some((v) => Number.isNaN(v))) return setErro("Use apenas números nas metas.");
    if (!titulo.trim()) return setErro("Dê um nome ao plano.");
    if (await salvar({ title: titulo.trim(), objective: objetivo.trim() || null, ...valores })) aoFechar();
  }

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Protocolo nutricional">
      <form onSubmit={enviar}>
        <TextField label="Nome do plano" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
        <TextAreaField label="Objetivo e orientações gerais" rows={3} value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Ex.: emagrecimento gradual, 0,5 kg por semana" />
        <p className="mb-2 text-sm font-semibold">Planejamento teórico (metas)</p>
        <div className="grid grid-cols-2 gap-x-3">
          <TextField label="Calorias (kcal)" inputMode="decimal" value={kcal} onChange={(e) => setKcal(e.target.value)} hint="Em branco: calculada pelas metas de macros." />
          <TextField label="Proteína (g/kg)" inputMode="decimal" value={prot} onChange={(e) => setProt(e.target.value)} />
          <TextField label="Lipídios (g/kg)" inputMode="decimal" value={lip} onChange={(e) => setLip(e.target.value)} />
          <TextField label="Carboidratos (g/kg)" inputMode="decimal" value={carb} onChange={(e) => setCarb(e.target.value)} />
        </div>
        <p className="mb-4 text-xs" style={{ color: "var(--color-text-muted)" }}>
          {pesoKg
            ? `Com ${pesoKg.toLocaleString("pt-BR")} kg: proteína ${previa.protein_g ?? "-"} g, lipídios ${previa.fat_g ?? "-"} g, carboidratos ${previa.carb_g ?? "-"} g, ${previa.kcal ?? "-"} kcal.`
            : "Cadastre o peso do paciente (botão Editar dados) para converter g/kg em gramas."}
        </p>
        <ErrorText>{erro}</ErrorText>
        <Button type="submit">Salvar protocolo</Button>
      </form>
    </Modal>
  );
}

/* ---------- Dados do paciente ---------- */
export function DadosPacienteModal({ aberto, aoFechar, paciente, salvar }: { aberto: boolean; aoFechar: () => void; paciente: Paciente; salvar: (p: Partial<Paciente>) => Promise<boolean> }) {
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [nasc, setNasc] = useState("");
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    setNome(paciente.full_name ?? ""); setTel(paciente.phone ?? ""); setNasc(paciente.birth_date ?? ""); setPeso(str(paciente.weight_kg)); setAltura(str(paciente.height_cm)); setErro(null);
  }, [aberto, paciente]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const p = numOuNull(peso), a = numOuNull(altura);
    if (Number.isNaN(p) || Number.isNaN(a) || (p != null && (p < 20 || p > 400)) || (a != null && (a < 50 || a > 250))) return setErro("Confira o peso (kg) e a altura (cm).");
    if (await salvar({ full_name: nome.trim() || null, phone: tel.trim() || null, birth_date: nasc || null, weight_kg: p, height_cm: a })) aoFechar();
  }

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Dados do paciente">
      <form onSubmit={enviar}>
        <TextField label="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <div className="grid grid-cols-2 gap-x-3">
          <TextField label="Celular" type="tel" value={tel} onChange={(e) => setTel(e.target.value)} />
          <TextField label="Nascimento" type="date" value={nasc} onChange={(e) => setNasc(e.target.value)} />
          <TextField label="Peso (kg)" inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} />
          <TextField label="Altura (cm)" inputMode="decimal" value={altura} onChange={(e) => setAltura(e.target.value)} />
        </div>
        <ErrorText>{erro}</ErrorText>
        <Button type="submit">Salvar</Button>
      </form>
    </Modal>
  );
}

/* ---------- Anamnese ---------- */
const CAMPOS_ANAMNESE: { chave: keyof Anamnese; rotulo: string; dica: string }[] = [
  { chave: "main_complaint", rotulo: "Queixa principal", dica: "Motivo da consulta" },
  { chave: "health_history", rotulo: "Histórico de saúde", dica: "Doenças, cirurgias, histórico familiar" },
  { chave: "medications", rotulo: "Medicamentos e suplementos em uso", dica: "" },
  { chave: "allergies", rotulo: "Alergias e intolerâncias", dica: "" },
  { chave: "habits", rotulo: "Hábitos", dica: "Sono, atividade física, rotina, consumo de água" },
  { chave: "goals", rotulo: "Objetivos", dica: "" },
];

export function AnamneseModal({ aberto, aoFechar, ler, salvar }: { aberto: boolean; aoFechar: () => void; ler: () => Promise<Anamnese>; salvar: (a: Anamnese) => Promise<boolean> }) {
  const [dados, setDados] = useState<Anamnese | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!aberto) return setDados(null);
    ler().then(setDados);
  }, [aberto, ler]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!dados) return;
    setEnviando(true);
    const ok = await salvar(dados);
    setEnviando(false);
    if (ok) aoFechar();
  }

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Anamnese" larga>
      {!dados ? (
        <p style={{ color: "var(--color-text-muted)" }}>Carregando...</p>
      ) : (
        <form onSubmit={enviar}>
          <p className="mb-4 text-sm" style={{ color: "var(--color-text-muted)" }}>Anotações clínicas privadas: o paciente não vê esta ficha.</p>
          {CAMPOS_ANAMNESE.map((c) => (
            <TextAreaField key={c.chave} label={c.rotulo} rows={3} placeholder={c.dica} value={dados[c.chave]} onChange={(e) => setDados({ ...dados, [c.chave]: e.target.value })} />
          ))}
          <Button type="submit" disabled={enviando}>{enviando ? "Salvando..." : "Salvar anamnese"}</Button>
        </form>
      )}
    </Modal>
  );
}

/* ---------- Texto livre (suplementos, receitas) ---------- */
export function TextoModal({ aberto, aoFechar, titulo, valor, dica, salvar }: { aberto: boolean; aoFechar: () => void; titulo: string; valor: string | null; dica: string; salvar: (v: string | null) => Promise<boolean> }) {
  const [texto, setTexto] = useState("");
  useEffect(() => {
    if (aberto) setTexto(valor ?? "");
  }, [aberto, valor]);
  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (await salvar(texto.trim() || null)) aoFechar();
  }
  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo={titulo} larga>
      <form onSubmit={enviar}>
        <TextAreaField label={titulo} rows={10} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={dica} />
        <p className="mb-4 text-xs" style={{ color: "var(--color-text-muted)" }}>O paciente vê este texto na área dele.</p>
        <Button type="submit">Salvar</Button>
      </form>
    </Modal>
  );
}

/* ---------- Refeições favoritas ---------- */
export function FavoritasModal({ aberto, aoFechar, favoritas, usar, apagar }: { aberto: boolean; aoFechar: () => void; favoritas: Favorita[]; usar: (f: Favorita) => Promise<void>; apagar: (id: string) => void }) {
  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Refeições favoritas" larga>
      {favoritas.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)" }}>Nenhuma favorita ainda. Clique na estrela de uma refeição para salvá-la aqui e reaproveitar em outras dietas.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {favoritas.map((f) => {
            const t = somar(f.items.map((i) => ({ kcal: Number(i.kcal), protein_g: Number(i.protein_g), fat_g: Number(i.fat_g), carb_g: Number(i.carb_g), fiber_g: Number(i.fiber_g) })));
            return (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                <div>
                  <p className="font-semibold">{f.name}</p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{f.items.length} alimento(s) · {kcal0(t.kcal)} · P {g1(t.protein_g)} · L {g1(t.fat_g)} · C {g1(t.carb_g)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={async () => { await usar(f); aoFechar(); }} className="rounded-full px-4 py-2 text-sm font-semibold" style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}>
                    Adicionar à dieta
                  </button>
                  <button type="button" onClick={() => window.confirm(`Apagar "${f.name}" das favoritas?`) && apagar(f.id)} className="text-xs font-semibold" style={{ color: "var(--color-danger)" }}>
                    Apagar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

/* ---------- Lista de compras ---------- */
export function ListaComprasModal({ aberto, aoFechar, itens, paciente }: { aberto: boolean; aoFechar: () => void; itens: ItemRefeicao[]; paciente: string }) {
  const [copiado, setCopiado] = useState(false);
  const linhas = listaDeCompras(itens);
  const kg = (g: number) => (g >= 1000 ? `${(g / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg` : `${g.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} g`);

  async function copiar() {
    const texto = [`Lista de compras da semana (${paciente})`, "", ...linhas.map((l) => `- ${l.nome}: ${kg(l.gramasSemana)}`)].join("\n");
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copie a lista:", texto);
    }
  }

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Lista de compras" larga>
      {linhas.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)" }}>Adicione alimentos às refeições para gerar a lista.</p>
      ) : (
        <>
          <p className="mb-4 text-sm" style={{ color: "var(--color-text-muted)" }}>Quantidades líquidas (como cada alimento está na dieta, já cozido ou preparado). Semana = 7 dias da rotina.</p>
          <table className="mb-5 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                <th className="py-2 font-semibold">Alimento</th><th className="py-2 font-semibold">Por dia</th><th className="py-2 font-semibold">Na semana</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.nome} className="border-t" style={{ borderColor: "var(--color-border)" }}>
                  <td className="py-2 pr-3">{l.nome}</td><td className="py-2 pr-3">{kg(l.gramasDia)}</td><td className="py-2 font-semibold">{kg(l.gramasSemana)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button type="button" onClick={copiar}>{copiado ? "Copiado!" : "Copiar lista da semana"}</Button>
        </>
      )}
    </Modal>
  );
}
