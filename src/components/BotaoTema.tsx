"use client";

import { useEffect, useState } from "react";

const CHAVE = "tema";

export function BotaoTema() {
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    const atual = document.documentElement.dataset.theme;
    setEscuro(atual ? atual === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  function alternar() {
    const proximo = escuro ? "light" : "dark";
    document.documentElement.dataset.theme = proximo;
    try {
      localStorage.setItem(CHAVE, proximo);
    } catch {
      // armazenamento bloqueado: a escolha vale só nesta visita
    }
    setEscuro(!escuro);
  }

  return (
    <button
      type="button"
      className="tema"
      onClick={alternar}
      data-escuro={escuro}
      aria-label={escuro ? "Mudar para o tema claro" : "Mudar para o tema escuro"}
      title={escuro ? "Tema claro" : "Tema escuro"}
    >
      <svg className="lua" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" /></svg>
      <svg className="sol" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
    </button>
  );
}
