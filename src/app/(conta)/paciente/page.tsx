"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Carregando } from "@/components/ui/Carregando";
import { ErrorText } from "@/components/ui/ErrorText";
import { dataHora } from "@/lib/formatar";
import { EvolucaoPainel } from "@/components/dieta/EvolucaoPainel";

type Mensagem = { id: string; body: string; read: boolean; created_at: string };
type Consulta = { id: string; starts_at: string; status: string };

export default function PacientePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [temDieta, setTemDieta] = useState<boolean | null>(null);
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
      setUserId(user.id);

      // Só confere se existe dieta ativa (o conteúdo fica na aba Dieta)
      const { data: dieta, error: dietaErro } = await supabase.from("diets").select("id").eq("patient_id", user.id).eq("active", true).limit(1).maybeSingle();
      if (dietaErro) throw dietaErro;
      setTemDieta(!!dieta);

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
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-2xl">Próximas consultas</h2>
            <Link href="/paciente/consultas" className="text-sm font-semibold underline">Ver todas e remarcar</Link>
          </div>
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

      <section className="mb-10">
        <h2 className="mb-4 text-2xl">Minha evolução</h2>
        <Card className="p-5">{userId && <EvolucaoPainel patientId={userId} editavel={false} />}</Card>
      </section>

      <section>
        <h2 className="mb-4 text-2xl">Minha dieta</h2>
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {temDieta === false ? "Nenhuma dieta cadastrada ainda. Volte mais tarde." : "Veja o plano alimentar, a lista de compras, as receitas e baixe o PDF."}
          </p>
          {temDieta !== false && (
            <Link href="/paciente/dieta" className="rounded-full px-5 py-2.5 text-sm font-semibold" style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}>
              Abrir minha dieta
            </Link>
          )}
        </Card>
      </section>
    </div>
  );
}
