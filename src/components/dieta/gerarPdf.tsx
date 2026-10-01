import { lerSvgVetorial, montarDadosPdf, nomeDoArquivoPdf, type EntradaPdf } from "@/lib/pdfDieta.ts";

async function carregarLogo(caminho: string) {
  try {
    const r = await fetch(caminho);
    return r.ok ? lerSvgVetorial(await r.text()) : null;
  } catch {
    return null; // sem o logo o PDF sai com o nome da clínica em texto
  }
}

/** Monta o PDF no navegador (nada é enviado a servidor) e baixa o arquivo. */
export async function baixarPdfDieta(entrada: Omit<EntradaPdf, "logos" | "agora">): Promise<string> {
  const agora = new Date();
  const [isotipo, logotipo] = await Promise.all([carregarLogo("/marca/ayllus-isotipo-dourado.svg"), carregarLogo("/marca/ayllus-logotipo-dourado.svg")]);
  const dados = montarDadosPdf({ ...entrada, agora, logos: { isotipo, logotipo } });

  // A biblioteca de PDF é grande: só é baixada quando alguém exporta
  const [{ pdf }, { DietaPdf, registrarFontes }] = await Promise.all([import("@react-pdf/renderer"), import("./DietaPdf")]);
  registrarFontes(window.location.origin);
  const blob = await pdf(<DietaPdf d={dados} />).toBlob();

  const nome = nomeDoArquivoPdf(dados.paciente.nome, agora);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return nome;
}
