"use client";

import { useEffect, useRef, useState } from "react";
import { criarClienteAgenda, ErroAgenda } from "@/core/cliente-api";
import { CONFIG_AGENDA } from "@/core/config";
import { dataLocal, horaLocal, somarDias } from "@/core/disponibilidade";
import type { DisponibilidadeMes } from "@/core/schemas";
import { Modal } from "@/components/dieta/Modal";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { dataHoraCompleta } from "@/lib/formatar";

const api = criarClienteAgenda();
const suave = { color: "var(--color-text-muted)" };
const borda = { borderColor: "var(--color-border)", background: "var(--color-surface)" };

type Props = {
  consulta: { id: string; starts_at: string; guest_name: string } | null;
  aoFechar: () => void;
  /** Devolve a mensagem de erro, ou null se a consulta foi remarcada. */
  aoConfirmar: (consultaId: string, novoInicio: string) => Promise<string | null>;
};

/** A nutricionista escolhe um novo dia e horário, entre os que estão livres na agenda. */
export function RemarcarConsultaModal({ consulta, aoFechar, aoConfirmar }: Props) {
  const hoje = dataLocal(new Date());
  const limite = somarDias(hoje, CONFIG_AGENDA.diasAFrente);
  const [dia, setDia] = useState(hoje);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [meses, setMeses] = useState<Record<string, DisponibilidadeMes>>({});
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const pedidos = useRef(0);

  // Ao abrir, começa no dia da consulta (se ainda for futuro) ou em hoje
  useEffect(() => {
    if (!consulta) return;
    const atual = dataLocal(new Date(consulta.starts_at));
    setDia(atual >= hoje && atual <= limite ? atual : hoje);
    setEscolhido(null);
    setErro(null);
    setMeses({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consulta?.id]);

  const mes = dia.slice(0, 7);
  useEffect(() => {
    if (!consulta || meses[mes]) return;
    const pedido = ++pedidos.current;
    setCarregando(true);
    api.disponibilidadeDoMes(mes)
      .then((r) => pedido === pedidos.current && setMeses((m) => ({ ...m, [mes]: r })))
      .catch((e) => pedido === pedidos.current && setErro(e instanceof ErroAgenda ? e.message : "Não foi possível consultar a agenda agora."))
      .finally(() => pedido === pedidos.current && setCarregando(false));
  }, [consulta, mes, meses]);

  const horarios = meses[mes]?.dias[dia] ?? [];
  const mesmaConsulta = (inicio: string) => !!consulta && new Date(inicio).getTime() === new Date(consulta.starts_at).getTime();

  async function confirmar() {
    if (!consulta || !escolhido) return;
    setSalvando(true);
    setErro(null);
    const falha = await aoConfirmar(consulta.id, escolhido);
    setSalvando(false);
    if (falha) {
      setErro(falha);
      setMeses({}); // a agenda mudou: recarrega os horários
      setEscolhido(null);
    }
  }

  return (
    <Modal aberto={!!consulta} aoFechar={aoFechar} titulo="Remarcar consulta">
      {consulta && (
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            <strong>{consulta.guest_name}</strong>
            <br />
            <span style={suave}>Horário atual: {dataHoraCompleta(consulta.starts_at)}</span>
          </p>

          <label className="block text-sm font-medium">
            Novo dia
            <input
              type="date"
              min={hoje}
              max={limite}
              value={dia}
              onChange={(e) => { if (e.target.value) { setDia(e.target.value); setEscolhido(null); setErro(null); } }}
              className="mt-1 block w-full rounded-2xl border px-4 py-3"
              style={borda}
            />
          </label>

          <div>
            <p className="mb-2 text-sm font-medium">Horários da agenda</p>
            {carregando && !meses[mes] ? (
              <p className="text-sm" style={suave}>Consultando a agenda…</p>
            ) : horarios.length === 0 ? (
              <p className="text-sm" style={suave}>Sem horários de atendimento neste dia. Escolha outro.</p>
            ) : (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Horários">
                {horarios.map((h) => {
                  const atual = mesmaConsulta(h.inicio);
                  const indisponivel = !h.livre && !atual;
                  const marcado = escolhido === h.inicio;
                  return (
                    <button
                      key={h.inicio}
                      type="button"
                      disabled={!h.livre || atual}
                      aria-pressed={marcado}
                      onClick={() => setEscolhido(h.inicio)}
                      className="rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                      style={marcado ? { background: "var(--color-primary)", color: "var(--color-on-primary)", borderColor: "var(--color-primary)" } : borda}
                      title={atual ? "Horário atual da consulta" : indisponivel ? "Ocupado" : undefined}
                    >
                      {horaLocal(new Date(h.inicio))}{atual ? " (atual)" : indisponivel ? " (ocupado)" : ""}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {escolhido && (
            <p className="rounded-2xl border p-3 text-sm" style={{ ...borda, background: "var(--fundo-alt)" }} data-testid="resumo-remarcacao">
              Remarcar para <strong>{dataHoraCompleta(escolhido)}</strong>. A Google Agenda será atualizada e o horário antigo ficará livre.
            </p>
          )}

          <ErrorText>{erro}</ErrorText>
          <div className="flex gap-2">
            <Button type="button" onClick={confirmar} disabled={!escolhido || salvando}>{salvando ? "Remarcando…" : "Confirmar remarcação"}</Button>
            <button type="button" onClick={aoFechar} className="rounded-2xl border px-4 py-3 text-sm font-semibold" style={borda}>Cancelar</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
