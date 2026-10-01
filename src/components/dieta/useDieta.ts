"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { macrosDaPorcao, reescalar, somar, type Alimento, type ItemRefeicao, type Macros } from "@/lib/nutricao";
import type { Anamnese, Dieta, Favorita, ItemFavorito, Paciente, Refeicao } from "./tipos";

const CAMPOS_ITEM = "id, meal_id, food_id, name, quantity_g, kcal, protein_g, fat_g, carb_g, fiber_g, position";
const num = (v: unknown) => (v == null ? 0 : Number(v));

/** Normaliza números que o PostgREST pode devolver como texto (colunas numeric). */
const item = (r: Record<string, unknown>): ItemRefeicao => ({
  id: String(r.id), meal_id: String(r.meal_id), food_id: (r.food_id as string | null) ?? null, name: String(r.name),
  quantity_g: num(r.quantity_g), kcal: num(r.kcal), protein_g: num(r.protein_g), fat_g: num(r.fat_g), carb_g: num(r.carb_g),
  fiber_g: num(r.fiber_g), position: num(r.position),
});
const alimento = (r: Record<string, unknown>): Alimento => ({
  id: String(r.id), name: String(r.name), source: String(r.source), kcal: num(r.kcal), protein_g: num(r.protein_g),
  fat_g: num(r.fat_g), carb_g: num(r.carb_g), fiber_g: num(r.fiber_g), category: (r.category as string | null) ?? null, favorite: Boolean(r.favorite),
});
const opt = (v: unknown) => (v == null ? null : Number(v));

