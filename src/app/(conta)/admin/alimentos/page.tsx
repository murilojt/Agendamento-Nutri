"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { buscarAlimentos, lerCsvAlimentos, type Alimento } from "@/lib/nutricao";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Carregando } from "@/components/ui/Carregando";
import { ErrorText } from "@/components/ui/ErrorText";
import { TextField } from "@/components/ui/TextField";
import { Modal } from "@/components/dieta/Modal";

const num = (v: unknown) => (v == null ? 0 : Number(v));

/** Lê o arquivo como UTF-8; se não for (Excel antigo salva em Windows-1252), lê nessa codificação para não quebrar os acentos. */
async function lerTexto(arquivo: File): Promise<string> {
  const bytes = await arquivo.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}
type Form = { id: string | null; name: string; kcal: string; protein_g: string; fat_g: string; carb_g: string; fiber_g: string };
const vazio: Form = { id: null, name: "", kcal: "", protein_g: "", fat_g: "", carb_g: "", fiber_g: "" };
const ORIGEM: Record<string, string> = { taco: "TACO", referencia: "Referência (aprox.)", custom: "Cadastrado" };

export default function AlimentosPage() {
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [relatorioCsv, setRelatorioCsv] = useState<string[] | null>(null);

  const carregar = useCallback(async () => {
    const todos: Alimento[] = [];
    for (let de = 0; de < 20000; de += 1000) {
      const { data, error } = await supabase.from("foods").select("id, name, source, kcal, protein_g, fat_g, carb_g, fiber_g").order("name").range(de, de + 999);
      if (error) {
        setErro("Não foi possível carregar os alimentos. Confirme que o patch SQL 06 foi aplicado no Supabase.");
        break;
      }
      todos.push(...(data ?? []).map((r) => ({ id: r.id, name: r.name, source: r.source, kcal: num(r.kcal), protein_g: num(r.protein_g), fat_g: num(r.fat_g), carb_g: num(r.carb_g), fiber_g: num(r.fiber_g) })));
      if ((data?.length ?? 0) < 1000) break;
    }
    setAlimentos(todos);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const lista = useMemo(() => (busca.trim() ? buscarAlimentos(alimentos, busca, 100) : alimentos.slice(0, 100)), [alimentos, busca]);
  const aprox = alimentos.filter((a) => a.source === "referencia").length;
  const importados = alimentos.filter((a) => a.source === "taco").length;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setErroForm(null);
    const n = (s: string) => Number(s.trim().replace(",", ".") || 0);
    const v = { kcal: n(form.kcal), protein_g: n(form.protein_g), fat_g: n(form.fat_g), carb_g: n(form.carb_g), fiber_g: n(form.fiber_g) };
    if (!form.name.trim()) return setErroForm("Informe o nome do alimento.");
    if (Object.values(v).some((x) => !Number.isFinite(x) || x < 0)) return setErroForm("Use apenas números positivos (valores por 100 g).");

    const { error } = form.id
      ? await supabase.from("foods").update({ name: form.name.trim(), ...v }).eq("id", form.id)
      : await supabase.from("foods").insert({ name: form.name.trim(), source: "custom", ...v });
    if (error) return setErroForm(error.code === "23505" ? "Já existe um alimento com esse nome." : "Não foi possível salvar o alimento.");
    setForm(null);
    await carregar();
  }

  async function apagar(a: Alimento) {
    if (!window.confirm(`Apagar "${a.name}"? As dietas que já usam este alimento continuam como estão.`)) return;
    const { error } = await supabase.from("foods").delete().eq("id", a.id);
    if (error) return setErro("Não foi possível apagar o alimento.");
    setAlimentos((x) => x.filter((i) => i.id !== a.id));
  }

  async function apagarReferencia() {
    if (!window.confirm(`Apagar os ${aprox} alimentos de referência (valores aproximados)? Faça isso depois de importar a TACO. As dietas já montadas não mudam.`)) return;
    const { error } = await supabase.from("foods").delete().eq("source", "referencia");
    if (error) return setErro("Não foi possível apagar os alimentos de referência.");
    await carregar();
  }

  async function apagarImportados() {
    if (!window.confirm(`Apagar os ${importados} alimentos importados (TACO)? Use isto para refazer uma importação que saiu errada. As dietas já montadas não mudam.`)) return;
    const { error } = await supabase.from("foods").delete().eq("source", "taco");
    if (error) return setErro("Não foi possível apagar os alimentos importados.");
    setRelatorioCsv(null);
    await carregar();
  }

  async function importar(arquivo: File | undefined) {
    if (!arquivo) return;
    setImportando(true);
    setRelatorioCsv(null);
    try {
      const { alimentos: novos, erros } = lerCsvAlimentos(await lerTexto(arquivo));
      const existentes = new Set(alimentos.map((a) => a.name.trim().toLowerCase()));
      const aInserir = novos.filter((a, i, arr) => !existentes.has(a.name.trim().toLowerCase()) && arr.findIndex((o) => o.name.trim().toLowerCase() === a.name.trim().toLowerCase()) === i);
      const repetidos = novos.length - aInserir.length;
      let gravados = 0;
      for (let i = 0; i < aInserir.length; i += 200) {
        const lote = aInserir.slice(i, i + 200).map((a) => ({ ...a, source: "taco" }));
        const { error } = await supabase.from("foods").insert(lote);
        if (error) {
          erros.push(`Falha ao gravar a partir da linha ${i + 2}: ${error.message}`);
          break;
        }
        gravados += lote.length;
      }
      setRelatorioCsv([`${gravados} alimento(s) importado(s).`, ...(repetidos ? [`${repetidos} ignorado(s) por já existirem com o mesmo nome.`] : []), ...erros.slice(0, 10), ...(erros.length > 10 ? [`... e mais ${erros.length - 10} aviso(s).`] : [])]);
      await carregar();
    } finally {
      setImportando(false);
    }
  }

  const campo = (rotulo: string, k: keyof Form) => (
    <TextField label={rotulo} inputMode="decimal" value={form?.[k] ?? ""} onChange={(e) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f))} />
  );

  if (loading) return <Carregando />;

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Alimentos</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>{alimentos.length} alimento(s). Valores por 100 g. Eles alimentam o montador de dietas.</p>
        </div>
        <Button onClick={() => { setErroForm(null); setForm(vazio); }}>+ Novo alimento</Button>
      </div>

      <ErrorText>{erro}</ErrorText>

      <Card className="mb-6 p-5">
        <h2 className="mb-2 text-xl">Importar a TACO (CSV)</h2>
        <p className="mb-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Use a Tabela Brasileira de Composição de Alimentos (NEPA/Unicamp) salva como <strong>CSV</strong>. Serve a planilha completa da TACO (colunas <em>Descrição dos alimentos, Energia (kcal), Proteína, Lipídeos, Carboidrato, Fibra</em> e as demais são ignoradas) ou uma planilha simples com essas colunas. Valores &quot;Tr&quot; e &quot;NA&quot; viram zero. Nomes repetidos são ignorados.
        </p>
        <label className="inline-block cursor-pointer rounded-full px-5 py-2.5 text-sm font-semibold" style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}>
          {importando ? "Importando..." : "Escolher arquivo CSV"}
          <input type="file" accept=".csv,text/csv" className="sr-only" disabled={importando} onChange={(e) => { importar(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {importados > 0 && (
          <button type="button" onClick={apagarImportados} className="ml-3 text-sm font-semibold underline" style={{ color: "var(--color-danger)" }}>
            Apagar os {importados} importados (refazer importação)
          </button>
        )}
        {relatorioCsv && (
          <ul className="mt-3 text-sm" role="status">
            {relatorioCsv.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        )}
      </Card>

      {aprox > 0 && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 p-5" style={{ borderColor: "var(--gema)" }}>
          <p className="max-w-xl text-sm">
            <strong>{aprox} alimentos têm valores aproximados</strong> (lista de referência para testes). Não use para atender pacientes sem conferir. Depois de importar a TACO, apague-os.
          </p>
          <Button variant="outline" onClick={apagarReferencia}>Apagar referência</Button>
        </Card>
      )}

      <TextField label="Buscar alimento" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: feijão" containerClassName="mb-4" />

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              <th className="px-4 py-3 font-semibold">Alimento</th><th className="px-2 py-3 font-semibold">kcal</th><th className="px-2 py-3 font-semibold">P</th>
              <th className="px-2 py-3 font-semibold">L</th><th className="px-2 py-3 font-semibold">C</th><th className="px-2 py-3 font-semibold">Fibra</th><th className="px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {lista.map((a) => (
              <tr key={a.id} className="border-t" style={{ borderColor: "var(--color-border)" }}>
                <td className="px-4 py-2.5">
                  {a.name} <span className="ml-1 text-[11px]" style={{ color: "var(--color-text-muted)" }}>{ORIGEM[a.source] ?? a.source}</span>
                </td>
                <td className="px-2 py-2.5">{a.kcal}</td><td className="px-2 py-2.5">{a.protein_g}</td><td className="px-2 py-2.5">{a.fat_g}</td>
                <td className="px-2 py-2.5">{a.carb_g}</td><td className="px-2 py-2.5">{a.fiber_g}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right">
                  <button type="button" onClick={() => { setErroForm(null); setForm({ id: a.id, name: a.name, kcal: String(a.kcal), protein_g: String(a.protein_g), fat_g: String(a.fat_g), carb_g: String(a.carb_g), fiber_g: String(a.fiber_g) }); }} className="mr-3 text-xs font-semibold underline">Editar</button>
                  <button type="button" onClick={() => apagar(a)} className="text-xs font-semibold" style={{ color: "var(--color-danger)" }}>Apagar</button>
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: "var(--color-text-muted)" }}>{alimentos.length === 0 ? "Nenhum alimento ainda. Importe a TACO ou cadastre o primeiro." : "Nada encontrado."}</td></tr>
            )}
          </tbody>
        </table>
      </Card>
      {!busca.trim() && alimentos.length > 100 && <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>Mostrando os 100 primeiros. Use a busca para ver os demais.</p>}
      {aviso && <p className="mt-2 text-sm">{aviso}</p>}

      <Modal aberto={form != null} aoFechar={() => setForm(null)} titulo={form?.id ? "Editar alimento" : "Novo alimento"}>
        <form onSubmit={salvar}>
          <TextField label="Nome" required value={form?.name ?? ""} onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))} placeholder="Ex.: Arroz, integral, cozido" />
          <p className="mb-2 text-xs" style={{ color: "var(--color-text-muted)" }}>Valores por 100 g do alimento.</p>
          <div className="grid grid-cols-2 gap-x-3">
            {campo("Energia (kcal)", "kcal")}{campo("Proteína (g)", "protein_g")}{campo("Lipídios (g)", "fat_g")}{campo("Carboidratos (g)", "carb_g")}{campo("Fibra (g)", "fiber_g")}
          </div>
          <ErrorText>{erroForm}</ErrorText>
          <Button type="submit">Salvar</Button>
        </form>
      </Modal>
    </div>
  );
}
