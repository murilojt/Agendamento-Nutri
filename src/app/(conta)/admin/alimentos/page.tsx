"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CATEGORIAS_BASICAS, buscarAlimentos, lerArquivoAlimentos, normaliza, resumoPorCategoria, type Alimento, type LeituraAlimentos } from "@/lib/nutricao";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Carregando } from "@/components/ui/Carregando";
import { ErrorText } from "@/components/ui/ErrorText";
import { TextField } from "@/components/ui/TextField";
import { Modal } from "@/components/dieta/Modal";

const num = (v: unknown) => (v == null ? 0 : Number(v));
type Form = { id: string | null; name: string; kcal: string; protein_g: string; fat_g: string; carb_g: string; fiber_g: string };
const vazio: Form = { id: null, name: "", kcal: "", protein_g: "", fat_g: "", carb_g: "", fiber_g: "" };
const ORIGEM: Record<string, string> = { taco: "TACO", tbca: "TBCA", referencia: "Referência (aprox.)", custom: "Cadastrado" };
const SELECT_ALIMENTO = "id, name, source, category, favorite, kcal, protein_g, fat_g, carb_g, fiber_g";

/** Lê o arquivo como UTF-8; se não for (Excel antigo salva em Windows-1252), lê nessa codificação para não quebrar os acentos. */
async function lerTexto(arquivo: File): Promise<string> {
  const bytes = await arquivo.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

type Previa = LeituraAlimentos & { arquivo: string; categorias: { categoria: string; quantidade: number }[]; selecionadas: Set<string> };

export default function AlimentosPage() {
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [soFavoritos, setSoFavoritos] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [progresso, setProgresso] = useState<string | null>(null);
  const [relatorio, setRelatorio] = useState<string[] | null>(null);

  const carregar = useCallback(async () => {
    const todos: Alimento[] = [];
    for (let de = 0; de < 30000; de += 1000) {
      let pagina: Record<string, unknown>[] | null;
      let falha: unknown;
      const completa = await supabase.from("foods").select(SELECT_ALIMENTO).order("name").range(de, de + 999);
      pagina = completa.data as Record<string, unknown>[] | null;
      falha = completa.error;
      if (falha) {
        // banco ainda sem o patch 08 (categoria e favorito): carrega sem essas colunas
        const basica = await supabase.from("foods").select("id, name, source, kcal, protein_g, fat_g, carb_g, fiber_g").order("name").range(de, de + 999);
        pagina = basica.data as Record<string, unknown>[] | null;
        falha = basica.error;
      }
      if (falha) {
        setErro("Não foi possível carregar os alimentos. Confirme que o patch SQL 06 foi aplicado no Supabase.");
        break;
      }
      todos.push(...(pagina ?? []).map((r) => ({ id: String(r.id), name: String(r.name), source: String(r.source), category: (r.category as string | null) ?? null, favorite: Boolean(r.favorite), kcal: num(r.kcal), protein_g: num(r.protein_g), fat_g: num(r.fat_g), carb_g: num(r.carb_g), fiber_g: num(r.fiber_g) })));
      if ((pagina?.length ?? 0) < 1000) break;
    }
    setAlimentos(todos);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const categoriasExistentes = useMemo(() => [...new Set(alimentos.map((a) => a.category).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, "pt-BR")), [alimentos]);
  const porOrigem = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of alimentos) m.set(a.source, (m.get(a.source) ?? 0) + 1);
    return m;
  }, [alimentos]);

  const lista = useMemo(() => {
    let base = alimentos;
    if (categoria) base = base.filter((a) => a.category === categoria);
    if (soFavoritos) base = base.filter((a) => a.favorite);
    return busca.trim() ? buscarAlimentos(base, busca, 100, (a) => (a.favorite ? 1 : 0)) : base.slice(0, 100);
  }, [alimentos, busca, categoria, soFavoritos]);

  /* ---------- cadastro manual ---------- */
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

  async function alternarFavorito(a: Alimento) {
    const novo = !a.favorite;
    setAlimentos((x) => x.map((i) => (i.id === a.id ? { ...i, favorite: novo } : i)));
    const { error } = await supabase.from("foods").update({ favorite: novo }).eq("id", a.id);
    if (error) {
      setAlimentos((x) => x.map((i) => (i.id === a.id ? { ...i, favorite: !novo } : i)));
      setErro("Não foi possível marcar como favorito. Rode o patch SQL 08 no Supabase.");
    }
  }

  async function apagarOrigem(origem: string) {
    const n = porOrigem.get(origem) ?? 0;
    const nome = ORIGEM[origem] ?? origem;
    const msg = origem === "referencia" ? `Apagar os ${n} alimentos de referência (valores aproximados)?` : `Apagar os ${n} alimentos importados da ${nome}? Use isto para refazer uma importação. Favoritos marcados nesses alimentos também serão apagados.`;
    if (!window.confirm(`${msg} As dietas já montadas não mudam.`)) return;
    const { error } = await supabase.from("foods").delete().eq("source", origem);
    if (error) return setErro(`Não foi possível apagar os alimentos (${nome}).`);
    setRelatorio(null);
    setPrevia(null);
    await carregar();
  }

  /* ---------- importação: 1) ler e mostrar o que há no arquivo; 2) importar as categorias escolhidas ---------- */
  async function lerArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    setLendo(true);
    setRelatorio(null);
    setPrevia(null);
    try {
      const leitura = lerArquivoAlimentos(await lerTexto(arquivo));
      if (leitura.alimentos.length === 0) return setRelatorio([...leitura.erros, ...leitura.avisos]);
      const categorias = resumoPorCategoria(leitura.alimentos);
      const semCategoria = categorias.length === 1 && categorias[0].categoria === "Sem categoria";
      setPrevia({ ...leitura, arquivo: arquivo.name, categorias: semCategoria ? [] : categorias, selecionadas: new Set(categorias.map((c) => c.categoria)) });
    } catch {
      setRelatorio(["Não foi possível ler o arquivo."]);
    } finally {
      setLendo(false);
    }
  }

  const escolhidos = useMemo(() => {
    if (!previa) return [];
    const existentes = new Set(alimentos.map((a) => a.name.trim().toLowerCase()));
    return previa.alimentos.filter((a) => previa.selecionadas.has(a.category?.trim() || "Sem categoria") && !existentes.has(a.name.trim().toLowerCase()));
  }, [previa, alimentos]);

  const marcar = (fn: (atual: Set<string>) => Set<string>) => setPrevia((p) => (p ? { ...p, selecionadas: fn(p.selecionadas) } : p));

  async function importar() {
    if (!previa) return;
    const origem = previa.origem;
    const jaExistiam = previa.alimentos.filter((a) => previa.selecionadas.has(a.category?.trim() || "Sem categoria")).length - escolhidos.length;
    let gravados = 0;
    let semColunaCategoria = false;
    const erros = [...previa.erros];
    for (let i = 0; i < escolhidos.length; i += 200) {
      setProgresso(`Importando ${Math.min(i + 200, escolhidos.length).toLocaleString("pt-BR")} de ${escolhidos.length.toLocaleString("pt-BR")}...`);
      const lote = escolhidos.slice(i, i + 200);
      const comCategoria = lote.map(({ name, category, kcal, protein_g, fat_g, carb_g, fiber_g }) => ({ name, source: origem, kcal, protein_g, fat_g, carb_g, fiber_g, ...(category ? { category } : {}) }));
      let { error } = await supabase.from("foods").insert(comCategoria);
      if (error && !semColunaCategoria && /category|column/i.test(error.message ?? "")) {
        // banco sem o patch 08: grava sem a categoria e avisa
        semColunaCategoria = true;
        ({ error } = await supabase.from("foods").insert(comCategoria.map(({ category: _c, ...resto }) => resto)));
      } else if (error && semColunaCategoria) {
        ({ error } = await supabase.from("foods").insert(comCategoria.map(({ category: _c, ...resto }) => resto)));
      }
      if (error) {
        erros.push(`Falha ao gravar a partir do alimento ${i + 1}: ${error.message}`);
        break;
      }
      gravados += lote.length;
    }
    setProgresso(null);
    setPrevia(null);
    setRelatorio([
      `${gravados.toLocaleString("pt-BR")} alimento(s) importado(s).`,
      ...(jaExistiam > 0 ? [`${jaExistiam.toLocaleString("pt-BR")} ignorado(s) por já existirem com o mesmo nome.`] : []),
      ...(semColunaCategoria ? ["As categorias não foram salvas: rode o patch SQL 08 no Supabase e importe de novo se quiser filtrar por categoria."] : []),
      ...previa.avisos,
      ...erros.slice(0, 10),
    ]);
    await carregar();
  }

  const campo = (rotulo: string, k: keyof Form) => (
    <TextField label={rotulo} inputMode="decimal" value={form?.[k] ?? ""} onChange={(e) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f))} />
  );

  if (loading) return <Carregando />;

  const aprox = porOrigem.get("referencia") ?? 0;
  const favoritos = alimentos.filter((a) => a.favorite).length;
  const basicas = previa ? previa.categorias.filter((c) => CATEGORIAS_BASICAS.some((b) => normaliza(b) === normaliza(c.categoria))).map((c) => c.categoria) : [];

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Alimentos</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            {alimentos.length.toLocaleString("pt-BR")} alimento(s), {favoritos} favorito(s). Valores por 100 g. Eles alimentam o montador de dietas.
          </p>
        </div>
        <Button onClick={() => { setErroForm(null); setForm(vazio); }}>+ Novo alimento</Button>
      </div>

      <ErrorText>{erro}</ErrorText>

      <Card className="mb-6 p-5">
        <h2 className="mb-2 text-xl">Importar tabela de alimentos</h2>
        <p className="mb-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Aceita a <strong>TBCA</strong> (arquivo <em>.txt/.json</em> com um alimento por linha) e a <strong>TACO</strong> ou planilhas simples em <strong>CSV</strong> (colunas <em>Descrição, Energia (kcal), Proteína, Lipídeos, Carboidrato, Fibra</em>). &quot;Tr&quot; e &quot;NA&quot; viram zero; nomes repetidos são ignorados. Confira os termos de uso da tabela antes de importar.
        </p>
        <label className="inline-block cursor-pointer rounded-full px-5 py-2.5 text-sm font-semibold" style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}>
          {lendo ? "Lendo arquivo..." : "Escolher arquivo"}
          <input type="file" accept=".csv,.txt,.json,text/csv,text/plain,application/json" className="sr-only" disabled={lendo || progresso != null} onChange={(e) => { lerArquivo(e.target.files?.[0]); e.target.value = ""; }} />
        </label>

        {previa && (
          <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--fundo-alt)" }} role="region" aria-label="Prévia da importação">
            <p className="font-semibold">
              {previa.alimentos.length.toLocaleString("pt-BR")} alimentos encontrados em {previa.arquivo}
              {previa.categorias.length > 0 && ` (${previa.categorias.length} categorias)`}.
            </p>
            {previa.avisos.map((a, i) => <p key={i} className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>{a}</p>)}
            {previa.erros.map((a, i) => <p key={i} className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>{a}</p>)}

            {previa.categorias.length > 0 && (
              <>
                <p className="mb-2 mt-4 text-sm font-semibold">Quais categorias importar?</p>
                <div className="mb-3 flex flex-wrap gap-2 text-xs font-semibold">
                  <button type="button" className="rounded-full border px-3 py-1" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }} onClick={() => marcar(() => new Set(previa.categorias.map((c) => c.categoria)))}>Todas</button>
                  {basicas.length > 0 && (
                    <button type="button" className="rounded-full border px-3 py-1" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }} onClick={() => marcar(() => new Set(basicas))}>Só alimentos do dia a dia</button>
                  )}
                  <button type="button" className="rounded-full border px-3 py-1" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }} onClick={() => marcar(() => new Set())}>Nenhuma</button>
                </div>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {previa.categorias.map((c) => (
                    <li key={c.categoria}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-[var(--color-surface)]">
                        <input
                          type="checkbox"
                          checked={previa.selecionadas.has(c.categoria)}
                          onChange={(e) => marcar((s) => { const n = new Set(s); if (e.target.checked) n.add(c.categoria); else n.delete(c.categoria); return n; })}
                        />
                        <span className="flex-1">{c.categoria}</span>
                        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{c.quantidade.toLocaleString("pt-BR")}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button onClick={importar} disabled={escolhidos.length === 0 || progresso != null}>
                {progresso ?? `Importar ${escolhidos.length.toLocaleString("pt-BR")} alimento(s)`}
              </Button>
              <button type="button" onClick={() => setPrevia(null)} disabled={progresso != null} className="text-sm font-semibold underline">Cancelar</button>
              {escolhidos.length === 0 && <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Nada novo nas categorias marcadas.</span>}
            </div>
          </div>
        )}

        {relatorio && (
          <ul className="mt-3 text-sm" role="status">
            {relatorio.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        )}

        {(["taco", "tbca"] as const).filter((o) => (porOrigem.get(o) ?? 0) > 0).map((o) => (
          <button key={o} type="button" onClick={() => apagarOrigem(o)} className="mr-4 mt-3 text-sm font-semibold underline" style={{ color: "var(--color-danger)" }}>
            Apagar os {porOrigem.get(o)} importados da {ORIGEM[o]} (refazer importação)
          </button>
        ))}
      </Card>

      {aprox > 0 && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 p-5" style={{ borderColor: "var(--gema)" }}>
          <p className="max-w-xl text-sm">
            <strong>{aprox} alimentos têm valores aproximados</strong> (lista de referência para testes). Não use para atender pacientes sem conferir. Depois de importar uma tabela oficial, apague-os.
          </p>
          <Button variant="outline" onClick={() => apagarOrigem("referencia")}>Apagar referência</Button>
        </Card>
      )}

      <Card className="mb-4 p-4">
        <p className="mb-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Marque com <strong>★</strong> os alimentos do seu dia a dia (arroz, feijão, frango...). Na hora de montar a dieta, os favoritos e os mais usados aparecem primeiro na busca.
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
          <TextField label="Buscar alimento" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: feijão" containerClassName="" />
          <div>
            <label htmlFor="cat" className="mb-1 block text-sm font-medium">Categoria</label>
            <select id="cat" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full rounded-2xl border px-3 py-3" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
              <option value="">Todas</option>
              {categoriasExistentes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={soFavoritos} onChange={(e) => setSoFavoritos(e.target.checked)} /> Só favoritos
        </label>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              <th className="w-10 px-3 py-3 font-semibold"><span className="sr-only">Favorito</span></th><th className="px-2 py-3 font-semibold">Alimento</th><th className="px-2 py-3 font-semibold">kcal</th><th className="px-2 py-3 font-semibold">P</th>
              <th className="px-2 py-3 font-semibold">L</th><th className="px-2 py-3 font-semibold">C</th><th className="px-2 py-3 font-semibold">Fibra</th><th className="px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {lista.map((a) => (
              <tr key={a.id} className="border-t" style={{ borderColor: "var(--color-border)" }}>
                <td className="px-3 py-2.5">
                  <button type="button" onClick={() => alternarFavorito(a)} aria-pressed={!!a.favorite} aria-label={a.favorite ? `Tirar ${a.name} dos favoritos` : `Marcar ${a.name} como favorito`} className="text-lg leading-none" style={{ color: a.favorite ? "var(--gema)" : "var(--color-border)" }}>
                    ★
                  </button>
                </td>
                <td className="px-2 py-2.5">
                  <span className="break-words">{a.name}</span>{" "}
                  <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{ORIGEM[a.source] ?? a.source}{a.category ? ` · ${a.category}` : ""}</span>
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
              <tr><td colSpan={8} className="px-4 py-8 text-center" style={{ color: "var(--color-text-muted)" }}>{alimentos.length === 0 ? "Nenhum alimento ainda. Importe uma tabela ou cadastre o primeiro." : "Nada encontrado."}</td></tr>
            )}
          </tbody>
        </table>
      </Card>
      {!busca.trim() && !categoria && !soFavoritos && alimentos.length > 100 && <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>Mostrando os 100 primeiros. Use a busca ou a categoria para ver os demais.</p>}

      <Modal aberto={form != null} aoFechar={() => setForm(null)} titulo={form?.id ? "Editar alimento" : "Novo alimento"}>
        <form onSubmit={salvar}>
          <TextField label="Nome" required value={form?.name ?? ""} onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))} placeholder="Ex.: Arroz branco cozido" />
          <p className="mb-2 text-xs" style={{ color: "var(--color-text-muted)" }}>Valores por 100 g do alimento. Dica: você pode renomear qualquer alimento importado para um nome mais curto.</p>
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