/** Todo o estado e as ações do montador de dietas de um paciente. */
export function useDieta(patientId: string) {
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [dieta, setDieta] = useState<Dieta | null>(null);
  const [refeicoes, setRefeicoes] = useState<Refeicao[]>([]);
  const [itens, setItens] = useState<ItemRefeicao[]>([]);
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [uso, setUso] = useState<Map<string, number>>(new Map());
  const [favoritas, setFavoritas] = useState<Favorita[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const falhou = useCallback((msg: string, e?: unknown) => {
    if (e) console.error(msg, e);
    setAviso(msg);
  }, []);

  const carregarRefeicoes = useCallback(async (dietId: string) => {
    const { data: ref, error } = await supabase.from("meals").select("id, diet_id, meal_name, meal_time, notes, position").eq("diet_id", dietId).order("position", { ascending: true });
    if (error) throw error;
    const lista: Refeicao[] = (ref ?? []).map((m) => ({ ...m, position: num(m.position) }));
    setRefeicoes(lista);
    if (lista.length === 0) return setItens([]);
    const { data: its, error: e2 } = await supabase.from("meal_items").select(CAMPOS_ITEM).in("meal_id", lista.map((m) => m.id)).order("position", { ascending: true });
    if (e2) throw e2;
    setItens((its ?? []).map(item));
  }, []);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      try {
        const { data: p, error: pe } = await supabase.from("profiles").select("id, full_name, email, phone, birth_date, weight_kg, height_cm").eq("id", patientId).single();
        if (pe || !p) throw new Error("Paciente não encontrado ou sem permissão de acesso.");
        if (cancelado) return;
        setPaciente({ ...p, weight_kg: opt(p.weight_kg), height_cm: opt(p.height_cm) });

        const { data: d, error: de } = await supabase
          .from("diets")
          .select("id, title, objective, target_kcal, target_protein_gkg, target_fat_gkg, target_carb_gkg, supplements, recipes")
          .eq("patient_id", patientId).eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (de) throw de;
        if (cancelado) return;
        if (d) {
          setDieta({ ...d, target_kcal: opt(d.target_kcal), target_protein_gkg: opt(d.target_protein_gkg), target_fat_gkg: opt(d.target_fat_gkg), target_carb_gkg: opt(d.target_carb_gkg) });
          await carregarRefeicoes(d.id);
        }

        // Banco de alimentos inteiro, em páginas de 1000 (limite do Supabase); a busca é feita no navegador
        const todos: Alimento[] = [];
        for (let de2 = 0; de2 < 20000; de2 += 1000) {
          const completa = await supabase.from("foods").select("id, name, source, kcal, protein_g, fat_g, carb_g, fiber_g, category, favorite").order("name").range(de2, de2 + 999);
          let a = completa.data as Record<string, unknown>[] | null;
          let ae: unknown = completa.error;
          // banco ainda sem o patch 08 (categoria e favorito): a busca funciona sem essas colunas
          if (ae) {
            const basica = await supabase.from("foods").select("id, name, source, kcal, protein_g, fat_g, carb_g, fiber_g").order("name").range(de2, de2 + 999);
            a = basica.data as Record<string, unknown>[] | null;
            ae = basica.error;
          }
          if (ae) throw ae;
          todos.push(...(a ?? []).map(alimento));
          if ((a?.length ?? 0) < 1000) break;
        }
        if (!cancelado) setAlimentos(todos);

        // Quantas vezes cada alimento já foi usado nas dietas (os mais usados aparecem primeiro na busca)
        const { data: usados } = await supabase.from("meal_items").select("food_id").order("created_at", { ascending: false }).limit(5000);
        const mapa = new Map<string, number>();
        for (const u of usados ?? []) if (u.food_id) mapa.set(u.food_id, (mapa.get(u.food_id) ?? 0) + 1);
        if (!cancelado) setUso(mapa);

        const { data: f } = await supabase.from("favorite_meals").select("id, name, meal_time, items").order("created_at", { ascending: false });
        if (!cancelado) setFavoritas((f ?? []) as Favorita[]);
      } catch (e) {
        console.error(e);
        if (!cancelado) setErroGeral(e instanceof Error && e.message.startsWith("Paciente") ? e.message : "Não foi possível carregar a dieta. Confirme que o patch SQL 06 foi aplicado no Supabase.");
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [patientId, carregarRefeicoes]);

  /* ---------- derivados ---------- */
  const itensPorRefeicao = useMemo(() => {
    const m = new Map<string, ItemRefeicao[]>();
    for (const i of itens) m.set(i.meal_id, [...(m.get(i.meal_id) ?? []), i]);
    return m;
  }, [itens]);
  const totalDia: Macros = useMemo(() => somar(itens), [itens]);
  const massaTotal = useMemo(() => itens.reduce((s, i) => s + i.quantity_g, 0), [itens]);

  /* ---------- dieta ---------- */
  const criarDieta = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("diets").insert({ patient_id: patientId, created_by: user.id, title: "Plano alimentar", active: true })
      .select("id, title, objective, target_kcal, target_protein_gkg, target_fat_gkg, target_carb_gkg, supplements, recipes").single();
    if (error || !data) return falhou("Não foi possível criar a dieta.", error);
    setDieta({ ...data, target_kcal: null, target_protein_gkg: null, target_fat_gkg: null, target_carb_gkg: null });
    setRefeicoes([]);
    setItens([]);
  };

  const salvarDieta = async (patch: Partial<Omit<Dieta, "id">>) => {
    if (!dieta) return false;
    const { error } = await supabase.from("diets").update(patch).eq("id", dieta.id);
    if (error) return falhou("Não foi possível salvar.", error), false;
    setDieta({ ...dieta, ...patch });
    return true;
  };

  const salvarPaciente = async (patch: Partial<Pick<Paciente, "full_name" | "phone" | "birth_date" | "weight_kg" | "height_cm">>) => {
    const { error } = await supabase.from("profiles").update(patch).eq("id", patientId);
    if (error) return falhou("Não foi possível salvar os dados do paciente.", error), false;
    setPaciente((p) => (p ? { ...p, ...patch } : p));
    return true;
  };

  /* ---------- refeições ---------- */
  const inserirRefeicao = async (dados: { meal_name: string; meal_time: string | null; notes?: string | null }, posicao: number) => {
    if (!dieta) return null;
    const { data, error } = await supabase.from("meals").insert({ diet_id: dieta.id, meal_name: dados.meal_name, meal_time: dados.meal_time, notes: dados.notes ?? null, description: "", position: posicao })
      .select("id, diet_id, meal_name, meal_time, notes, position").single();
    if (error || !data) return falhou("Não foi possível criar a refeição.", error), null;
    return { ...data, position: num(data.position) } as Refeicao;
  };

  const inserirItens = async (mealId: string, lista: (Macros & { food_id: string | null; name: string; quantity_g: number })[]) => {
    if (lista.length === 0) return [];
    const linhas = lista.map((l, i) => ({ meal_id: mealId, food_id: l.food_id, name: l.name, quantity_g: l.quantity_g, kcal: l.kcal, protein_g: l.protein_g, fat_g: l.fat_g, carb_g: l.carb_g, fiber_g: l.fiber_g, position: i }));
    const { data, error } = await supabase.from("meal_items").insert(linhas).select(CAMPOS_ITEM);
    if (error) return falhou("Não foi possível salvar os alimentos.", error), [];
    return (data ?? []).map(item);
  };

  const novaRefeicao = async () => {
    const r = await inserirRefeicao({ meal_name: "Nova refeição", meal_time: null }, refeicoes.length);
    if (r) setRefeicoes((x) => [...x, r]);
    return r?.id ?? null;
  };

  const atualizarRefeicao = async (id: string, patch: Partial<Pick<Refeicao, "meal_name" | "meal_time" | "notes">>) => {
    const anterior = refeicoes;
    setRefeicoes((x) => x.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    const { error } = await supabase.from("meals").update(patch).eq("id", id);
    if (error) {
      setRefeicoes(anterior);
      falhou("Não foi possível salvar a refeição.", error);
    }
  };

  const removerRefeicao = async (id: string) => {
    const { error } = await supabase.from("meals").delete().eq("id", id);
    if (error) return falhou("Não foi possível remover a refeição.", error);
    setRefeicoes((x) => x.filter((m) => m.id !== id));
    setItens((x) => x.filter((i) => i.meal_id !== id));
  };

  const reordenar = async (idsNaOrdem: string[]) => {
    const mapa = new Map(refeicoes.map((m) => [m.id, m]));
    const nova = idsNaOrdem.map((id, p) => ({ ...mapa.get(id)!, position: p }));
    setRefeicoes(nova);
    const resultados = await Promise.all(nova.map((m) => supabase.from("meals").update({ position: m.position }).eq("id", m.id)));
    if (resultados.some((r) => r.error)) falhou("A nova ordem não foi salva por completo. Recarregue a página para conferir.");
  };

  const ordenarPorHorario = () => {
    const ord = [...refeicoes].sort((a, b) => (a.meal_time ?? "99:99").localeCompare(b.meal_time ?? "99:99") || a.position - b.position);
    return reordenar(ord.map((m) => m.id));
  };

  const duplicarRefeicao = async (id: string) => {
    const origem = refeicoes.find((m) => m.id === id);
    if (!origem) return;
    const r = await inserirRefeicao({ meal_name: `${origem.meal_name} (cópia)`, meal_time: origem.meal_time, notes: origem.notes }, refeicoes.length);
    if (!r) return;
    const novos = await inserirItens(r.id, itensPorRefeicao.get(id) ?? []);
    setRefeicoes((x) => [...x, r]);
    setItens((x) => [...x, ...novos]);
  };

  /* ---------- alimentos da refeição ---------- */
  const adicionarAlimento = async (mealId: string, a: Alimento, gramas = 100) => {
    const m = macrosDaPorcao(a, gramas);
    const [novo] = await inserirItens(mealId, [{ food_id: a.id, name: a.name, quantity_g: gramas, ...m }]);
    if (novo) {
      // a posição certa é o fim da lista da refeição
      const pos = (itensPorRefeicao.get(mealId)?.length ?? 0);
      novo.position = pos;
      setItens((x) => [...x, novo]);
      setUso((u) => new Map(u).set(a.id, (u.get(a.id) ?? 0) + 1));
      void supabase.from("meal_items").update({ position: pos }).eq("id", novo.id);
    }
    return novo?.id ?? null;
  };

  const mudarQuantidade = async (itemId: string, gramas: number) => {
    const atual = itens.find((i) => i.id === itemId);
    if (!atual || !(gramas > 0) || gramas === atual.quantity_g) return;
    const novos = { quantity_g: gramas, ...reescalar(atual, gramas) };
    const anterior = itens;
    setItens((x) => x.map((i) => (i.id === itemId ? { ...i, ...novos } : i)));
    const { error } = await supabase.from("meal_items").update(novos).eq("id", itemId);
    if (error) {
      setItens(anterior);
      falhou("Não foi possível salvar a quantidade.", error);
    }
  };

  const removerAlimento = async (itemId: string) => {
    const { error } = await supabase.from("meal_items").delete().eq("id", itemId);
    if (error) return falhou("Não foi possível remover o alimento.", error);
    setItens((x) => x.filter((i) => i.id !== itemId));
  };

  /* ---------- favoritas ---------- */
  const favoritar = async (mealId: string) => {
    const m = refeicoes.find((r) => r.id === mealId);
    if (!m) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const lista: ItemFavorito[] = (itensPorRefeicao.get(mealId) ?? []).map(({ food_id, name, quantity_g, kcal, protein_g, fat_g, carb_g, fiber_g }) => ({ food_id, name, quantity_g, kcal, protein_g, fat_g, carb_g, fiber_g }));
    const { data, error } = await supabase.from("favorite_meals").insert({ nutritionist_id: user.id, name: m.meal_name, meal_time: m.meal_time, items: lista }).select("id, name, meal_time, items").single();
    if (error || !data) return falhou("Não foi possível salvar nas favoritas.", error);
    setFavoritas((f) => [data as Favorita, ...f]);
    setAviso(`"${m.meal_name}" foi salva nas refeições favoritas.`);
  };

  const usarFavorita = async (fav: Favorita) => {
    const r = await inserirRefeicao({ meal_name: fav.name, meal_time: fav.meal_time }, refeicoes.length);
    if (!r) return;
    const novos = await inserirItens(r.id, fav.items.map((i) => ({ ...i, kcal: num(i.kcal), protein_g: num(i.protein_g), fat_g: num(i.fat_g), carb_g: num(i.carb_g), fiber_g: num(i.fiber_g), quantity_g: num(i.quantity_g) })));
    setRefeicoes((x) => [...x, r]);
    setItens((x) => [...x, ...novos]);
  };

  const apagarFavorita = async (id: string) => {
    const { error } = await supabase.from("favorite_meals").delete().eq("id", id);
    if (error) return falhou("Não foi possível apagar a favorita.", error);
    setFavoritas((f) => f.filter((x) => x.id !== id));
  };

  /* ---------- anamnese ---------- */
  const lerAnamnese = async (): Promise<Anamnese> => {
    const { data } = await supabase.from("anamneses").select("main_complaint, health_history, medications, allergies, habits, goals").eq("patient_id", patientId).maybeSingle();
    const v = (s: string | null | undefined) => s ?? "";
    return { main_complaint: v(data?.main_complaint), health_history: v(data?.health_history), medications: v(data?.medications), allergies: v(data?.allergies), habits: v(data?.habits), goals: v(data?.goals) };
  };

  const salvarAnamnese = async (a: Anamnese) => {
    const { error } = await supabase.from("anamneses").upsert({ patient_id: patientId, ...a, updated_at: new Date().toISOString() }, { onConflict: "patient_id" });
    if (error) return falhou("Não foi possível salvar a anamnese.", error), false;
    return true;
  };

  return {
    paciente, dieta, refeicoes, itens, itensPorRefeicao, alimentos, uso, favoritas, totalDia, massaTotal, carregando, erroGeral, aviso, limparAviso: () => setAviso(null),
    criarDieta, salvarDieta, salvarPaciente, novaRefeicao, atualizarRefeicao, removerRefeicao, reordenar, ordenarPorHorario, duplicarRefeicao,
    adicionarAlimento, mudarQuantidade, removerAlimento, favoritar, usarFavorita, apagarFavorita, lerAnamnese, salvarAnamnese,
  };
}
