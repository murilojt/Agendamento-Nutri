import Link from "next/link";

export function Topo({ nome, mostrarBotao = true }: { nome: string; mostrarBotao?: boolean }) {
  return (
    <div className="topo-area">
      <header className="topo">
        <Link href="/" className="logo">
          <span className="logo-marca" aria-hidden="true" />
          {nome}
        </Link>
        {mostrarBotao && <Link href="/agendar" className="botao botao-pequeno">Agendar consulta</Link>}
      </header>
    </div>
  );
}
