"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Carregando } from "@/components/ui/Carregando";
import { ErrorText } from "@/components/ui/ErrorText";
import { dataHoraCompleta } from "@/lib/formatar";
import { rotuloTipo } from "@/core/pacientes";
import { ENDERECO_CLINICA, gerarIcs, LINK_ROTA, linkGoogleAgenda, rotuloModalidade, ROTULO_STATUS, separarConsultas, tituloParaAgenda, type DadosEvento } from "@/core/consultas";

type Consulta = { id: string; starts_at: string; ends_at: string; status: string; kind?: string | null; modality?: string | null };
type Pedido = { appointment_id: string; note: string | null; created_at: string };

const suave = { color: "var(--color-text-muted)" };
const selo = { background: "var(--fundo-alt)" };
const botaoPrimario = { background: "var(--color-primary)", color: "var(--color-on-primary)" };
const botaoContorno = { borderColor: "var(--color-border)", background: "var(--color-surface)" };
const base = "rounded-full px-4 py-2 text-sm font-semibold";

const dadosDoEvento = (c: Consulta): DadosEvento => ({
  inicio: new Date(c.starts_at),
  fim: new Date(c.ends_at),
  titulo: tituloParaAgenda(c.modality),
  descricao: "Consulta de nutrição com Mariana Fernandes, Ayllus.",
  local: c.modality === "online" ? null : ENDERECO_CLINICA,
});

