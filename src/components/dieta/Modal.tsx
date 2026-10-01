"use client";

import { useEffect, useRef } from "react";
import { IcoFechar } from "./Icones";

/** Janela modal baseada em <dialog> (Esc e clique fora fecham; o foco fica preso dentro). */
export function Modal({ aberto, aoFechar, titulo, children, larga = false }: { aberto: boolean; aoFechar: () => void; titulo: string; children: React.ReactNode; larga?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      onClick={(e) => e.target === ref.current && aoFechar()}
      className={`m-auto w-[calc(100vw-2rem)] ${larga ? "max-w-3xl" : "max-w-lg"} rounded-3xl p-0 backdrop:bg-black/60`}
      style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}
    >
      {aberto && (
        <div className="max-h-[85vh] overflow-y-auto p-6 md:p-8">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 className="text-2xl">{titulo}</h2>
            <button type="button" onClick={aoFechar} aria-label="Fechar" className="rounded-full p-2" style={{ background: "var(--fundo-alt)" }}>
              <IcoFechar className="h-4 w-4" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
