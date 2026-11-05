import Link from "next/link";
import { Topo } from "@/components/Topo";

// Textos fictícios: troque pelos dados reais da clínica.
const nome = process.env.NEXT_PUBLIC_NOME_CLINICA ?? "Ayllus Nutrição";

const especialidades = ["Emagrecimento saudável", "Reeducação alimentar", "Nutrição esportiva", "Saúde intestinal", "Gestação e pós-parto"];

const passos = [
  { titulo: "Escolha o horário", texto: "Selecione a modalidade, o dia e o horário que melhor se adaptam à sua rotina." },
  { titulo: "Preencha seus dados", texto: "Informe seus dados para concluir o agendamento." },
  { titulo: "Questionário e orientações iniciais antes da primeira consulta", texto: "Você receberá, por e-mail ou WhatsApp, o questionário inicial e as informações para se preparar para a consulta." },
  { titulo: "Pronto", texto: "É só aguardar a data para a consulta." },
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
          <h2>Como funcionam meus <em>atendimentos</em>?</h2>

          <div className="atend-primeira">
            <h3>Primeira consulta</h3>
            <div className="atend-passos">
              <article className="atend-passo p1">
                <div className="atend-cab"><span className="atend-num" aria-hidden="true">1</span><h4>Antes da consulta</h4></div>
                <div className="atend-texto"><p>Depois do agendamento, você recebe as informações para se preparar: como funciona a consulta, quais exames trazer, orientações para a avaliação física, pagamento e como solicitar uma remarcação.</p>
                <p>Você também responde a um questionário para que eu conheça um pouco da sua saúde e dos seus objetivos antes de nos encontrarmos.</p>
                </div>
              </article>
              <article className="atend-passo p2">
                <div className="atend-cab"><span className="atend-num" aria-hidden="true">2</span><h4>No dia do atendimento</h4></div>
                <div className="atend-texto"><p>Te recebo e começo pela conversa. Na primeira consulta, quero entender seus objetivos, sua rotina, as dificuldades com a alimentação e o que você já tentou fazer. É o seu momento de falar.</p>
                <p>Quando indicada, faço a avaliação física e a bioimpedância para acompanhar mudanças físicas ao longo do tempo. Essas medidas são ferramentas de avaliação. Também conversamos sobre sinais e sintomas que não aparecem nos números.</p>
                <p>Juntos, organizamos sua alimentação e definimos metas para o próximo mês. O plano pode incluir refeições, compras, preparo de alimentos, sono, exercício físico e outras mudanças que façam sentido para a sua rotina. Não é preciso mudar tudo de uma vez.</p>
                </div>
              </article>
              <article className="atend-passo p3">
                <div className="atend-cab"><span className="atend-num" aria-hidden="true">3</span><h4>Após a consulta</h4></div>
                <div className="atend-texto"><p>Ficamos em contato pelo WhatsApp. Pode contar comigo para responder dúvidas e te ajudar caso haja dificuldades na execução do plano que traçamos. O prazo de resposta é de até dois dias úteis.</p>
                <p>Após a consulta, você também poderá avaliar o atendimento por meio de um questionário, com opção de resposta anônima.</p>
                </div>
              </article>
            </div>
          </div>

          <div className="atend-outros">
            <article className="atend-card">
              <h3>Retornos</h3>
              <p>Nas consultas de retorno, conversamos sobre sua evolução, reconhecemos suas conquistas e identificamos as dificuldades para colocar em prática as estratégias combinadas. A partir dessa troca, ajustamos o plano alimentar e definimos novas metas, respeitando sua rotina, suas necessidades e seu ritmo.</p>
              <p>Quando indicado, reavaliamos sua composição corporal por meio da bioimpedância e da adipometria. Esse é um momento para esclarecer dúvidas e aprofundar seus conhecimentos sobre alimentação, ajudando você a fazer escolhas com mais autonomia e confiança no dia a dia.</p>
            </article>
            <article className="atend-card atend-online">
              <h3>Consultas online</h3>
              <p>As consultas online seguem o mesmo cuidado e personalização do atendimento presencial, com a praticidade de estar onde você se sentir mais à vontade. Nesse formato, não realizamos a avaliação física com bioimpedância e adipometria. Quando necessário e se você se sentir confortável, ensino como registrar medidas corporais e fotos para complementar o acompanhamento.</p>
            </article>
          </div>

          <Link href="/agendar" className="botao">Agendar minha consulta →</Link>
        </section>

        <section className="secao pilares" id="pilares" aria-labelledby="pilares-titulo">
          <h2 id="pilares-titulo">Os três <em>pilares</em> do nosso cuidado</h2>
          <p className="pilares-intro">Mudanças consistentes são construídas ao longo do tempo. Durante o acompanhamento, trabalhamos três pilares que se complementam:</p>
          <div className="pilares-grade">
            <article className="pilar pilar-corpo">
              <div className="pilar-capitel">
                <span className="pilar-num" aria-hidden="true">1</span>
                <h3>Nutrir o corpo</h3>
              </div>
              <div className="pilar-fuste">
                <p>Investigamos sua saúde, seus sintomas, seus exames e sua alimentação. Organizamos refeições, planejamento, sono e exercicio físico para construir uma base de cuidado possível de manter.</p>
              </div>
            </article>
            <article className="pilar pilar-mente">
              <div className="pilar-capitel">
                <span className="pilar-num" aria-hidden="true">2</span>
                <h3>Acolher a mente</h3>
              </div>
              <div className="pilar-fuste">
                <p>Olhamos para as dificuldades que atravessam a alimentação: estresse, ansiedade, emoções, falta de tempo e sua relação com a comida e com o corpo.</p>
                <p>Conforme suas necessidades, utilizamos ferramentas de educação nutricional e comportamento alimentar para compreender padrões e construir estratégias para situações do cotidiano.</p>
              </div>
            </article>
            <article className="pilar pilar-ser">
              <div className="pilar-capitel">
                <span className="pilar-num" aria-hidden="true">3</span>
                <h3>Cultivar o ser</h3>
              </div>
              <div className="pilar-fuste">
                <p>Ao longo do processo, você aprende a reconhecer o que funciona para você, fazer ajustes com flexibilidade e lidar com mudanças na rotina.</p>
                <p>O objetivo é desenvolver autonomia para cuidar da alimentação e sustentar suas conquistas, com espaço para seus gostos, seus vínculos e seus momentos de prazer.</p>
              </div>
            </article>
          </div>
        </section>

      </main>
      <div className="faixa-clara">
        <section className="secao">
          <span className="rotulo">Como agendar</span>
          <h2>Quatro passos, <em>um</em> horário</h2>
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
