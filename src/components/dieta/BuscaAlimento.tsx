"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { buscarAlimentos, type Alimento } from "@/lib/nutricao";

/** Campo de busca de alimentos com lista de resultados (busca sem acento, todas as palavras). */
export function BuscaAlimento({ alimentos, aoEscolher }: { alimentos: Alimento[]; aoEscolher: (a: Alimento) => void }) {
  const [termo, setTermo] = useState("");
  const idLista = useId();
  const resultados = useMemo(() => buscarAlimentos(alimentos, termo), [alimentos, termo]);

  return (
    <div className="relative">
      <label className="mb-1 block text-xs font-semibold" htmlFor={idLista}>
        Adicionar alimento
      </label>
      <input
        id={idLista}
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder={alimentos.length ? "Digite para buscar (ex.: arroz, frango grelhado)" : "Nenhum alimento cadastrado ainda"}
        autoComplete="off"
        className="w-full rounded-2xl border px-4 py-2.5 text-sm"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      />
      {termo.trim() && (
        <ul
          className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-2xl border p-1 shadow-lg"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
          role="listbox"
        >
          {resultados.length === 0 && (
            <li className="px-3 py-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
              Nada encontrado.{" "}
              <Link href="/admin/alimentos" target="_blank" className="font-semibold underline">
                Cadastrar alimento
              </Link>
            </li>
          )}
          {resultados.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => {
                  aoEscolher(a);
                  setTermo("");
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-[var(--fundo-alt)]"
              >
                <span>
                  {a.name}
                  {a.source === "referencia" && (
                    <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "var(--gema)", color: "var(--sobre-gema)" }}>
                      aprox.
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {a.kcal} kcal/100 g
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
