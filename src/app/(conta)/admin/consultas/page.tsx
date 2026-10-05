"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Carregando } from "@/components/ui/Carregando";
import { ErrorText } from "@/components/ui/ErrorText";
import { dataHoraCompleta } from "@/lib/formatar";
import { MOTIVOS_REVISAO, rotuloTipo, type MotivoRevisao } from "@/core/pacientes";

type Consulta = {
  id: string;
  starts_at: string;
  status: string;
  patient_id: string | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  kind?: string | null;
  needs_review?: boolean;
  review_reason?: string | null;
  suggested_patient_id?: string | null;
  profiles: { full_name: string | null } | null;
};

type Aba = "proximas" | "anteriores" | "revisar";
type Acao = "realizada" | "faltou" | "reabrir" | "vincular" | "cadastrar" | "dispensar";

const COLUNAS_BASE = "id, starts_at, status, patient_id, guest_name, guest_email, guest_phone, profiles!appointments_patient_id_fkey(full_name)";
const COLUNAS_NOVAS = `${COLUNAS_BASE}, kind, needs_review, review_reason, suggested_patient_id`;
const ROTULO_STATUS: Record<string, string> = { completed: "Realizada", no_show: "Faltou", cancelled: "Cancelada" };

const botao = "rounded-full px-4 py-2 text-sm font-semibold";
const estiloPrimario = { background: "var(--color-primary)", color: "var(--color-on-primary)" };
const estiloSuave = { background: "var(--fundo-alt)" };

export default function ConsultasPage() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [aba, setAba] = useState<Aba>("proximas");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ocupada, setOcupada] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const consulta = (colunas: string) => supabase.from("appointments").select(colunas).order("starts_at", { ascending: false }).limit(200);
    let r = await consulta(COLUNAS_NOVAS);
    // Sem o patch SQL 10: mostra só o básico
    if (r.error) r = await consulta(COLUNAS_BASE);
    if (r.error) setError("Não foi possível carregar as consultas. Confirme que o patch SQL 05 foi aplicado no Supabase.");
    const lista = (r.data as unknown as Consulta[]) ?? [];
    setConsultas(lista);

    const ids = [...new Set(lista.map((c) => c.suggested_patient_id).filter((x): x is string => !!x))];
    if (ids.length) {
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      setNomes(Object.fromEntries((data ?? []).map((p) => [p.id, p.full_name ?? "paciente"])));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function executar(consultaId: string, acao: Acao, pacienteId?: string) {
    setOcupada(consultaId);
    setError(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch("/api/consultas/acao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consultaId, acao, pacienteId, nutritionistAccessToken: session?.access_token }),
    }).catch(() => null);
    if (!res?.ok) {
      const corpo = await res?.json().catch(() => null);
      setError(corpo?.error ?? "Não foi possível concluir a ação. Tente novamente.");
    }
    await carregar();
    setOcupada(null);
  }

  const agora = Date.now();
  const revisar = consultas.filter((c) => c.needs_review && c.status !== "cancelled");
  const proximas = consultas.filter((c) => new Date(c.starts_at).getTime() >= agora - 60 * 60_000 && c.status === "confirmed").reverse();
  const anteriores = consultas.filter((c) => !proximas.includes(c));
  const lista = aba === "proximas" ? proximas : aba === "anteriores" ? anteriores : revisar;

  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 text-3xl">Consultas</h1>
      <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted)" }}>
        Consultas marcadas pelo site. Os cancelamentos feitos direto na Google Agenda ainda não aparecem aqui.
      </p>

      <div className="mb-6 flex flex-wrap gap-2" role="tablist">
        {(
          [
            ["proximas", `Próximas (${proximas.length})`],
            ["anteriores", `Anteriores (${anteriores.length})`],
            ["revisar", `Revisar (${revisar.length})`],
          ] as [Aba, string][]
        ).map(([id, rotulo]) => (
          <button
            key={id}
            role="tab"
            aria-selected={aba === id}
            onClick={() => setAba(id)}
            className={botao}
            style={aba === id ? estiloPrimario : estiloSuave}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <ErrorText>{error}</ErrorText>

      {loading ? (
        <Carregando />
      ) : lista.length === 0 ? (
        <Card className="p-10 text-center">
          <p style={{ color: "var(--color-text-muted)" }}>
            {aba === "revisar" ? "Nenhuma consulta precisa de revisão." : "Nenhuma consulta por aqui."}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {lista.map((c) => {
            const tipo = rotuloTipo(c.kind);
            const sugerido = c.suggested_patient_id ? nomes[c.suggested_patient_id] : null;
            const trabalhando = ocupada === c.id;
            return (
              <Card key={c.id} data-consulta={c.guest_email} className="flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {dataHoraCompleta(c.starts_at)}
                      {tipo && <span className="rounded-full px-2 py-0.5 text-xs" style={estiloSuave}>{tipo}</span>}
                      {ROTULO_STATUS[c.status] && <span className="rounded-full px-2 py-0.5 text-xs" style={estiloSuave}>{ROTULO_STATUS[c.status]}</span>}
                      {c.needs_review && <span className="rounded-full px-2 py-0.5 text-xs" style={estiloPrimario}>Revisar</span>}
                    </p>
                    <p className="text-sm">{c.guest_name}</p>
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {c.guest_phone} · {c.guest_email}
                    </p>
                  </div>
                  {c.patient_id ? (
                    <Link href={`/admin/pacientes/${c.patient_id}`} className={botao} style={estiloPrimario}>
                      Paciente: {c.profiles?.full_name ?? "ver ficha"}
                    </Link>
                  ) : (
                    <span className="rounded-full px-4 py-2 text-xs font-semibold" style={estiloSuave}>Sem cadastro no sistema</span>
                  )}
                </div>

                {c.needs_review && (
                  <div className="rounded-2xl p-4 text-sm" style={estiloSuave}>
                    <p className="mb-3">
                      {MOTIVOS_REVISAO[c.review_reason as MotivoRevisao] ?? "Não foi possível identificar o paciente com segurança."}
                      {sugerido && <> Parece ser <strong>{sugerido}</strong>.</>}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {c.suggested_patient_id && (
                        <button disabled={trabalhando} onClick={() => executar(c.id, "vincular", c.suggested_patient_id!)} className={botao} style={estiloPrimario}>
                          É {sugerido ?? "este paciente"}: vincular
                        </button>
                      )}
                      {!c.patient_id && (
                        <button disabled={trabalhando} onClick={() => executar(c.id, "cadastrar")} className={botao} style={estiloSuave}>
                          É outra pessoa: cadastrar como paciente
                        </button>
                      )}
                      <button disabled={trabalhando} onClick={() => executar(c.id, "dispensar")} className={botao} style={estiloSuave}>
                        Está certo assim
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {!c.patient_id && !c.needs_review && (
                    <button disabled={trabalhando} onClick={() => executar(c.id, "cadastrar")} className={botao} style={estiloPrimario}>
                      Cadastrar como paciente
                    </button>
                  )}
                  {c.status === "confirmed" && (
                    <>
                      <button disabled={trabalhando} onClick={() => executar(c.id, "realizada")} className={botao} style={estiloSuave}>Marcar realizada</button>
                      <button disabled={trabalhando} onClick={() => executar(c.id, "faltou")} className={botao} style={estiloSuave}>Faltou</button>
                    </>
                  )}
                  {(c.status === "completed" || c.status === "no_show") && (
                    <button disabled={trabalhando} onClick={() => executar(c.id, "reabrir")} className={botao} style={estiloSuave}>Desfazer</button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
