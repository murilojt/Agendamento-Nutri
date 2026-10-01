"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { criarClienteAgenda, ErroAgenda } from "@/core/cliente-api";
import { diaDaSemana, diasDoMes, horaLocal, janelaDeMeses, somarMeses } from "@/core/disponibilidade";
import type { AgendamentoCriado, DisponibilidadeMes, Horario } from "@/core/schemas";

const api = criarClienteAgenda();
const ATUALIZAR_A_CADA_MS = 30_000;

const fmtMes = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const fmtDia = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const comoData = (d: string) => new Date(`${d}T12:00:00Z`);
const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Campos = { nome: string; sobrenome: string; celular: string; email: string };
const vazio: Campos = { nome: "", sobrenome: "", celular: "", email: "" };

export function CalendarioAgendamento() {
  const [janela] = useState(() => janelaDeMeses());
  const [mes, setMes] = useState(janela.primeiro);
  const [dados, setDados] = useState<DisponibilidadeMes | null>(null);
  const [dia, setDia] = useState<string | null>(null);
  const [escolhido, setEscolhido] = useState<Horario | null>(null);
  const [campos, setCampos] = useState<Campos>(vazio);
  const [erros, setErros] = useState<Record<string, string[]>>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState<AgendamentoCriado | null>(null);
  const dialogo = useRef<HTMLDialogElement>(null);
  const mesAtual = useRef(mes);
  mesAtual.current = mes;

  const carregar = useCallback(async () => {
    try {
      const r = await api.disponibilidadeDoMes(mes);
      if (r.mes === mesAtual.current) setDados(r); // ignora respostas de um mês que já saiu da tela
    } catch (e) {
      setAviso(e instanceof ErroAgenda ? e.message : "Sem conexão. Verifique sua internet.");
    }
  }, [mes]);

  // Carrega o mês e atualiza sozinho: horários preenchidos por outras pessoas aparecem sem recarregar a página
  useEffect(() => {
    setDados(null);
    carregar();
    const timer = setInterval(carregar, ATUALIZAR_A_CADA_MS);
    window.addEventListener("focus", carregar);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", carregar);
    };
  }, [carregar]);

  function trocarMes(n: number) {
    setMes((m) => somarMeses(m, n));
    setDia(null);
  }

  function abrirFormulario(h: Horario) {
    setEscolhido(h);
    setErros({});
    setAviso(null);
    setConcluido(null);
    dialogo.current?.showModal();
  }

  function fecharFormulario() {
    dialogo.current?.close();
    if (concluido) {
      setCampos(vazio);
      setConcluido(null);
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!escolhido) return;
    setEnviando(true);
    setErros({});
    try {
      const criado = await api.agendar({ inicio: escolhido.inicio, ...campos });
      setConcluido(criado);
      carregar();
    } catch (err) {
      if (err instanceof ErroAgenda && err.status === 400 && err.detalhes) {
        setErros(err.detalhes);
      } else {
        dialogo.current?.close();
        setAviso(err instanceof ErroAgenda ? err.message : "Sem conexão. Verifique sua internet e tente de novo.");
        carregar();
      }
    } finally {
      setEnviando(false);
    }
  }

  const atualizar = (k: keyof Campos) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCampos((c) => ({ ...c, [k]: e.target.value }));

  const datas = diasDoMes(mes);
  const vazios = diaDaSemana(datas[0]);
  const horariosDia = dia ? dados?.dias[dia] ?? [] : [];

  return (
    <div className="calendario-area">
      {aviso && <p className="aviso" role="alert">{aviso}</p>}

      <div className="calendario">
        <div className="calendario-topo">
          <button className="seta" onClick={() => trocarMes(-1)} disabled={mes <= janela.primeiro} aria-label="Mês anterior">‹</button>
          <h2 aria-live="polite">{fmtMes.format(comoData(`${mes}-01`))}</h2>
          <button className="seta" onClick={() => trocarMes(1)} disabled={mes >= janela.ultimo} aria-label="Próximo mês">›</button>
        </div>

        <div className="grade" role="grid">
          {SEMANA.map((s) => <span key={s} className="semana">{s}</span>)}
          {Array.from({ length: vazios }, (_, i) => <span key={`v${i}`} />)}
          {datas.map((d) => {
            const lista = dados?.dias[d];
            const livres = lista?.filter((h) => h.livre).length ?? 0;
            const estado = !lista ? "fechado" : livres === 0 ? "lotado" : "aberto";
            return (
              <button
                key={d}
                className={`dia ${estado}`}
                aria-pressed={dia === d}
                disabled={!lista}
                onClick={() => setDia(d)}
                aria-label={`${fmtDia.format(comoData(d))}: ${!lista ? "sem atendimento" : livres === 0 ? "lotado" : `${livres} horários livres`}`}
              >
                <span className="numero">{Number(d.slice(8))}</span>
                {lista && <span className="vagas">{livres === 0 ? "lotado" : `${livres} ${livres === 1 ? "vaga" : "vagas"}`}</span>}
              </button>
            );
          })}
        </div>
        {!dados && <p className="dica carregando">Consultando a agenda…</p>}
      </div>

      <section className="horarios-dia" aria-live="polite">
        {!dia && <p className="dica">Escolha um dia no calendário.</p>}
        {dia && (
          <>
            <h2>{fmtDia.format(comoData(dia))}</h2>
            <div className="horarios">
              {horariosDia.map((h) => (
                <button
                  key={h.inicio}
                  className={`horario ${h.livre ? "" : "preenchido"}`}
                  disabled={!h.livre}
                  onClick={() => abrirFormulario(h)}
                >
                  {horaLocal(new Date(h.inicio))}
                  {!h.livre && <small>Preenchido</small>}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <dialog ref={dialogo} className="dialogo" onClose={() => concluido && setCampos(vazio)}>
        {escolhido && !concluido && (
          <form onSubmit={enviar} noValidate>
            <h2>Seus dados</h2>
            <p className="resumo-horario">
              {fmtDia.format(comoData(escolhido.inicio.slice(0, 10)))}, às {horaLocal(new Date(escolhido.inicio))}
            </p>
            <div className="linha-dupla">
              <Campo id="nome" rotulo="Nome" erros={erros.nome}>
                <input id="nome" autoComplete="given-name" value={campos.nome} onChange={atualizar("nome")} required />
              </Campo>
              <Campo id="sobrenome" rotulo="Sobrenome" erros={erros.sobrenome}>
                <input id="sobrenome" autoComplete="family-name" value={campos.sobrenome} onChange={atualizar("sobrenome")} required />
              </Campo>
            </div>
            <Campo id="celular" rotulo="Celular" erros={erros.celular}>
              <input id="celular" type="tel" inputMode="tel" autoComplete="tel" placeholder="(19) 91234-5678" value={campos.celular} onChange={atualizar("celular")} required />
            </Campo>
            <Campo id="email" rotulo="E-mail" erros={erros.email}>
              <input id="email" type="email" autoComplete="email" value={campos.email} onChange={atualizar("email")} required />
            </Campo>
            <div className="acoes">
              <button type="button" className="botao-secundario" onClick={fecharFormulario}>Voltar</button>
              <button type="submit" className="botao" disabled={enviando}>{enviando ? "Enviando…" : "Enviar"}</button>
            </div>
          </form>
        )}
        {concluido && (
          <div className="concluido">
            <div className="selo" aria-hidden="true">✓</div>
            <h2>Consulta marcada</h2>
            <p>
              Tudo certo, {concluido.nome}. Sua consulta está marcada para{" "}
              <strong>{fmtDia.format(comoData(concluido.inicio.slice(0, 10)))} às {horaLocal(new Date(concluido.inicio))}</strong>.
            </p>
            <div className="concluido-acoes">
              <Link href="/" className="botao">Voltar para a página inicial</Link>
              <button className="botao-secundario" onClick={fecharFormulario}>Agendar outro horário</button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}

function Campo({ id, rotulo, erros, children }: { id: string; rotulo: string; erros?: string[]; children: React.ReactNode }) {
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      {children}
      {erros?.map((e) => <span key={e} className="erro-campo">{e}</span>)}
    </div>
  );
}
