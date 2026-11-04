"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ItemRefeicao } from "@/lib/nutricao";
import type { Registro } from "@/lib/evolucao";
import { num as numOuNull } from "@/lib/evolucao";

export type PerfilPaciente = { id: string; full_name: string | null; birth_date: string | null; weight_kg: number | null; height_cm: number | null; nutritionist_id: string | null };
export type DietaPaciente = {
  id: string; title: string; objective: string | null; supplements: string | null; recipes: string | null;
  target_kcal: number | null; target_protein_gkg: number | null; target_fat_gkg: number | null; target_carb_gkg: number | null;
};
export type RefeicaoPaciente = { id: string; diet_id: string; meal_name: string; meal_time: string | null; notes: string | null; position: number };
export type SubstitutoPaciente = { item_id: string; name: string; quantity_g: number; position: number };

const n = (v: unknown) => (v == null ? 0 : Number(v));

/** Carrega a dieta ativa do paciente logado, com refeições, alimentos, substitutos e medições (para o PDF). */
export function useDietaDoPaciente() {
  const [perfil, setPerfil] = useState<PerfilPaciente | null>(null);
  const [dieta, setDieta] = useState<DietaPaciente | null>(null);
  const [refeicoes, setRefeicoes] = useState<RefeicaoPaciente[]>([]);
  const [itens, setItens] = useState<ItemRefeicao[]>([]);
  const [substitutos, setSubstitutos] = useState<SubstitutoPaciente[]>([]);
  const [medicoes, setMedicoes] = useState<Registro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: p } = await supabase.from("profiles").select("id, full_name, birth_date, weight_kg, height_cm, nutritionist_id").eq("id", user.id).maybeSingle();
      setPerfil(p ? { ...p, weight_kg: p.weight_kg == null ? null : Number(p.weight_kg), height_cm: p.height_cm == null ? null : Number(p.height_cm) } : null);

      const { data: d, error: dErro } = await supabase.from("diets")
        .select("id, title, objective, supplements, recipes, target_kcal, target_protein_gkg, target_fat_gkg, target_carb_gkg")
        .eq("patient_id", user.id).eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (dErro) throw dErro;
      if (!d) { setDieta(null); setRefeicoes([]); setItens([]); setSubstitutos([]); return; }
      setDieta({ ...d, target_kcal: numOuNull(d.target_kcal), target_protein_gkg: numOuNull(d.target_protein_gkg), target_fat_gkg: numOuNull(d.target_fat_gkg), target_carb_gkg: numOuNull(d.target_carb_gkg) });

      const { data: ms, error: mErro } = await supabase.from("meals").select("id, diet_id, meal_name, meal_time, notes, position").eq("diet_id", d.id).order("position", { ascending: true });
      if (mErro) throw mErro;
      const refs = (ms ?? []).map((m) => ({ ...m, position: n(m.position) }));
      setRefeicoes(refs);

      if (refs.length === 0) { setItens([]); setSubstitutos([]); return; }
      const base = "id, meal_id, food_id, name, quantity_g, kcal, protein_g, fat_g, carb_g, fiber_g, position";
      const comUnidades = await supabase.from("meal_items").select(`${base}, unit_name, unit_plural, unit_grams, unit_qty`).in("meal_id", refs.map((m) => m.id)).order("position", { ascending: true });
      // Sem o patch SQL 15 não há medidas caseiras: lê só gramas
      const lidoItens = comUnidades.error ? await supabase.from("meal_items").select(base).in("meal_id", refs.map((m) => m.id)).order("position", { ascending: true }) : comUnidades;
      if (lidoItens.error) throw lidoItens.error;
      const its = lidoItens.data as unknown as Record<string, unknown>[] | null;
      const lidos: ItemRefeicao[] = (its ?? []).map((i) => ({
        id: String(i.id), meal_id: String(i.meal_id), food_id: (i.food_id as string | null) ?? null, name: String(i.name), quantity_g: n(i.quantity_g), kcal: n(i.kcal), protein_g: n(i.protein_g), fat_g: n(i.fat_g), carb_g: n(i.carb_g), fiber_g: n(i.fiber_g), position: n(i.position),
        unit_name: (i.unit_name as string | null | undefined) ?? null, unit_plural: (i.unit_plural as string | null | undefined) ?? null,
        unit_grams: i.unit_grams == null ? null : Number(i.unit_grams), unit_qty: i.unit_qty == null ? null : Number(i.unit_qty),
      }));
      setItens(lidos);

      // Substitutos (patch SQL 11) e medições (patch SQL 12): se faltarem, só não aparecem
      if (lidos.length) {
        const { data: subs } = await supabase.from("meal_item_substitutes").select("item_id, name, quantity_g, position").in("item_id", lidos.map((i) => i.id)).order("position", { ascending: true });
        setSubstitutos((subs ?? []).map((s) => ({ ...s, quantity_g: n(s.quantity_g), position: n(s.position) })));
      } else setSubstitutos([]);
      const { data: med } = await supabase.from("patient_measurements").select("id, measured_on, weight_kg, body_fat_pct, waist_cm, hip_cm, notes").eq("patient_id", user.id).order("measured_on", { ascending: true });
      setMedicoes((med ?? []).map((r) => ({ id: String(r.id), measured_on: String(r.measured_on), weight_kg: numOuNull(r.weight_kg), body_fat_pct: numOuNull(r.body_fat_pct), waist_cm: numOuNull(r.waist_cm), hip_cm: numOuNull(r.hip_cm), notes: r.notes ?? null })));
    } catch (e) {
      console.error(e);
      setErro("Não foi possível carregar a sua dieta. Verifique sua internet e tente de novo.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { perfil, dieta, refeicoes, itens, substitutos, medicoes, carregando, erro };
}
