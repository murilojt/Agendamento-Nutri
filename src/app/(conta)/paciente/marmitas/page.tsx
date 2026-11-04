"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Carregando } from "@/components/ui/Carregando";
import { ErrorText } from "@/components/ui/ErrorText";
import { calcularMarmitas, lerPorcoes, MAX_PORCOES, refeicoesIniciais } from "@/lib/marmitas";
import { formatarQuantidade } from "@/lib/compras";
import { useDietaDoPaciente } from "@/components/paciente/useDietaDoPaciente";

const suave = { color: "var(--color-text-muted)" };
const RAPIDAS = [7, 14, 30];

export default function MarmitasPage() {
  const d = useDietaDoPaciente();
  const [texto, setTexto] = useState("7");
  const [escolhidas, setEscolhidas] = useState<string[]>([]);
  const [copiado, setCopiado] = useState(false);

  // Começa com almoço e jantar marcados (ou todas as refeições, se a dieta não tiver esses nomes)
  useEffect(() => {
    if (d.refeicoes.length > 0) setEscolhidas(refeicoesIniciais(d.refeicoes));
  }, [d.refeicoes]);

  const porcoes = lerPorcoes(texto);
  const resultado = useMemo(
    () => (porcoes ? calcularMarmitas(d.refeicoes, d.itens, escolhidas, porcoes) : null),
    [porcoes, d.refeicoes, d.itens, escolhidas],
  );

  function alternar(id: string) {
    setEscolhidas((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));
  }

  async function copiar() {
    if (!resultado) return;
    const nomes = resultado.porRefeicao.map((r) => r.nome).join(" + ");
    const linhas = [`Marmitas: ${resultado.porcoes} × ${nomes}`, "", ...resultado.total.map((l) => `- ${l.nome}: ${formatarQuantidade(l.gramasTotal)}`)];
    try {
      await navigator.clipboard.writeText(linhas.join("\n"));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copie a lista:", linhas.join("\n"));
    }
  }

  if (d.carregando) return <Carregando />;

  return (
    <div>
      <h1 className="mb-2 text-4xl">Marmitas</h1>
      <p className="mb-6 text-sm" style={suave}>
        Diga quantas marmitas você quer deixar prontas e veja quanto de cada alimento precisa preparar, com base na sua dieta.
      </p>
      <ErrorText>{d.erro}</ErrorText>

      {!d.dieta || d.refeicoes.length === 0 ? (
        <Card className="p-8 text-center">
          <p style={suave}>Sua dieta ainda não tem refeições. Volte mais tarde.</p>
        </Card>
      ) : (
        <>
          <Card className="mb-6 flex flex-col gap-5 p-5">
            <div>
              <label htmlFor="porcoes" className="mb-2 block text-sm font-semibold">Quantas marmitas de cada refeição?</label>
              <div className="flex flex-wrap items-center gap-2">
                {RAPIDAS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTexto(String(n))}
                    aria-pressed={porcoes === n}
                    className="rounded-full border px-4 py-2 text-sm font-semibold"
                    style={porcoes === n ? { background: "var(--color-primary)", color: "var(--color-on-primary)", borderColor: "var(--color-primary)" } : { borderColor: "var(--color-border)", background: "var(--color-surface)" }}
                  >
                    {n}
                  </button>
                ))}
                <input
                  id="porcoes"
                  inputMode="numeric"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  aria-describedby="porcoes-ajuda"
                  className="w-24 rounded-2xl border px-4 py-2 text-center text-sm"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
                />
              </div>
              <p id="porcoes-ajuda" className="mt-1 text-xs" style={porcoes ? suave : { color: "var(--color-danger)" }}>
                {porcoes ? `Número inteiro de 1 a ${MAX_PORCOES}.` : `Digite um número inteiro de 1 a ${MAX_PORCOES}.`}
              </p>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Quais refeições?</legend>
              <div className="flex flex-wrap gap-2">
                {d.refeicoes.map((r) => {
                  const marcada = escolhidas.includes(r.id);
                  return (
                    <label
                      key={r.id}
                      className="flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
                      style={marcada ? { borderColor: "var(--color-primary)", background: "var(--fundo-alt)" } : { borderColor: "var(--color-border)", background: "var(--color-surface)" }}
                    >
                      <input type="checkbox" checked={marcada} onChange={() => alternar(r.id)} style={{ accentColor: "var(--color-primary)" }} />
                      {r.meal_name}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </Card>

          {resultado && escolhidas.length === 0 && <Card className="p-6 text-center"><p style={suave}>Escolha pelo menos uma refeição.</p></Card>}

          {resultado && escolhidas.length > 0 && (
            <>
              <section className="mb-6" aria-live="polite">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                  <h2 className="text-2xl">Para {resultado.porcoes} {resultado.porcoes === 1 ? "marmita" : "marmitas"} de cada</h2>
                  <button type="button" onClick={copiar} className="rounded-full border px-4 py-2 text-sm font-semibold" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                    {copiado ? "Copiado!" : "Copiar lista"}
                  </button>
                </div>
                <Card>
                  <ul className="divide-y" style={{ borderColor: "var(--color-border)" }} data-testid="total-marmitas">
                    {resultado.total.map((l) => (
                      <li key={l.nome} className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 py-3 text-sm" style={{ borderColor: "var(--color-border)" }}>
                        <span className="min-w-0 break-words">{l.nome}</span>
                        <span className="shrink-0 font-semibold">{formatarQuantidade(l.gramasTotal)}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
                {resultado.total.length === 0 && <p className="mt-2 text-sm" style={suave}>As refeições escolhidas não têm alimentos cadastrados.</p>}
              </section>

              <section className="mb-6">
                <h2 className="mb-3 text-2xl">Cada marmita</h2>
                <div className="flex flex-col gap-3">
                  {resultado.porRefeicao.map((r) => (
                    <Card key={r.id} className="p-5">
                      <div className="mb-2 flex items-baseline justify-between gap-3">
                        <span className="text-lg font-semibold">{r.nome}</span>
                        <span className="text-xs font-semibold" style={suave}>{r.kcalPorPorcao} kcal por marmita</span>
                      </div>
                      <ul className="flex flex-col gap-1 text-sm">
                        {r.linhas.map((l, i) => (
                          <li key={i} className="flex justify-between gap-3">
                            <span className="min-w-0 break-words">{l.nome}</span>
                            <span className="shrink-0" style={suave}>{formatarQuantidade(l.gramasPorPorcao)} <span aria-hidden>→</span> <strong style={{ color: "var(--color-text)" }}>{formatarQuantidade(l.gramasTotal)}</strong></span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  ))}
                </div>
              </section>

              <p className="text-xs" style={suave}>
                As quantidades seguem a sua dieta: alimento já cozido ou preparado, como é pesado na hora de comer.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
