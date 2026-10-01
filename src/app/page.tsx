import Link from "next/link";
import { Topo } from "@/components/Topo";

// Textos fictícios: troque pelos dados reais da clínica.
const nome = process.env.NEXT_PUBLIC_NOME_CLINICA ?? "Ayllus Nutrição";

const atendimentos = [
  { titulo: "Primeira consulta", texto: "Avaliação completa: histórico, hábitos, exames e medidas. Você sai com um plano alimentar feito para a sua rotina.", duracao: "60 min" },
  { titulo: "Retorno", texto: "Acompanhamento da evolução, ajustes no plano e novas metas para as próximas semanas.", duracao: "60 min" },
  { titulo: "Consulta online", texto: "O mesmo cuidado da consulta presencial, por videochamada, de onde você estiver.", duracao: "60 min" },
];

const especialidades = ["Emagrecimento saudável", "Reeducação alimentar", "Nutrição esportiva", "Saúde intestinal", "Gestação e pós-parto"];

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
            <span className="etiqueta">Nutricionista clínica · CRN-3 00000</span>
            <h1>Comer bem é uma <em>conversa</em>, não uma dieta.</h1>
            <p>
              Acompanhamento nutricional individual, sem dietas da moda e sem cardápios impossíveis.
              Um plano pensado para o que você gosta de comer e para o tempo que você tem.
            </p>
            <div className="hero-botoes">
              <Link href="/agendar" className="botao">Agendar minha consulta →</Link>
              <a href="#atendimentos" className="botao botao-contorno">Conhecer os atendimentos</a>
            </div>
          </div>
          <div className="arco" aria-hidden="true">
            <div className="arco-disco" />
            <div className="arco-moldura">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/marca/ayllus-isotipo.png" alt="" width={168} height={191} />
            </div>
            <div className="arco-selo a">Plano 100% personalizado</div>
            <div className="arco-selo b">Sem alimentos proibidos</div>
          </div>
        </section>
      </main>

      <div className="faixa" aria-hidden="true">
        <div className="faixa-trilho">
          {[0, 1].map((i) => (
            <div key={i} style={{ display: "flex", gap: "3rem" }}>
              {especialidades.map((e) => <span key={`${i}-${e}`}>{e}</span>)}
            </div>
          ))}
        </div>
      </div>

      <main>
        <section className="secao sobre">
          <span className="rotulo">Sobre</span>
          <h2>Cuidado <em>próximo</em>, sem julgamentos</h2>
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

        <section className="secao" id="atendimentos">
          <span className="rotulo">Atendimentos</span>
          <h2>Do jeito que <em>você</em> precisa</h2>
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

      </main>
      <div className="faixa-clara">
        <section className="secao">
          <span className="rotulo">Como agendar</span>
          <h2>Três passos, <em>um</em> horário</h2>
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

      </div>
      <main>
        <figure className="depoimento">
          <span className="estrelas" aria-label="5 estrelas">★★★★★</span>
          <blockquote>“Saí da primeira consulta com um plano que eu consigo seguir de verdade.”</blockquote>
          <figcaption>Paciente fictícia, 34 anos</figcaption>
        </figure>

        <section className="secao contato">
          <span className="rotulo">Contato</span>
          <h2>Onde <em>estamos</em></h2>
          <p>Rua Exemplo, 123, sala 4, Centro, Serra Negra (SP)</p>
          <p>WhatsApp (19) 90000-0000</p>
          <p>contato@exemplo.com.br</p>
          <p>Segunda a sexta, 8h às 18h. Sábados, 8h às 12h.</p>
        </section>
      </main>
      <footer className="rodape">
        <span>© {new Date().getFullYear()} {nome}</span>
        <span className="lema">Nutrir o corpo, acolher a mente, cultivar o ser.</span>
      </footer>
    </>
  );
}
