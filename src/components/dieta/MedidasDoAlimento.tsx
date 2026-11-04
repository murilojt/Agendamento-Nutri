"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MEDIDAS_COMUNS, textoDaMedida, validarMedida } from "@/lib/medidas";
import { ErrorText } from "@/components/ui/ErrorText";
import { IcoLixeira } from "./Icones";

type Linha = { id: string; name: string; plural: string | null; grams: number };
const borda = { borderColor: "var(--color-border)", background: "var(--color-surface)" };

/** Medidas caseiras de um alimento do banco (colher de sopa, unidade...), usadas na hora de montar a dieta. */
export function MedidasDoAlimento({ foodId }: { foodId: string }) {
  const [lista, setLista] = useState<Linha[]>([]);
  const [disponivel, setDisponivel] = useState(true);
  const [nome, setNome] = useState("");
  const [plural, setPlural] = useState("");
  const [gramas, setGramas] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from("food_measures").select("id, name, plural, grams").eq("food_id", foodId).order("name");
    setDisponivel(!error);
    setLista((data ?? []).map((m) => ({ id: m.id, name: m.name, plural: m.plural ?? null, grams: Number(m.grams) })));
  }, [foodId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function adicionar() {
    const r = validarMedida(nome, plural, gramas);
    if ("erro" in r) return setErro(r.erro);
    setErro(null);
    const { error } = await supabase.from("food_measures").insert({ food_id: foodId, name: r.medida.name, plural: r.medida.plural, grams: r.medida.grams });
    if (error) return setErro(error.code === "23505" ? "Este alimento já tem uma medida com esse nome." : "Não foi possível salvar a medida.");
    setNome(""); setPlural(""); setGramas("");
    await carregar();
  }

  async function apagar(id: string) {
    const { error } = await supabase.from("food_measures").delete().eq("id", id);
    if (error) return setErro("Não foi possível apagar a medida.");
    await carregar();
  }

  function aoDigitarNome(v: string) {
    setNome(v);
    const s = MEDIDAS_COMUNS.find((m) => m.name === v.trim().toLowerCase());
    if (s) { setPlural(s.plural); if (s.grams && !gramas) setGramas(String(s.grams)); }
  }

  if (!disponivel) {
    return <p className="mt-4 rounded-2xl border p-3 text-xs" style={borda} role="alert">As medidas caseiras ainda não estão ativas no banco. No Supabase, rode o script <strong>15-medidas-caseiras.sql</strong>.</p>;
  }

  return (
    <section className="mt-6 border-t pt-4" style={{ borderColor: "var(--color-border)" }} aria-label="Medidas caseiras">
      <h3 className="mb-1 text-lg">Medidas caseiras</h3>
      <p className="mb-3 text-xs" style={{ color: "var(--color-text-muted)" }}>Ex.: 1 colher de sopa = 25 g. Na dieta você poderá prescrever este alimento nessas medidas, além de gramas.</p>
      {lista.length > 0 && (
        <ul className="mb-3 flex flex-col gap-1 text-sm">
          {lista.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5" style={borda}>
              <span>1 {m.name} = <strong>{m.grams.toLocaleString("pt-BR")} g</strong> <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>({textoDaMedida(2, m)})</span></span>
              <button type="button" onClick={() => apagar(m.id)} aria-label={`Apagar ${m.name}`} className="rounded p-1" style={{ color: "var(--color-danger)" }}><IcoLixeira className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
        <input list="medidas-comuns-admin" aria-label="Nome da medida" value={nome} onChange={(e) => aoDigitarNome(e.target.value)} placeholder="Medida (ex.: colher de sopa)" className="rounded-lg border px-2 py-2 text-sm" style={borda} autoComplete="off" />
        <datalist id="medidas-comuns-admin">{MEDIDAS_COMUNS.map((m) => <option key={m.name} value={m.name} />)}</datalist>
        <input aria-label="Plural da medida" value={plural} onChange={(e) => setPlural(e.target.value)} placeholder="Plural (colheres de sopa)" className="rounded-lg border px-2 py-2 text-sm" style={borda} autoComplete="off" />
        <input aria-label="Gramas de uma unidade" inputMode="decimal" value={gramas} onChange={(e) => setGramas(e.target.value)} placeholder="Gramas de 1 unidade" className="rounded-lg border px-2 py-2 text-sm" style={borda} />
      </div>
      <ErrorText>{erro}</ErrorText>
      <button type="button" onClick={adicionar} className="mt-2 rounded-full border px-4 py-1.5 text-sm font-semibold" style={borda}>Adicionar medida</button>
    </section>
  );
}
