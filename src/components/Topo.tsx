import Link from "next/link";
import { BotaoTema } from "./BotaoTema";

export function Topo({ nome, mostrarBotao = true }: { nome: string; mostrarBotao?: boolean }) {
  return (
    <div className="topo-area">
      <header className="topo">
        <Link href="/" className="logo" aria-label={`${nome}, página inicial`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marca/ayllus-isotipo-dourado.svg" alt="" width={168} height={191} className="logo-isotipo" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marca/ayllus-logotipo-dourado.svg" alt={nome} width={370} height={100} className="logo-nome" />
        </Link>
        <div className="topo-acoes">
          <BotaoTema />
          {mostrarBotao && <Link href="/agendar" className="botao botao-pequeno">Agendar consulta</Link>}
        </div>
      </header>
    </div>
  );
}
