import Link from "next/link";

export function Topo({ nome, mostrarBotao = true }: { nome: string; mostrarBotao?: boolean }) {
  return (
    <div className="topo-area">
      <header className="topo">
        <Link href="/" className="logo" aria-label={`${nome}, página inicial`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marca/ayllus-isotipo.png" alt="" width={168} height={191} className="logo-isotipo" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marca/ayllus-wordmark.png" alt={nome} width={277} height={83} className="logo-nome" />
        </Link>
        {mostrarBotao && <Link href="/agendar" className="botao botao-pequeno">Agendar consulta</Link>}
      </header>
    </div>
  );
}
