"use client";

import { useEffect, useState } from "react";

/** Botão fixo no canto direito que aparece ao rolar a página e leva de volta ao topo. */
export function VoltarAoTopo() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const atualizar = () => setVisivel(window.scrollY > 400);
    atualizar();
    window.addEventListener("scroll", atualizar, { passive: true });
    return () => window.removeEventListener("scroll", atualizar);
  }, []);

  function subir() {
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduzir ? "auto" : "smooth" });
  }

  return (
    <button type="button" onClick={subir} className={`voltar-topo${visivel ? " visivel" : ""}`} aria-label="Voltar ao topo" tabIndex={visivel ? 0 : -1}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
      <span>Voltar ao topo</span>
    </button>
  );
}
