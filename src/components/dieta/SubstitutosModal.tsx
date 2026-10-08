"use client";

import { useEffect, useState } from "react";
import { gramasParaMesmasKcal, type Alimento, type ItemRefeicao } from "@/lib/nutricao";
import type { Substituto } from "./tipos";
import { Modal } from "./Modal";
import { BuscaAlimento } from "./BuscaAlimento";
import { g1, kcal0 } from "./Macros";
import { IcoLixeira } from "./Icones";

type Props = {
  item: ItemRefeicao | null;
  substitutos: Substituto[];
  alimentos: Alimento[];
  uso: Map<string, number>;
  disponivel: boolean;
  aoFechar: () => void;
  adicionar: (itemId: string, a: Alimento, gramas: number) => Promise<boolean>;
  mudarQuantidade: (id: string, g: number) => void;
  remover: (id: string) => void;
};

const borda = { borderColor: "var(--color-border)", background: "var(--color-surface)" };
const suave = { color: "var(--color-text-muted)" };

/** Cadastra as opções que o paciente pode comer no lugar de um alimento da dieta. */
export function SubstitutosModal({ item, substitutos, alimentos, uso, disponivel, aoFechar, adicionar, mudarQuantidade, remover }: Props) {
  const lista = item ? substitutos.filter((s) => s.item_id === item.id) : [];

  return (
    <Modal aberto={!!item} aoFechar={aoFechar} titulo="Substitutos" larga>
      {item && (
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border p-4" style={{ ...borda, background: "var(--fundo-alt)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={suave}>Alimento da dieta</p>
            <p className="font-semibold">{item.name}</p>
            <p className="text-sm" style={suave}>
              {item.quantity_g.toLocaleString("pt-BR")} g · {kcal0(item.kcal)} · P {g1(item.protein_g)} · L {g1(item.fat_g)} · C {g1(item.carb_g)}
            </p>
          </div>

          {!disponivel ? (
            <p className="rounded-2xl border p-4 text-sm" style={borda} role="alert">
              Os substitutos ainda não estão ativos no banco de dados. No Supabase, rode o script <strong>11-substitutos-da-dieta.sql</strong> e recarregue a página.
            </p>
          ) : (
            <>
              {lista.length === 0 ? (
                <p className="text-sm" style={suave}>Nenhum substituto ainda. Busque abaixo e adicione as opções que o paciente pode comer no lugar.</p>
              ) : (
                <ul className="flex flex-col gap-2" aria-label="Substitutos cadastrados">
                  {lista.map((s) => (
                    <LinhaSubstituto key={s.id} s={s} principal={item} aoMudar={(g) => mudarQuantidade(s.id, g)} aoRemover={() => remover(s.id)} />
                  ))}
                </ul>
              )}

              <BuscaAlimento
                alimentos={alimentos}
                uso={uso}
                aoEscolher={(a) => adicionar(item.id, a, gramasParaMesmasKcal(a, item.kcal) ?? 100)}
              />
              <p className="text-xs" style={suave}>
                Ao adicionar, a quantidade já vem calculada para ter as mesmas calorias do alimento da dieta ({kcal0(item.kcal)}). Você pode ajustar.
              </p>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

function LinhaSubstituto({ s, principal, aoMudar, aoRemover }: { s: Substituto; principal: ItemRefeicao; aoMudar: (g: number) => void; aoRemover: () => void }) {
  const [v, setV] = useState(String(s.quantity_g));
  useEffect(() => setV(String(s.quantity_g)), [s.quantity_g]);
  const confirmar = () => {
    const n = Number(v.replace(",", "."));
    if (n > 0) aoMudar(n);
    else setV(String(s.quantity_g));
  };
  const dif = Math.round(s.kcal - principal.kcal);
  const igual = principal.kcal > 0 && Math.abs(dif) / principal.kcal <= 0.05;

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm" style={borda}>
      <span className="min-w-0 flex-1 basis-48 font-medium">{s.name}</span>
      <label className="flex items-center gap-1 text-xs font-semibold">
        <span className="sr-only">Quantidade de {s.name} em gramas</span>
        <input
          inputMode="decimal"
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="w-20 rounded-lg border px-2 py-1 text-right text-sm"
          style={borda}
        />
        g
      </label>
      <span className="text-xs" style={suave}>
        P {g1(s.protein_g)} · L {g1(s.fat_g)} · C {g1(s.carb_g)} · {kcal0(s.kcal)}
      </span>
      <span
        className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
        style={{ background: igual ? "var(--color-primary)" : "var(--gema)", color: igual ? "var(--color-on-primary)" : "var(--sobre-gema)" }}
        title="Diferença de calorias em relação ao alimento da dieta"
      >
        {igual ? "equivalente" : `${dif > 0 ? "+" : ""}${dif} kcal`}
      </span>
      <button type="button" onClick={aoRemover} aria-label={`Remover ${s.name}`} className="rounded-lg p-1.5" style={{ color: "var(--color-danger)" }}>
        <IcoLixeira className="h-4 w-4" />
      </button>
    </li>
  );
}
