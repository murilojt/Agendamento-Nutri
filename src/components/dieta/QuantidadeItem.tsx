"use client";

import { useEffect, useState } from "react";
import { gramasDe, lerQuantidade, MEDIDAS_COMUNS, qtdEm, validarMedida, type Medida } from "@/lib/medidas";
import type { ItemRefeicao } from "@/lib/nutricao";

type MedidaSalva = Medida & { id?: string };

type Props = {
  item: ItemRefeicao;
  /** Medidas cadastradas para o alimento */
  medidas: MedidaSalva[];
  /** false quando o patch SQL 15 ainda não foi aplicado: só gramas */
  disponivel: boolean;
  /** Muda a quantidade (em gramas) e, opcionalmente, a medida mostrada (null = gramas) */
  aoMudar: (gramas: number, unidade?: Medida | null) => void;
  /** Cadastra a medida no alimento (devolve null se falhar) */
  criarMedida: (foodId: string, m: Medida) => Promise<MedidaSalva | null>;
};

const borda = { borderColor: "var(--color-border)", background: "var(--color-surface)" };
const NOVA = "__nova__";

/** Quantidade de um alimento, em gramas ou em medida caseira (colher de sopa, unidade...). */
export function QuantidadeItem({ item, medidas, disponivel, aoMudar, criarMedida }: Props) {
  const atual: Medida | null = item.unit_name && item.unit_grams ? { name: item.unit_name, plural: item.unit_plural ?? null, grams: item.unit_grams } : null;
  const valorNaTela = atual ? qtdEm(item.quantity_g, atual) : item.quantity_g;
  const [v, setV] = useState(String(valorNaTela));
  const [criando, setCriando] = useState(false);
  useEffect(() => setV(String(valorNaTela)), [valorNaTela]);

  const opcoes: Medida[] = [...medidas];
  if (atual && !opcoes.some((m) => m.name.toLowerCase() === atual.name.toLowerCase())) opcoes.push(atual);

  function confirmar() {
    const n = lerQuantidade(v);
    if (n == null) return setV(String(valorNaTela));
    aoMudar(atual ? gramasDe(n, atual) : n);
  }

  function trocar(valor: string) {
    if (valor === NOVA) return setCriando(true);
    if (valor === "g") return aoMudar(item.quantity_g, null);
    const m = opcoes.find((o) => o.name === valor);
    if (m) aoMudar(item.quantity_g, m);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 text-xs font-semibold">
        <label className="flex items-center">
          <span className="sr-only">Quantidade de {item.name}</span>
          <input
            inputMode="decimal"
            value={v}
            onChange={(e) => setV(e.target.value)}
            onBlur={confirmar}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="w-20 rounded-lg border px-2 py-1 text-right text-sm"
            style={borda}
          />
        </label>
        {disponivel ? (
          <label>
            <span className="sr-only">Unidade de medida de {item.name}</span>
            <select value={atual?.name ?? "g"} onChange={(e) => trocar(e.target.value)} className="max-w-[9.5rem] rounded-lg border px-1.5 py-1 text-sm" style={borda}>
              <option value="g">g (gramas)</option>
              {opcoes.map((m) => (
                <option key={m.name} value={m.name}>{m.plural ?? m.name}</option>
              ))}
              <option value={NOVA}>+ Nova medida…</option>
            </select>
          </label>
        ) : (
          "g"
        )}
      </div>
      {atual && <span className="text-[11px] font-normal" style={{ color: "var(--color-text-muted)" }}>= {item.quantity_g.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} g</span>}
      {criando && <NovaMedida item={item} aoCancelar={() => setCriando(false)} aoConfirmar={async (m, salvar) => {
        const final = salvar && item.food_id ? await criarMedida(item.food_id, m) : m;
        if (!final) return;
        setCriando(false);
        aoMudar(item.quantity_g, { name: final.name, plural: final.plural, grams: final.grams });
      }} />}
    </div>
  );
}

function NovaMedida({ item, aoCancelar, aoConfirmar }: { item: ItemRefeicao; aoCancelar: () => void; aoConfirmar: (m: Medida, salvar: boolean) => Promise<void> }) {
  const [nome, setNome] = useState("");
  const [plural, setPlural] = useState("");
  const [gramas, setGramas] = useState("");
  const [salvar, setSalvar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function aoDigitarNome(valor: string) {
    setNome(valor);
    const sugerida = MEDIDAS_COMUNS.find((m) => m.name === valor.trim().toLowerCase());
    if (sugerida) {
      setPlural(sugerida.plural);
      if (sugerida.grams && !gramas) setGramas(String(sugerida.grams));
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const r = validarMedida(nome, plural, gramas);
    if ("erro" in r) return setErro(r.erro);
    setErro(null);
    setEnviando(true);
    await aoConfirmar(r.medida, salvar);
    setEnviando(false);
  }

  return (
    <form onSubmit={enviar} className="mt-1 flex w-72 max-w-full flex-col gap-2 rounded-xl border p-3 text-xs" style={borda} aria-label={`Nova medida para ${item.name}`}>
      <label className="flex flex-col gap-1 font-semibold">
        Nome da medida
        <input list="medidas-comuns" value={nome} onChange={(e) => aoDigitarNome(e.target.value)} placeholder="ex.: colher de sopa" className="rounded-lg border px-2 py-1 text-sm font-normal" style={borda} autoComplete="off" />
        <datalist id="medidas-comuns">{MEDIDAS_COMUNS.map((m) => <option key={m.name} value={m.name} />)}</datalist>
      </label>
      <label className="flex flex-col gap-1 font-semibold">
        No plural (2 ou mais)
        <input value={plural} onChange={(e) => setPlural(e.target.value)} placeholder="ex.: colheres de sopa" className="rounded-lg border px-2 py-1 text-sm font-normal" style={borda} autoComplete="off" />
      </label>
      <label className="flex flex-col gap-1 font-semibold">
        Gramas de 1 unidade
        <input inputMode="decimal" value={gramas} onChange={(e) => setGramas(e.target.value)} placeholder="ex.: 25" className="rounded-lg border px-2 py-1 text-sm font-normal" style={borda} />
      </label>
      {item.food_id && (
        <label className="flex items-center gap-2 font-normal">
          <input type="checkbox" checked={salvar} onChange={(e) => setSalvar(e.target.checked)} />
          Salvar para este alimento (usar em outras dietas)
        </label>
      )}
      {erro && <p role="alert" style={{ color: "var(--color-danger)" }}>{erro}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={enviando} className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}>Usar medida</button>
        <button type="button" onClick={aoCancelar} className="rounded-full border px-3 py-1 text-xs font-semibold" style={borda}>Cancelar</button>
      </div>
    </form>
  );
}
