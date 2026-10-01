import Link from "next/link";

export function Topo({ nome, mostrarBotao = true }: { nome: string; mostrarBotao?: boolean }) {
  return (
    <header className="topo">
      <Link href="/" className="logo">{nome}</Link>
      {mostrarBotao && <Link href="/agendar" className="botao botao-pequeno">Agendar uma consulta</Link>}
    </header>
  );
}
