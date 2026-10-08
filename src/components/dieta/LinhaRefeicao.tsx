"use client";

import { useEffect, useState } from "react";
import { somar, type Alimento, type ItemRefeicao } from "@/lib/nutricao";
import type { Refeicao } from "./tipos";
import { BuscaAlimento } from "./BuscaAlimento";
import { ChipsMacros, g1, kcal0 } from "./Macros";
import { IcoArrastar, IcoCopiar, IcoEditar, IcoEstrela, IcoLixeira, IcoSeta } from "./Icones";

type Props = {
  refeicao: Refeicao;
  itens: ItemRefeicao[];
  alimentos: Alimento[];
  uso: Map<string, number>;
  expandida: boolean;
  alternar: () => void;
  arrastando: boolean;
  aoArrastar: { iniciar: () => void; soltarSobre: () => void; terminar: () => void };
  atualizar: (patch: Partial<Pick<Refeicao, "meal_name" | "meal_time" | "notes">>) => void;
  remover: () => void;
  duplicar: () => void;
  favoritar: () => void;
  adicionarAlimento: (a: Alimento) => void;
  mudarQuantidade: (itemId: string, g: number) => void;
  removerAlimento: (itemId: string) => void;
  contagemSubstitutos: (itemId: string) => number;
  abrirSubstitutos: (item: ItemRefeicao) => void;
};

const botaoIcone = "grid h-9 w-9 place-items-center rounded-xl border";

