"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { dataHoraCompleta } from "@/lib/formatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { TextAreaField } from "@/components/ui/TextAreaField";

type Consulta = { id: string; starts_at: string; status: string };
type Mensagem = { id: string; body: string; created_at: string };

export function MensagensEConsultas({ patientId }: { patientId: string }) {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarMensagens = useCallback(async () => {
    const { data, error } = await supabase.from("messages").select("id, body, created_at").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(20);
    if (error) return setErro("Não foi possível carregar o histórico de mensagens.");
    setMensagens(data ?? []);
  }, [patientId]);

  useEffect(() => {
    carregarMensagens();
    supabase.from("appointments").select("id, starts_at, status").eq("patient_id", patientId).order("starts_at", { ascending: false }).limit(10).then(({ data }) => setConsultas(data ?? []));
  }, [patientId, carregarMensagens]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    setErro(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, body: texto.trim(), nutritionistAccessToken: session?.access_token }),
      });
      const r = await res.json();
      if (!res.ok) return setErro(r.error ?? "Não foi possível enviar a mensagem.");
      setTexto("");
      await carregarMensagens();
    } catch {
      setErro("Não foi possível conectar. Verifique sua internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div id="mensagens" className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <h2 className="mb-4 text-2xl">Consultas</h2>
        {consultas.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Nenhuma consulta vinculada a este paciente.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {consultas.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm" style={{ background: "var(--fundo-alt)" }}>
                <span className="font-semibold">{dataHoraCompleta(c.starts_at)}</span>
                <span style={{ color: "var(--color-text-muted)" }}>{c.status === "confirmed" ? "Confirmada" : "Cancelada"}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-2xl">Mensagens</h2>
        <form onSubmit={enviar}>
          <TextAreaField label="Enviar mensagem ao paciente" rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: Lembre-se de beber bastante água hoje!" containerClassName="mb-3" />
          <ErrorText>{erro}</ErrorText>
          <Button type="submit" disabled={enviando || !texto.trim()}>{enviando ? "Enviando..." : "Enviar"}</Button>
        </form>
        {mensagens.length > 0 && (
          <ul className="mt-5 flex flex-col gap-2">
            {mensagens.map((m) => (
              <li key={m.id} className="rounded-2xl px-4 py-3" style={{ background: "var(--fundo-alt)" }}>
                <p className="text-sm">{m.body}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>{new Date(m.created_at).toLocaleString("pt-BR")}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
