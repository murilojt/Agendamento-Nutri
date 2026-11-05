"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Depoimento = { autor: string; texto: string };

/** Tempo na tela de cada depoimento: mais texto, mais tempo para ler (entre 8 e 20 segundos). */
const duracao = (texto: string) => Math.min(20_000, Math.max(8_000, 5_000 + texto.split(/\s+/).length * 150));

/** Carrossel de depoimentos: setas, bolinhas, arrastar no celular, teclado e passagem automática que pausa ao interagir. */
export function Depoimentos({ itens }: { itens: Depoimento[] }) {
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [reduzirMovimento, setReduzirMovimento] = useState(true); // começa sem animar até saber a preferência
  const inicioToque = useRef<number | null>(null);
  const total = itens.length;

  const ir = useCallback((i: number) => setAtual(((i % total) + total) % total), [total]);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduzirMovimento(m.matches);
    const mudou = () => setReduzirMovimento(m.matches);
    m.addEventListener("change", mudou);
    return () => m.removeEventListener("change", mudou);
  }, []);

  // Passagem automática (desligada com "reduzir movimento", ao pausar ou com um só depoimento)
  useEffect(() => {
    if (total < 2 || pausado || reduzirMovimento) return;
    const t = setTimeout(() => ir(atual + 1), duracao(itens[atual].texto));
    return () => clearTimeout(t);
  }, [atual, pausado, reduzirMovimento, total, itens, ir]);

  function aoTeclar(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") { e.preventDefault(); ir(atual + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); ir(atual - 1); }
  }

  return (
    <section
      className="depoimentos"
      aria-roledescription="carrossel"
      aria-label="Depoimentos de pacientes"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      onKeyDown={aoTeclar}
    >
      <div
        className="depoimentos-palco"
        onPointerDown={(e) => { inicioToque.current = e.clientX; setPausado(true); }}
        onPointerUp={(e) => {
          if (inicioToque.current != null) {
            const dx = e.clientX - inicioToque.current;
            if (Math.abs(dx) > 50) ir(atual + (dx < 0 ? 1 : -1));
          }
          inicioToque.current = null;
          setPausado(false);
        }}
        onPointerCancel={() => { inicioToque.current = null; setPausado(false); }}
        aria-live={pausado || reduzirMovimento ? "polite" : "off"}
      >
        {itens.map((d, i) => (
          <figure
            key={d.autor}
            className={`depoimento-slide${i === atual ? " ativo" : ""}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} de ${total}`}
            aria-hidden={i !== atual}
            inert={i !== atual}
          >
            <span className="depoimento-aspas" aria-hidden="true">“</span>
            <blockquote>{d.texto}</blockquote>
            <figcaption>{d.autor}</figcaption>
          </figure>
        ))}
      </div>

      {total > 1 && (
        <div className="depoimentos-controles">
          <button type="button" className="depoimentos-seta" onClick={() => ir(atual - 1)} aria-label="Depoimento anterior">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <div className="depoimentos-bolinhas" role="tablist" aria-label="Escolher depoimento">
            {itens.map((d, i) => (
              <button key={d.autor} type="button" role="tab" aria-selected={i === atual} aria-label={`Depoimento ${i + 1} de ${total}`} className={i === atual ? "ativa" : ""} onClick={() => ir(i)} />
            ))}
          </div>
          <button type="button" className="depoimentos-seta" onClick={() => ir(atual + 1)} aria-label="Próximo depoimento">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      )}
    </section>
  );
}
