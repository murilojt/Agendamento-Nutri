import Link from "next/link";
import { BotaoTema } from "./BotaoTema";

/** Cabeçalho das telas de acesso (entrar, esqueci a senha, redefinir senha). */
export function CabecalhoConta() {
  return (
    <header
      className="mx-auto flex w-full max-w-5xl items-center justify-between rounded-full px-5 py-2"
      style={{ background: "var(--profundo)" }}
    >
      <Link href="/" aria-label="Ayllus, página inicial" className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/ayllus-isotipo-dourado.svg" alt="" width={168} height={191} className="h-9 w-auto" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/ayllus-logotipo-dourado.svg" alt="Ayllus" width={370} height={100} className="h-7 w-auto" />
      </Link>
      <BotaoTema />
    </header>
  );
}