function baixarIcs(c: Consulta) {
  const ics = gerarIcs({ ...dadosDoEvento(c), uid: c.id });
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "consulta-ayllus.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export default function ConsultasPacientePage() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [pedidos, setPedidos] = useState<Record<string, Pedido>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pedindo, setPedindo] = useState<string | null>(null); // consulta com o formulário de pedido aberto
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const consulta = (colunas: string) => supabase.from("appointments").select(colunas).eq("patient_id", user.id).order("starts_at", { ascending: false }).limit(100);
    let r = await consulta("id, starts_at, ends_at, status, kind, modality");
    // Sem o patch SQL 16 (modalidade) ou o 10 (selo 1ª consulta/retorno): mostra o que o banco tiver
    if (r.error) r = await consulta("id, starts_at, ends_at, status, kind");
    if (r.error) r = await consulta("id, starts_at, ends_at, status");
    if (r.error) setErro("Não foi possível carregar suas consultas. Verifique sua internet e tente de novo.");
    setConsultas((r.data as unknown as Consulta[]) ?? []);
    const { data: ped } = await supabase.from("reschedule_requests").select("appointment_id, note, created_at").eq("patient_id", user.id).eq("status", "pending");
    setPedidos(Object.fromEntries((ped ?? []).map((p) => [p.appointment_id as string, p as Pedido])));
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function chamarPedido(consultaId: string, acao: "pedir" | "cancelar", texto?: string) {
    setErro(null);
    setAviso(null);
    setEnviando(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/consultas/pedido", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ consultaId, acao, nota: texto }),
    }).catch(() => null);
    setEnviando(false);
    if (!res?.ok) return setErro((await res?.json().catch(() => null))?.error ?? "Não foi possível concluir. Verifique sua internet e tente de novo.");
    setAviso(acao === "pedir" ? "Pedido enviado. A nutricionista vai responder por aqui, em Mensagens." : "Pedido cancelado.");
    setPedindo(null);
    setNota("");
    await carregar();
  }

  if (carregando) return <Carregando />;
  const { proximas, anteriores } = separarConsultas(consultas, new Date());

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl">Minhas consultas</h1>
        <Link href="/agendar" className={base} style={botaoPrimario}>Agendar consulta</Link>
      </div>

      {aviso && <div role="status" className="mb-4 rounded-2xl px-4 py-3 text-sm font-medium" style={{ background: "var(--gema)", color: "var(--sobre-gema)" }}>{aviso}</div>}
      <ErrorText>{erro}</ErrorText>

      <section className="mb-10">
        <h2 className="mb-4 text-2xl">Próximas</h2>
        {proximas.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="mb-4" style={suave}>Você não tem consultas marcadas.</p>
            <Link href="/agendar" className={base} style={botaoPrimario}>Agendar consulta</Link>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {proximas.map((c) => {
              const pedido = pedidos[c.id];
              const modalidade = rotuloModalidade(c.modality);
              return (
                <Card key={c.id} className="flex flex-col gap-4 p-5" data-testid="consulta-proxima">
                  <div>
                    <p className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                      {dataHoraCompleta(c.starts_at)}
                      {rotuloTipo(c.kind) && <span className="rounded-full px-2.5 py-0.5 text-xs" style={selo}>{rotuloTipo(c.kind)}</span>}
                      {modalidade && <span className="rounded-full px-2.5 py-0.5 text-xs" style={selo}>{modalidade}</span>}
                    </p>
                    {c.modality === "online" ? (
                      <p className="mt-1 text-sm" style={suave}>Consulta online.</p>
                    ) : (
                      <p className="mt-1 text-sm" style={suave}>
                        {ENDERECO_CLINICA}{" "}
                        <a href={LINK_ROTA} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Ver rota</a>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a href={linkGoogleAgenda(dadosDoEvento(c))} target="_blank" rel="noopener noreferrer" className={`${base} border`} style={botaoContorno}>Adicionar ao Google Agenda</a>
                    <button type="button" onClick={() => baixarIcs(c)} className={`${base} border`} style={botaoContorno}>Baixar para o calendário (.ics)</button>
                    {!pedido && pedindo !== c.id && (
                      <button type="button" onClick={() => { setPedindo(c.id); setNota(""); setErro(null); }} className={`${base} border`} style={botaoContorno}>Pedir remarcação</button>
                    )}
                  </div>

                  {pedido && (
                    <div className="rounded-2xl p-4 text-sm" style={selo} data-testid="pedido-enviado">
                      <p className="font-semibold">Pedido de remarcação enviado em {dataHoraCompleta(pedido.created_at)}</p>
                      <p className="mb-3" style={suave}>{pedido.note ? <>“{pedido.note}”. </> : null}Aguardando resposta da nutricionista. Enquanto isso, a consulta continua no horário acima.</p>
                      <button type="button" disabled={enviando} onClick={() => chamarPedido(c.id, "cancelar")} className={`${base} border`} style={botaoContorno}>Cancelar pedido</button>
                    </div>
                  )}

                  {pedindo === c.id && (
                    <form
                      className="rounded-2xl p-4 text-sm"
                      style={selo}
                      onSubmit={(e) => { e.preventDefault(); chamarPedido(c.id, "pedir", nota.trim() || undefined); }}
                    >
                      <label htmlFor={`nota-${c.id}`} className="mb-1 block font-semibold">Quando fica melhor para você? (opcional)</label>
                      <textarea
                        id={`nota-${c.id}`}
                        value={nota}
                        onChange={(e) => setNota(e.target.value)}
                        rows={3}
                        maxLength={500}
                        placeholder="Ex.: prefiro terças ou quintas à tarde"
                        className="mb-3 w-full rounded-2xl border px-4 py-2"
                        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button type="submit" disabled={enviando} className={base} style={botaoPrimario}>{enviando ? "Enviando…" : "Enviar pedido"}</button>
                        <button type="button" onClick={() => setPedindo(null)} className={`${base} border`} style={botaoContorno}>Cancelar</button>
                      </div>
                    </form>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {anteriores.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl">Anteriores</h2>
          <div className="flex flex-col gap-2">
            {anteriores.map((c) => (
              <Card key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <span className="font-semibold">{dataHoraCompleta(c.starts_at)}</span>
                <span className="flex flex-wrap gap-2">
                  {rotuloTipo(c.kind) && <span className="rounded-full px-2.5 py-0.5 text-xs" style={selo}>{rotuloTipo(c.kind)}</span>}
                  {rotuloModalidade(c.modality) && <span className="rounded-full px-2.5 py-0.5 text-xs" style={selo}>{rotuloModalidade(c.modality)}</span>}
                  <span className="rounded-full px-2.5 py-0.5 text-xs" style={selo}>{c.status === "confirmed" ? "Realizada" : ROTULO_STATUS[c.status] ?? c.status}</span>
                </span>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