export function LinhaRefeicao(p: Props) {
  const { refeicao: r } = p;
  const [nome, setNome] = useState(r.meal_name);
  const [hora, setHora] = useState((r.meal_time ?? "").slice(0, 5));
  const [notasAbertas, setNotasAbertas] = useState(false);
  const [notas, setNotas] = useState(r.notes ?? "");
  useEffect(() => setNome(r.meal_name), [r.meal_name]);
  useEffect(() => setHora((r.meal_time ?? "").slice(0, 5)), [r.meal_time]);

  const total = somar(p.itens);
  const borda = { borderColor: "var(--color-border)", background: "var(--color-surface)" };

  return (
    <li
      className={`rounded-3xl border p-3 md:p-4 ${p.arrastando ? "opacity-50" : ""}`}
      style={{ borderColor: "var(--color-border)", background: "var(--fundo-alt)" }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        p.aoArrastar.soltarSobre();
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          draggable
          onDragStart={p.aoArrastar.iniciar}
          onDragEnd={p.aoArrastar.terminar}
          className="cursor-grab touch-none p-1"
          style={{ color: "var(--color-text-muted)" }}
          title="Arraste para reordenar"
          aria-label="Arrastar para reordenar"
        >
          <IcoArrastar className="h-5 w-5" />
        </span>

        <input
          type="time"
          value={hora}
          aria-label={`Horário de ${r.meal_name}`}
          onChange={(e) => setHora(e.target.value)}
          onBlur={() => hora !== (r.meal_time ?? "").slice(0, 5) && p.atualizar({ meal_time: hora || null })}
          className="w-32 rounded-xl border px-3 py-2 text-sm font-semibold"
          style={borda}
        />
        <input
          value={nome}
          aria-label="Nome da refeição"
          onChange={(e) => setNome(e.target.value)}
          onBlur={() => nome.trim() && nome !== r.meal_name ? p.atualizar({ meal_name: nome.trim() }) : setNome(r.meal_name)}
          className="min-w-0 flex-1 basis-44 rounded-xl border px-3 py-2 text-sm font-semibold"
          style={borda}
        />

        <div className="order-last w-full pl-8">
          <ChipsMacros m={total} compacto />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" onClick={p.alternar} aria-expanded={p.expandida} aria-label={p.expandida ? "Recolher" : "Expandir"} className={botaoIcone} style={borda}>
            <IcoSeta className={`h-4 w-4 transition-transform ${p.expandida ? "rotate-180" : ""}`} />
          </button>
          <button
            type="button"
            onClick={p.alternar}
            className="hidden whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold md:block"
            style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
          >
            {p.expandida ? "ocultar alimentos" : `ver alimentos (${p.itens.length})`}
          </button>
          <button type="button" onClick={() => setNotasAbertas((v) => !v)} aria-label="Observações da refeição" title="Observações" className={botaoIcone} style={borda}><IcoEditar className="h-4 w-4" /></button>
          <button type="button" onClick={p.duplicar} aria-label="Duplicar refeição" title="Duplicar" className={botaoIcone} style={borda}><IcoCopiar className="h-4 w-4" /></button>
          <button type="button" onClick={p.favoritar} aria-label="Salvar nas favoritas" title="Salvar nas favoritas" className={botaoIcone} style={borda}><IcoEstrela className="h-4 w-4" /></button>
          <button
            type="button"
            onClick={() => window.confirm(`Remover "${r.meal_name}" e seus alimentos da dieta?`) && p.remover()}
            aria-label="Remover refeição"
            title="Remover"
            className={botaoIcone}
            style={{ ...borda, color: "var(--color-danger)" }}
          >
            <IcoLixeira className="h-4 w-4" />
          </button>
        </div>
      </div>

      {notasAbertas && (
        <div className="mt-3">
          <label className="mb-1 block text-xs font-semibold">Observações da refeição</label>
          <textarea
            value={notas}
            rows={2}
            onChange={(e) => setNotas(e.target.value)}
            onBlur={() => notas !== (r.notes ?? "") && p.atualizar({ notes: notas })}
            placeholder="Ex.: pode trocar o pão por tapioca"
            className="w-full rounded-2xl border px-4 py-2 text-sm"
            style={borda}
          />
        </div>
      )}

      {p.expandida && (
        <div className="mt-4 rounded-2xl p-3 md:p-4" style={{ background: "var(--color-bg)" }}>
          {p.itens.length === 0 ? (
            <p className="mb-3 text-sm" style={{ color: "var(--color-text-muted)" }}>Nenhum alimento nesta refeição ainda.</p>
          ) : (
            <ul className="mb-4 flex flex-col gap-2">
              {p.itens.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm" style={borda}>
                  <span className="min-w-0 flex-1 basis-48 font-medium">{i.name}</span>
                  <QuantidadeItem item={i} aoMudar={(g) => p.mudarQuantidade(i.id, g)} />
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    P {g1(i.protein_g)} · L {g1(i.fat_g)} · C {g1(i.carb_g)} · {kcal0(i.kcal)}
                  </span>
                  <button
                    type="button"
                    onClick={() => p.abrirSubstitutos(i)}
                    className="whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold"
                    style={borda}
                    aria-label={`Substitutos de ${i.name}`}
                  >
                    Substitutos{p.contagemSubstitutos(i.id) > 0 ? ` (${p.contagemSubstitutos(i.id)})` : ""}
                  </button>
                  <button type="button" onClick={() => p.removerAlimento(i.id)} aria-label={`Remover ${i.name}`} className="rounded-lg p-1.5" style={{ color: "var(--color-danger)" }}>
                    <IcoLixeira className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <BuscaAlimento alimentos={p.alimentos} uso={p.uso} aoEscolher={p.adicionarAlimento} />
        </div>
      )}
    </li>
  );
}

function QuantidadeItem({ item, aoMudar }: { item: ItemRefeicao; aoMudar: (g: number) => void }) {
  const [v, setV] = useState(String(item.quantity_g));
  useEffect(() => setV(String(item.quantity_g)), [item.quantity_g]);
  const confirmar = () => {
    const n = Number(v.replace(",", "."));
    if (n > 0) aoMudar(n);
    else setV(String(item.quantity_g));
  };
  return (
    <label className="flex items-center gap-1 text-xs font-semibold">
      <span className="sr-only">Quantidade de {item.name} em gramas</span>
      <input
        inputMode="decimal"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="w-20 rounded-lg border px-2 py-1 text-right text-sm"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      />
      g
    </label>
  );
}
