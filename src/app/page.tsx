import Link from "next/link";
import { Topo } from "@/components/Topo";

// Textos fictícios: troque pelos dados reais da clínica.
const nome = process.env.NEXT_PUBLIC_NOME_CLINICA ?? "Allyus Nutrição";

const atendimentos = [
  { titulo: "Primeira consulta", texto: "Avaliação completa: histórico, hábitos, exames e medidas. Você sai com um plano alimentar feito para a sua rotina.", duracao: "60 min" },
  { titulo: "Retorno", texto: "Acompanhamento da evolução, ajustes no plano e novas metas para as próximas semanas.", duracao: "60 min" },
  { titulo: "Consulta online", texto: "O mesmo cuidado da consulta presencial, por videochamada, de onde você estiver.", duracao: "60 min" },
];

const passos = [
  { titulo: "Escolha o horário", texto: "Veja no calendário os horários livres do mês." },
  { titulo: "Preencha seus dados", texto: "Nome, celular e e-mail. Leva menos de um minuto." },
  { titulo: "Pronto", texto: "Sua consulta entra direto na agenda da nutricionista." },
];

export default function Inicio() {
  return (
    <>
      <Topo nome={nome} />
      <main>
        <section className="hero">
          <div className="hero-texto">
            <h1>Comer bem pode ser simples.</h1>
            <p>
              Acompanhamento nutricional individual, sem dietas da moda e sem cardápios impossíveis.
              Um plano pensado para o que você gosta de comer e para o tempo que você tem.
            </p>
            <Link href="/agendar" className="botao">Agendar uma consulta</Link>
          </div>
          <figure className="hero-citacao">
            <blockquote>“Saí da primeira consulta com um plano que eu consigo seguir de verdade.”</blockquote>
            <figcaption>Paciente fictícia, 34 anos</figcaption>
          </figure>
        </section>

        <section className="secao sobre">
          <h2>Sobre a clínica</h2>
          <div className="colunas">
            <p>
              A {nome} nasceu para oferecer um atendimento próximo e sem julgamentos. Atendemos adultos que
              querem mais disposição, controlar alguma condição de saúde ou simplesmente organizar a alimentação.
            </p>
            <p>
              À frente dos atendimentos está a nutricionista Ana Exemplo (CRN-3 00000), com 10 anos de experiência
              em nutrição clínica e comportamental.
            </p>
          </div>
        </section>

        <section className="secao">
          <h2>Atendimentos</h2>
          <div className="atendimentos">
            {atendimentos.map((a) => (
              <article key={a.titulo} className="atendimento">
                <h3>{a.titulo}</h3>
                <p>{a.texto}</p>
                <span>{a.duracao}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="secao">
          <h2>Como agendar</h2>
          <ol className="passos">
            {passos.map((p) => (
              <li key={p.titulo}>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </li>
            ))}
          </ol>
          <Link href="/agendar" className="botao">Agendar uma consulta</Link>
        </section>

        <section className="secao contato">
          <h2>Onde estamos</h2>
          <p>Rua Exemplo, 123, sala 4, Centro, Serra Negra (SP)</p>
          <p>WhatsApp (19) 90000-0000</p>
          <p>contato@exemplo.com.br</p>
          <p>Segunda a sexta, 8h às 18h. Sábados, 8h às 12h.</p>
        </section>
      </main>
      <footer className="rodape">© {new Date().getFullYear()} {nome}</footer>
    </>
  );
}
