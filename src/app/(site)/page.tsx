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
            <span className="etiqueta">Mariana Fernandes de Oliveira | Nutricionista clínica | CRN-3 61672</span>
            <h1>Nutrir o corpo, acolher a mente, cultivar o <em>ser</em>.</h1>
            <div className="hero-descricao">
              <p className="hero-destaque">Cuidado nutricional com ciência, escuta e estratégias possíveis para a sua vida.</p>
              <p>Talvez você já tenha ouvido que, para melhorar sua saúde, basta ter força de vontade, cortar tudo o que gosta e seguir uma dieta rígida.</p>
              <p>Se esse caminho nunca funcionou para você, eu entendo. Cuidar da alimentação pode respeitar seus gostos, sua rotina e os momentos que fazem parte da sua vida.</p>
              <p>Na Ayllus, construímos juntos um tratamento para cuidar da sua saúde e ajudar você a se alimentar com mais autonomia e tranquilidade.</p>
            </div>
            <div className="hero-botoes">
              <Link href="/agendar" className="botao">Agendar minha consulta →</Link>
              <a href="#atendimentos" className="botao botao-contorno">Conhecer os atendimentos</a>
            </div>
          </div>
          <div className="arco" aria-hidden="true">
            <div className="arco-disco" />
            <div className="arco-moldura">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/marca/ayllus-isotipo-dourado.svg" alt="" width={168} height={191} />
            </div>
            <div className="arco-selo a">Nutrir o corpo</div>
            <div className="arco-selo b">acolher a mente</div>
            <div className="arco-selo c">cultivar o ser</div>
          </div>
        </section>

        <section className="secao publico" aria-labelledby="publico-titulo">
          <h2 id="publico-titulo">Um cuidado pensado para <em>você</em></h2>
          <div className="colunas">
            <p>Atendo adultos que desejam melhorar a alimentação, cuidar do peso e tratar condições como diabetes, colesterol e triglicérides elevados, doenças cardiovasculares e outras alterações metabólicas.</p>
            <p>O acompanhamento também considera as dificuldades do dia a dia: falta de tempo, organização das refeições, dúvidas sobre o que comer e a relação com a comida e com o corpo. O ponto de partida é conhecer você e encontrar mudanças possíveis de colocar em prática.</p>
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
          <p className="sobre-missao">
            Minha missão é ajudar pessoas a construir uma relação mais tranquila com a alimentação e cuidar da saúde com base em evidências científicas. Respeito a história, as condições de vida e as necessidades de cada pessoa, valorizando o direito à alimentação adequada e a autonomia nas escolhas.
          </p>
          <h2>Prazer, sou <em>Mariana</em>, a nutricionista por trás da Ayllus.</h2>
          <div className="sobre-corpo">
            <p>Sempre quis que meu trabalho pudesse trazer alívio, conforto e leveza para a vida das pessoas. Na nutrição, encontrei um jeito de fazer isso. Ao longo dos anos de atendimento, uma das experiências mais especiais foi acompanhar de perto as mudanças que cada pessoa construiu.</p>
            <p>Acredito em uma nutrição que começa pela escuta: antes de pensar em um plano alimentar, quero conhecer sua história, sua rotina, suas dificuldades e o que você espera do acompanhamento.</p>
            <p>Sou nutricionista formada pelo Centro Universitário São Camilo e fiz especialização em nutrição clínica pelo Hospital das Clínicas da Faculdade de Medicina da USP. Também tenho pós-graduação na mesma área pela VP. Em cerca de três anos de consultório, cheguei a acompanhar quase 150 pessoas por mês. Essa experiência me apresentou histórias muito diferentes e reforçou uma convicção: cada paciente precisa ser ouvido como uma pessoa, não tratado como mais um caso.</p>
          </div>
          <p className="sobre-fecho">Vamos encontrar um caminho que faça sentido para você?</p>
          <Link href="/agendar" className="botao">Agendar minha consulta →</Link>
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
