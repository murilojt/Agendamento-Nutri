"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Carregando } from "@/components/ui/Carregando";
import { ErrorText } from "@/components/ui/ErrorText";
import { dataHora } from "@/lib/formatar";

type Refeicao = { id: string; meal_name: string; meal_time: string | null; description: string };
type Mensagem = { id: string; body: string; read: boolean; created_at: string };
type Consulta = { id: string; starts_at: string; status: string };

const hora = (t: string | null) => (t ? t.slice(0, 5) : null);

export default function PacientePage() {
  const [refeicoes, setRefeicoes] = useState<Refeicao[]>([]);
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
        .select("id")
        .eq("patient_id", user.id)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (dietaErro) throw dietaErro;

      if (dieta) {
        const { data, error: refErro } = await supabase
          .from("meals")
          .select("id, meal_name, meal_time, description")
          .eq("diet_id", dieta.id)
          .order("meal_time", { ascending: true });
        if (refErro) throw refErro;
        setRefeicoes(data ?? []);
      } else {
        setRefeicoes([]);
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
        <h2 className="mb-4 text-2xl">Minha dieta</h2>
        {refeicoes.length === 0 ? (
          <Card className="p-8 text-center">
            <p style={{ color: "var(--color-text-muted)" }}>Nenhuma dieta cadastrada ainda. Volte mais tarde.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {refeicoes.map((r) => (
              <Card key={r.id} className="p-5">
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="text-lg font-semibold">{r.meal_name}</span>
                  {r.meal_time && (
                    <span className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
                      {hora(r.meal_time)}
                    </span>
                  )}
                </div>
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{r.description}</p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
