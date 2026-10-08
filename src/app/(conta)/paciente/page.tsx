"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Carregando } from "@/components/ui/Carregando";
import { ErrorText } from "@/components/ui/ErrorText";
import { dataHora } from "@/lib/formatar";

type Refeicao = { id: string; meal_name: string; meal_time: string | null; description: string; notes: string | null };
type Item = { id: string; meal_id: string; name: string; quantity_g: number; kcal: number };
type Substituto = { item_id: string; name: string; quantity_g: number };
type DietaInfo = { title: string; objective: string | null; supplements: string | null; recipes: string | null };
type Mensagem = { id: string; body: string; read: boolean; created_at: string };
type Consulta = { id: string; starts_at: string; status: string };

const hora = (t: string | null) => (t ? t.slice(0, 5) : null);

export default function PacientePage() {
  const [refeicoes, setRefeicoes] = useState<Refeicao[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [substitutos, setSubstitutos] = useState<Substituto[]>([]);
  const [dietaInfo, setDietaInfo] = useState<DietaInfo | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setError(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Dieta ativa mais recente e suas refeições
      const { data: dieta, error: dietaErro } = await supabase
        .from("diets")
        .select("id, title, objective, supplements, recipes")
        .eq("patient_id", user.id)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (dietaErro) throw dietaErro;

      if (dieta) {
        setDietaInfo({ title: dieta.title, objective: dieta.objective, supplements: dieta.supplements, recipes: dieta.recipes });
        const { data, error: refErro } = await supabase
          .from("meals")
          .select("id, meal_name, meal_time, description, notes")
          .eq("diet_id", dieta.id)
          .order("position", { ascending: true });
        if (refErro) throw refErro;
        const lista = data ?? [];
        setRefeicoes(lista);
        if (lista.length > 0) {
          const { data: its, error: itErro } = await supabase.from("meal_items").select("id, meal_id, name, quantity_g, kcal").in("meal_id", lista.map((m) => m.id)).order("position", { ascending: true });
          if (itErro) throw itErro;
          const lidos = (its ?? []).map((i) => ({ ...i, quantity_g: Number(i.quantity_g), kcal: Number(i.kcal) }));
          setItens(lidos);
          // Substitutos (patch SQL 11): se a tabela não existir, só não mostra
          const { data: subs } = lidos.length
            ? await supabase.from("meal_item_substitutes").select("item_id, name, quantity_g").in("item_id", lidos.map((i) => i.id)).order("position", { ascending: true })
            : { data: null };
          setSubstitutos((subs ?? []).map((s) => ({ ...s, quantity_g: Number(s.quantity_g) })));
        } else {
          setItens([]);
        }
      } else {
        setRefeicoes([]);
        setItens([]);
        setSubstitutos([]);
        setDietaInfo(null);
      }

      const { data: msgs, error: msgErro } = await supabase
        .from("messages")
        .select("id, body, read, created_at")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (msgErro) throw msgErro;
      setMensagens(msgs ?? []);

      // Próximas consultas vinculadas a este paciente (tabela criada pelo patch 05; se faltar, só omite o bloco)
      const { data: cons } = await supabase
        .from("appointments")
        .select("id, starts_at, status")
        .eq("patient_id", user.id)
        .eq("status", "confirmed")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(5);
      setConsultas(cons ?? []);
    } catch (e) {
      console.error(e);
      setError("Não foi possível carregar seus dados. Verifique sua internet e tente de novo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function marcarLida(id: string) {
    await supabase.from("messages").update({ read: true }).eq("id", id);
    setMensagens((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
  }

  if (loading) return <Carregando />;

  const novas = mensagens.filter((m) => !m.read).length;

  return (
    <div>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl">Minha área</h1>
        <Link href="/agendar" className="rounded-full px-5 py-2.5 text-sm font-semibold" style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}>
          Agendar consulta
        </Link>
      </div>

      <ErrorText>{error}</ErrorText>

      {consultas.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-2xl">Próximas consultas</h2>
          <div className="flex flex-col gap-2">
            {consultas.map((c) => (
              <Card key={c.id} className="p-4 text-sm font-semibold capitalize">
                {dataHora(c.starts_at)}
              </Card>
            ))}
          </div>
        </section>
      )}

      {mensagens.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-2xl">
            Mensagens da nutricionista{novas > 0 ? ` (${novas} nova${novas > 1 ? "s" : ""})` : ""}
          </h2>
          <div className="flex flex-col gap-2">
            {mensagens.map((m) => (
              <Card
                key={m.id}
                className="p-4"
                style={!m.read ? { borderColor: "var(--color-primary)", background: "var(--color-surface)" } : undefined}
              >
                <p className="mb-1 text-sm">{m.body}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {new Date(m.created_at).toLocaleString("pt-BR")}
                  </span>
                  {!m.read && (
                    <button onClick={() => marcarLida(m.id)} className="text-xs font-semibold underline" style={{ color: "var(--color-primary)" }}>
                      Marcar como lida
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-1 text-2xl">Minha dieta</h2>
        {dietaInfo?.objective && <p className="mb-4 text-sm" style={{ color: "var(--color-text-muted)" }}>{dietaInfo.objective}</p>}
        {refeicoes.length === 0 ? (
          <Card className="p-8 text-center">
            <p style={{ color: "var(--color-text-muted)" }}>Nenhuma dieta cadastrada ainda. Volte mais tarde.</p>
          </Card>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {refeicoes.map((r) => {
              const doDia = itens.filter((i) => i.meal_id === r.id);
              const kcal = doDia.reduce((s, i) => s + i.kcal, 0);
              return (
                <Card key={r.id} className="p-5">
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <span className="text-lg font-semibold">{r.meal_name}</span>
                    {r.meal_time && (
                      <span className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
                        {hora(r.meal_time)}
                      </span>
                    )}
                  </div>
                  {doDia.length > 0 ? (
                    <ul className="flex flex-col gap-1 text-sm">
                      {doDia.map((i) => (
                        <li key={i.id} className="flex justify-between gap-3">
                          <span>
                            {i.name}
                            {substitutos.some((s) => s.item_id === i.id) && (
                              <span className="block text-xs italic" style={{ color: "var(--color-text-muted)" }}>
                                Pode trocar por: {substitutos.filter((s) => s.item_id === i.id).map((s) => `${s.quantity_g.toLocaleString("pt-BR")} g ${s.name}`).join(" · ")}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0" style={{ color: "var(--color-text-muted)" }}>{i.quantity_g.toLocaleString("pt-BR")} g</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    r.description && <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{r.description}</p>
                  )}
                  {r.notes && <p className="mt-2 text-sm italic" style={{ color: "var(--color-text-muted)" }}>{r.notes}</p>}
                  {doDia.length > 0 && <p className="mt-3 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>{Math.round(kcal)} kcal</p>}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {dietaInfo?.supplements && (
        <section className="mt-10">
          <h2 className="mb-4 text-2xl">Suplementos e produtos</h2>
          <Card className="whitespace-pre-line p-5 text-sm">{dietaInfo.supplements}</Card>
        </section>
      )}
      {dietaInfo?.recipes && (
        <section className="mt-10">
          <h2 className="mb-4 text-2xl">Receitas</h2>
          <Card className="whitespace-pre-line p-5 text-sm">{dietaInfo.recipes}</Card>
        </section>
      )}
    </div>
  );
}
