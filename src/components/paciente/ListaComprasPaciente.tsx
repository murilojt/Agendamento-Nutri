"use client";

import { useEffect, useMemo, useState } from "react";
import { listaDeCompras, type ItemRefeicao } from "@/lib/nutricao";
import { chaveDeArmazenamento, chaveDeCompra, formatarQuantidade, guardarMarcados, lerMarcados } from "@/lib/compras";
import { Card } from "@/components/ui/Card";

const suave = { color: "var(--color-text-muted)" };

/** Lista de compras da semana com caixas para marcar o que já foi comprado (a marcação fica neste aparelho). */
export function ListaComprasPaciente({ dietaId, itens }: { dietaId: string; itens: ItemRefeicao[] }) {
  const linhas = useMemo(() => listaDeCompras(itens), [itens]);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [lido, setLido] = useState(false);

  useEffect(() => {
    try {
      setMarcados(lerMarcados(localStorage.getItem(chaveDeArmazenamento(dietaId))));
    } catch {
      // sem armazenamento: começa sem marcações
    }
    setLido(true);
  }, [dietaId]);

  function atualizar(novo: Set<string>) {
    setMarcados(novo);
    try {
      localStorage.setItem(chaveDeArmazenamento(dietaId), guardarMarcados(novo));
    } catch {
      // ignora: a marcação vale só enquanto a página estiver aberta
    }
  }

  function alternar(chave: string) {
    const novo = new Set(marcados);
    if (novo.has(chave)) novo.delete(chave);
    else novo.add(chave);
    atualizar(novo);
  }

  if (linhas.length === 0) return <Card className="p-8 text-center"><p style={suave}>Sua dieta ainda não tem alimentos para gerar a lista.</p></Card>;

  const comprados = linhas.filter((l) => marcados.has(chaveDeCompra(l.nome))).length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm" style={suave}>
          Quantidades para <strong>7 dias</strong>, como cada alimento aparece na dieta (já cozido ou preparado).
        </p>
        <p className="text-sm font-semibold" aria-live="polite" data-testid="contagem-compras">
          {comprados} de {linhas.length} comprados
        </p>
      </div>
      <Card className="divide-y" style={{ borderColor: "var(--color-border)" }}>
        <ul className="divide-y" style={{ borderColor: "var(--color-border)" }}>
          {linhas.map((l) => {
            const chave = chaveDeCompra(l.nome);
            const feito = marcados.has(chave);
            const id = `compra-${chave.replace(/[^a-z0-9]+/g, "-")}`;
            return (
              <li key={chave} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: "var(--color-border)" }}>
                <input id={id} type="checkbox" checked={lido && feito} onChange={() => alternar(chave)} className="h-5 w-5 shrink-0" style={{ accentColor: "var(--color-primary)" }} />
                <label htmlFor={id} className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 text-sm" style={feito ? { textDecoration: "line-through", ...suave } : undefined}>
                  <span className="min-w-0 break-words">{l.nome}</span>
                  <span className="shrink-0 font-semibold">{formatarQuantidade(l.gramasSemana)}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </Card>
      {comprados > 0 && (
        <button type="button" onClick={() => atualizar(new Set())} className="mt-3 text-sm font-semibold underline">
          Limpar marcações
        </button>
      )}
    </div>
  );
}
