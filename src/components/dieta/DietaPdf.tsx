/* eslint-disable jsx-a11y/alt-text */
import { Document, Font, Page, Path, Polygon, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { DadosPdf, LogoVetorial, RefeicaoPdf } from "@/lib/pdfDieta.ts";
import type { LinhaCompra as LinhaCompraTipo } from "@/lib/nutricao.ts";

// Paleta do brandbook Ayllus
const VINHO = "#5c1e21";
const FLORESTA = "#0a422c";
const DOURADO = "#a6814a";
const DOURADO_CLARO = "#d6ad6f";
const AREIA = "#ebdfd0";
const CREME = "#faefe1";
const TINTA = "#2b1a17";
const MUDO = "#6b5248";
const LINHA = "#dccbb8";

let fontesRegistradas = false;
/** Registra as fontes da marca (arquivos em /public/fonts). Chamado uma vez, com o endereço do site. */
export function registrarFontes(origem: string) {
  if (fontesRegistradas) return;
  const f = (arq: string) => `${origem}/fonts/${arq}`;
  Font.register({
    family: "Playfair",
    fonts: [
      { src: f("playfair-display-latin-500-normal.woff"), fontWeight: 500 },
      { src: f("playfair-display-latin-500-italic.woff"), fontWeight: 500, fontStyle: "italic" },
      { src: f("playfair-display-latin-600-normal.woff"), fontWeight: 600 },
    ],
  });
  Font.register({
    family: "Hanken",
    fonts: [
      { src: f("hanken-grotesk-latin-400-normal.woff"), fontWeight: 400 },
      { src: f("hanken-grotesk-latin-600-normal.woff"), fontWeight: 600 },
      { src: f("hanken-grotesk-latin-700-normal.woff"), fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((palavra) => [palavra]); // sem hifenização no meio das palavras
  fontesRegistradas = true;
}

const s = StyleSheet.create({
  pagina: { paddingTop: 36, paddingBottom: 58, paddingHorizontal: 36, fontFamily: "Hanken", fontSize: 10, color: TINTA },
  faixa: { backgroundColor: VINHO, marginTop: -36, marginHorizontal: -36, paddingHorizontal: 36, paddingVertical: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  marca: { flexDirection: "row", alignItems: "center" },
  faixaTitulo: { fontFamily: "Playfair", fontWeight: 500, fontSize: 18, color: CREME, textAlign: "right" },
  faixaSub: { fontSize: 8, color: DOURADO_CLARO, textAlign: "right", marginTop: 2, letterSpacing: 1 },
  paciente: { marginTop: 20 },
  pacienteNome: { fontFamily: "Playfair", fontWeight: 500, fontSize: 24, color: VINHO },
  pacienteMeta: { fontSize: 9.5, color: MUDO, marginTop: 3 },
  caixa: { backgroundColor: CREME, borderRadius: 8, padding: 12, marginTop: 14, borderWidth: 0.75, borderColor: LINHA },
  rotulo: { fontSize: 7.5, fontWeight: 700, color: DOURADO, letterSpacing: 1.2, marginBottom: 4 },
  secao: { marginTop: 18 },
  secaoTitulo: { fontFamily: "Playfair", fontWeight: 500, fontSize: 15, color: FLORESTA, marginBottom: 8 },
  resumoLinha: { flexDirection: "row" },
  resumoCaixa: { flexGrow: 1, flexBasis: 0, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, marginRight: 6, borderWidth: 0.75, borderColor: LINHA, backgroundColor: "#ffffff" },
  resumoValor: { fontFamily: "Playfair", fontWeight: 600, fontSize: 15 },
  resumoNome: { fontSize: 8, color: MUDO, marginTop: 1 },
  barra: { flexDirection: "row", height: 7, borderRadius: 4, marginTop: 8, overflow: "hidden" },
  refeicao: { marginBottom: 10, borderRadius: 8, borderWidth: 0.75, borderColor: LINHA, overflow: "hidden" },
  refeicaoTopo: { backgroundColor: CREME, paddingVertical: 7, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", borderBottomWidth: 0.75, borderBottomColor: LINHA },
  hora: { backgroundColor: VINHO, color: CREME, fontSize: 9, fontWeight: 700, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 8, marginRight: 8 },
  refeicaoNome: { fontFamily: "Playfair", fontWeight: 600, fontSize: 12.5, color: TINTA, flexGrow: 1, flexShrink: 1 },
  refeicaoMacros: { fontSize: 8, color: MUDO, marginLeft: 8 },
  itemLinha: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4.5, paddingHorizontal: 10, borderTopWidth: 0.5, borderTopColor: AREIA },
  itemNome: { flexGrow: 1, flexShrink: 1, flexBasis: 0, paddingRight: 10 },
  colunaNome: { flexGrow: 1, flexShrink: 1, flexBasis: 0, paddingRight: 10 },
  itemQtd: { fontWeight: 700, color: FLORESTA, width: 52, textAlign: "right" },
  itemKcal: { color: MUDO, width: 52, textAlign: "right", fontSize: 8.5 },
  notas: { fontFamily: "Playfair", fontWeight: 500, fontSize: 9.5, fontStyle: "italic", color: MUDO, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#fffaf3" },
  vazio: { fontSize: 9, color: MUDO, padding: 10 },
  tabelaCab: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: DOURADO },
  tabelaLinha: { flexDirection: "row", paddingVertical: 4.5, borderBottomWidth: 0.5, borderBottomColor: AREIA },
  celCab: { fontSize: 8, fontWeight: 700, color: MUDO, letterSpacing: 0.6 },
  texto: { fontSize: 10, lineHeight: 1.5 },
  rodape: { position: "absolute", bottom: 22, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.75, borderTopColor: LINHA, paddingTop: 6 },
  rodapeTexto: { fontSize: 8, color: MUDO },
  rodapeLema: { fontFamily: "Playfair", fontStyle: "italic", fontWeight: 500, fontSize: 8.5, color: DOURADO },
});

const num = (n: number, casas = 1) => n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
const gramas = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} g`;
const kg = (g: number) => (g >= 1000 ? `${(g / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg` : gramas(g));
const dataBr = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

function Logo({ logo, altura, cor }: { logo: LogoVetorial | null; altura: number; cor: string }) {
  if (!logo) return null;
  return (
    <Svg viewBox={logo.viewBox} style={{ height: altura, width: (altura * logo.largura) / logo.altura }}>
      {logo.formas.map((f, i) => (f.tipo === "path" ? <Path key={i} d={f.d} fill={cor} fillRule="evenodd" /> : <Polygon key={i} points={f.pontos} fill={cor} />))}
    </Svg>
  );
}

function Refeicao({ r, d }: { r: RefeicaoPdf; d: DadosPdf }) {
  return (
    // Refeições curtas não se partem entre páginas; as muito longas podem quebrar
    <View style={s.refeicao} wrap={r.itens.length > 14}>
      <View style={s.refeicaoTopo} wrap={false}>
        {r.horario && <Text style={s.hora}>{r.horario}</Text>}
        <Text style={s.refeicaoNome}>{r.nome}</Text>
        {d.opcoes.macrosPorRefeicao && r.itens.length > 0 && (
          <Text style={s.refeicaoMacros}>
            P {num(r.total.protein_g)} g  ·  L {num(r.total.fat_g)} g  ·  C {num(r.total.carb_g)} g  ·  {Math.round(r.total.kcal)} kcal
          </Text>
        )}
      </View>
      {r.itens.length === 0 && <Text style={s.vazio}>Nenhum alimento definido para esta refeição.</Text>}
      {r.itens.map((i, k) => (
        <View key={k} style={s.itemLinha} wrap={false}>
          <View style={s.colunaNome}><Text>{i.nome}</Text></View>
          {d.opcoes.kcalPorAlimento && <Text style={s.itemKcal}>{Math.round(i.kcal)} kcal</Text>}
          <Text style={s.itemQtd}>{gramas(i.gramas)}</Text>
        </View>
      ))}
      {r.notas && <Text style={s.notas}>{r.notas}</Text>}
    </View>
  );
}

function LinhaCompra({ c }: { c: LinhaCompraTipo }) {
  return (
    <View style={s.tabelaLinha} wrap={false}>
      <View style={s.colunaNome}><Text>{c.nome}</Text></View>
      <Text style={{ width: 70, textAlign: "right" }}>{kg(c.gramasDia)}</Text>
      <Text style={{ width: 70, textAlign: "right", fontWeight: 700, color: FLORESTA }}>{kg(c.gramasSemana)}</Text>
    </View>
  );
}

function ResumoDoDia({ d }: { d: DadosPdf }) {
  const x = d.distribuicao;
  const caixa = (valor: string, nome: string, cor: string, ultimo = false) => (
    <View style={[s.resumoCaixa, ultimo ? { marginRight: 0 } : {}]}>
      <Text style={[s.resumoValor, { color: cor }]}>{valor}</Text>
      <Text style={s.resumoNome}>{nome}</Text>
    </View>
  );
  const partes = [
    { pct: x.proteina.pct, cor: VINHO },
    { pct: x.carboidrato.pct, cor: FLORESTA },
    { pct: x.lipidio.pct, cor: DOURADO_CLARO },
  ];
  return (
    <View style={s.secao} wrap={false}>
      <Text style={s.secaoTitulo}>Resumo do dia</Text>
      <View style={s.resumoLinha}>
        {caixa(`${Math.round(d.total.kcal)} kcal`, "Calorias", TINTA)}
        {caixa(`${num(d.total.protein_g)} g`, `Proteínas · ${num(x.proteina.pct)}%`, VINHO)}
        {caixa(`${num(d.total.carb_g)} g`, `Carboidratos · ${num(x.carboidrato.pct)}%`, FLORESTA)}
        {caixa(`${num(d.total.fat_g)} g`, `Lipídios · ${num(x.lipidio.pct)}%`, DOURADO, true)}
      </View>
      {x.totalKcal > 0 && (
        <View style={s.barra}>
          {partes.map((p, i) => (p.pct > 0 ? <View key={i} style={{ flexGrow: p.pct, flexBasis: 0, backgroundColor: p.cor }} /> : null))}
        </View>
      )}
    </View>
  );
}

export function DietaPdf({ d }: { d: DadosPdf }) {
  const meta = [d.paciente.idade != null ? `${d.paciente.idade} anos` : null, d.paciente.pesoKg ? `${num(d.paciente.pesoKg, 1)} kg` : null, d.paciente.alturaCm ? `${num(d.paciente.alturaCm, 0)} cm` : null].filter(Boolean).join("  ·  ");
  return (
    <Document title={`${d.titulo} - ${d.paciente.nome}`} author={d.nutricionista ?? d.clinica} subject="Plano alimentar" creator={d.clinica} producer={d.clinica} language="pt-BR">
      <Page size="A4" style={s.pagina}>
        <View style={s.faixa}>
          <View style={s.marca}>
            <Logo logo={d.logos.isotipo} altura={40} cor={DOURADO_CLARO} />
            <View style={{ width: 10 }} />
            <Logo logo={d.logos.logotipo} altura={26} cor={DOURADO_CLARO} />
            {!d.logos.isotipo && !d.logos.logotipo && <Text style={[s.faixaTitulo, { textAlign: "left" }]}>{d.clinica}</Text>}
          </View>
          <View>
            <Text style={s.faixaTitulo}>{d.titulo}</Text>
            <Text style={s.faixaSub}>PLANO ALIMENTAR INDIVIDUAL</Text>
          </View>
        </View>

        <View style={s.paciente}>
          <Text style={s.pacienteNome}>{d.paciente.nome}</Text>
          {meta !== "" && <Text style={s.pacienteMeta}>{meta}</Text>}
          <Text style={s.pacienteMeta}>
            {d.nutricionista ? `Elaborado por ${d.nutricionista}  ·  ` : ""}
            {dataBr(d.geradoEm)}
          </Text>
        </View>

        {d.objetivo && (
          <View style={s.caixa} wrap={false}>
            <Text style={s.rotulo}>OBJETIVO E ORIENTAÇÕES</Text>
            <Text style={s.texto}>{d.objetivo}</Text>
          </View>
        )}

        {d.opcoes.resumoDoDia && d.refeicoes.length > 0 && <ResumoDoDia d={d} />}

        <View style={s.secao}>
          <Text style={s.secaoTitulo} minPresenceAhead={80}>Rotina alimentar</Text>
          {d.refeicoes.length === 0 && <Text style={s.vazio}>Nenhuma refeição cadastrada.</Text>}
          {d.refeicoes.map((r, i) => (
            <Refeicao key={i} r={r} d={d} />
          ))}
        </View>

        {d.analise && (
          <View style={s.secao} wrap={false}>
            <Text style={s.secaoTitulo}>Prescrito e meta</Text>
            <View style={s.tabelaCab}>
              <View style={s.colunaNome}><Text style={s.celCab}>PARÂMETRO</Text></View>
              <Text style={[s.celCab, { width: 80, textAlign: "right" }]}>PRESCRITO</Text>
              <Text style={[s.celCab, { width: 80, textAlign: "right" }]}>META</Text>
              <Text style={[s.celCab, { width: 80, textAlign: "right" }]}>DIFERENÇA</Text>
            </View>
            {d.analise.map((l) => {
              const f = (v: number | null, c = 1) => (v == null ? "-" : `${num(v, c)}${l.unidade ? ` ${l.unidade}` : ""}`);
              return (
                <View key={l.rotulo} style={s.tabelaLinha}>
                  <View style={s.colunaNome}><Text>{l.rotulo}</Text></View>
                  <Text style={{ width: 80, textAlign: "right" }}>{f(l.prescrito, l.unidade === "kcal/g" ? 2 : 1)}</Text>
                  <Text style={{ width: 80, textAlign: "right" }}>{f(l.teorico)}</Text>
                  <Text style={{ width: 80, textAlign: "right", fontWeight: 700, color: l.diferenca != null && l.diferenca < 0 ? VINHO : FLORESTA }}>
                    {l.diferenca == null ? "-" : `${l.diferenca > 0 ? "+" : ""}${num(l.diferenca)}${l.unidade === "kcal" ? " kcal" : l.unidade === "g" ? " g" : ""}`}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {d.suplementos && (
          <View style={s.secao} wrap={false}>
            <Text style={s.secaoTitulo}>Suplementos e produtos</Text>
            <View style={s.caixa}><Text style={s.texto}>{d.suplementos}</Text></View>
          </View>
        )}

        {d.receitas && (
          <View style={s.secao}>
            <Text style={s.secaoTitulo} minPresenceAhead={60}>Receitas</Text>
            <View style={s.caixa}><Text style={s.texto}>{d.receitas}</Text></View>
          </View>
        )}

        {d.compras && d.compras.length > 0 && (
          <View style={s.secao}>
            {/* título, cabeçalho e as primeiras linhas ficam juntos: nunca sobra o título sozinho no fim da página */}
            <View wrap={false}>
              <Text style={s.secaoTitulo}>Lista de compras</Text>
              <View style={s.tabelaCab}>
                <View style={s.colunaNome}><Text style={s.celCab}>ALIMENTO</Text></View>
                <Text style={[s.celCab, { width: 70, textAlign: "right" }]}>POR DIA</Text>
                <Text style={[s.celCab, { width: 70, textAlign: "right" }]}>7 DIAS</Text>
              </View>
              {d.compras.slice(0, 3).map((c, i) => (
                <LinhaCompra key={i} c={c} />
              ))}
            </View>
            {d.compras.slice(3).map((c, i) => (
              <LinhaCompra key={i} c={c} />
            ))}
          </View>
        )}

        <View style={s.rodape} fixed>
          <Text style={s.rodapeLema}>{d.clinica}  ·  {d.lema}</Text>
          <Text style={s.rodapeTexto} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
