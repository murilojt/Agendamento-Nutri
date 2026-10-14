"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CAMPOS, emOrdem, formatarData, formatarNumero, imc, lerRegistro, num, resumo, serie, type Campo, type Registro } from "@/lib/evolucao";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { TextField } from "@/components/ui/TextField";
import { GraficoEvolucao } from "./GraficoEvolucao";
import { IcoLixeira } from "./Icones";

type Props = {
  patientId: string;
  /** Nutricionista: pode registrar e apagar. Paciente: só vê. */
  editavel: boolean;
  alturaCm?: number | null;
  /** Chamado com o peso mais recente, para manter o cadastro do paciente em dia */
  aoAtualizarPeso?: (kg: number) => void;
};

const COLUNAS = "id, measured_on, weight_kg, body_fat_pct, waist_cm, hip_cm, notes";
const vazio = { data: "", weight_kg: "", body_fat_pct: "", waist_cm: "", hip_cm: "" };
const borda = { borderColor: "var(--color-border)", background: "var(--color-surface)" };
const suave = { color: "var(--color-text-muted)" };
const hojeIso = () => new Date().toLocaleDateString("sv-SE"); // AAAA-MM-DD no fuso do navegador

/** Peso e medidas ao longo do tempo: gráfico, resumo e histórico (com formulário para a nutricionista). */
export function EvolucaoPainel({ patientId, editavel, alturaCm = null, aoAtualizarPeso }: Props) {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [disponivel, setDisponivel] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [campo, setCampo] = useState<Campo>("weight_kg");
  const [form, setForm] = useState({ ...vazio, data: hojeIso() });
  const [notas, setNotas] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from("patient_measurements").select(COLUNAS).eq("patient_id", patientId).order("measured_on", { ascending: true });
    setDisponivel(!error);
    setRegistros(error ? [] : (data ?? []).map((r) => ({ id: String(r.id), measured_on: String(r.measured_on), weight_kg: num(r.weight_kg), body_fat_pct: num(r.body_fat_pct), waist_cm: num(r.waist_cm), hip_cm: num(r.hip_cm), notes: r.notes ?? null })));
    setCarregando(false);
  }, [patientId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const comValores = CAMPOS.filter((c) => registros.some((r) => r[c.chave] != null));
  const ativo = comValores.find((c) => c.chave === campo) ?? comValores[0];
  const pontos = useMemo(() => (ativo ? serie(registros, ativo.chave) : []), [registros, ativo]);
  const res = ativo ? resumo(registros, ativo.chave) : null;
  const pesoAtual = resumo(registros, "weight_kg")?.ultimo ?? null;
  const imcAtual = imc(pesoAtual, alturaCm);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const lido = lerRegistro(form, hojeIso());
    if ("erro" in lido) return setErro(lido.erro);
    setSalvando(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("patient_measurements").insert({ patient_id: patientId, ...lido.dados, notes: notas.trim() || null, created_by: user?.id ?? null });
    setSalvando(false);
    if (error) return setErro("Não foi possível salvar a medição. Tente novamente.");
    // se for a medição de peso mais recente, atualiza o peso do cadastro (usado nas metas g/kg da dieta)
    const ultimaDataComPeso = emOrdem(registros).filter((r) => r.weight_kg != null).pop()?.measured_on ?? "";
    if (lido.dados.weight_kg != null && lido.dados.measured_on >= ultimaDataComPeso) aoAtualizarPeso?.(lido.dados.weight_kg);
    setForm({ ...vazio, data: hojeIso() });
    setNotas("");
    await carregar();
  }

  async function apagar(id: string) {
    if (!window.confirm("Apagar esta medição?")) return;
    const { error } = await supabase.from("patient_measurements").delete().eq("id", id);
    if (error) return setErro("Não foi possível apagar a medição.");
    await carregar();
  }

  if (carregando) return <p className="text-sm" style={suave}>Carregando…</p>;
  if (!disponivel) {
    return (
      <p className="rounded-2xl border p-4 text-sm" style={borda} role="alert">
        A evolução ainda não está ativa no banco de dados. No Supabase, rode o script <strong>12-evolucao-do-paciente.sql</strong> e recarregue a página.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {registros.length === 0 ? (
        <p className="text-sm" style={suave}>{editavel ? "Nenhuma medição ainda. Registre a primeira abaixo." : "Sua nutricionista ainda não registrou medições."}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Medida do gráfico">
            {comValores.map((c) => (
              <button
                key={c.chave}
                type="button"
                role="tab"
                aria-selected={ativo?.chave === c.chave}
                onClick={() => setCampo(c.chave)}
                className="rounded-full border px-4 py-1.5 text-sm font-semibold"
                style={ativo?.chave === c.chave ? { background: "var(--color-primary)", color: "var(--color-on-primary)", borderColor: "var(--color-primary)" } : borda}
              >
                {c.rotulo}
              </button>
            ))}
          </div>

          {ativo && res && (
            <div>
              <div className="mb-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
                <p><span className="text-3xl" style={{ fontFamily: "var(--font-display, inherit)" }}>{formatarNumero(res.ultimo)}</span> <span className="text-sm" style={suave}>{ativo.unidade} (último)</span></p>
                {res.quantidade > 1 && (
                  <p className="text-sm font-semibold" data-testid="variacao">
                    {res.variacao > 0 ? "+" : ""}{formatarNumero(res.variacao)} {ativo.unidade} <span className="font-normal" style={suave}>desde {formatarData(pontos[0].data)}</span>
                  </p>
                )}
                {ativo.chave === "weight_kg" && imcAtual && <p className="text-sm" style={suave}>IMC {formatarNumero(imcAtual)}</p>}
              </div>
              <GraficoEvolucao pontos={pontos} unidade={ativo.unidade} titulo={ativo.rotulo} />
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs" style={suave}>
                  <th className="py-1 pr-3 font-semibold">Data</th>
                  {CAMPOS.map((c) => <th key={c.chave} className="py-1 pr-3 font-semibold">{c.rotulo} ({c.unidade})</th>)}
                  <th className="py-1 font-semibold">Obs.</th>
                  {editavel && <th className="w-8" />}
                </tr>
              </thead>
              <tbody>
                {[...registros].reverse().map((r) => (
                  <tr key={r.id} className="border-t" style={{ borderColor: "var(--color-border)" }}>
                    <td className="py-1.5 pr-3 whitespace-nowrap">{formatarData(r.measured_on)}</td>
                    {CAMPOS.map((c) => <td key={c.chave} className="py-1.5 pr-3">{r[c.chave] == null ? "–" : formatarNumero(r[c.chave] as number)}</td>)}
                    <td className="py-1.5" style={suave}>{r.notes}</td>
                    {editavel && (
                      <td className="py-1.5 text-right">
                        <button type="button" onClick={() => apagar(r.id)} aria-label={`Apagar medição de ${formatarData(r.measured_on)}`} className="rounded-lg p-1" style={{ color: "var(--color-danger)" }}>
                          <IcoLixeira className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editavel && (
        <form onSubmit={salvar} className="rounded-2xl border p-4" style={{ ...borda, background: "var(--fundo-alt)" }}>
          <h3 className="mb-3 text-lg">Nova medição</h3>
          <div className="grid grid-cols-2 items-end gap-x-3 md:grid-cols-5">
            <TextField label="Data" type="date" max={hojeIso()} value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            {CAMPOS.map((c) => (
              <TextField key={c.chave} label={`${c.rotulo} (${c.unidade})`} inputMode="decimal" value={form[c.chave]} onChange={(e) => setForm({ ...form, [c.chave]: e.target.value })} />
            ))}
          </div>
          <TextField label="Observação (opcional)" value={notas} onChange={(e) => setNotas(e.target.value)} />
          <ErrorText>{erro}</ErrorText>
          <Button type="submit" disabled={salvando}>{salvando ? "Salvando…" : "Registrar medição"}</Button>
        </form>
      )}
      {!editavel && <ErrorText>{erro}</ErrorText>}
    </div>
  );
}
