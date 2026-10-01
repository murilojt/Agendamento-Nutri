/**
 * Dados do rodapé do PDF da dieta: texto da clínica (canto esquerdo) e assinatura (canto direito).
 * Funções puras, testadas em tests/rodape.test.ts.
 */

export type ConfigRodape = {
  clinic_name: string | null;
  display_name: string | null;
  crn: string | null;
  phone: string | null;
  email: string | null;
  signature_data: string | null;
};

/** Valores de partida (padrão da clínica). A nutricionista pode alterar em /admin/assinatura. */
export const RODAPE_PADRAO = {
  clinic_name: "Clínica Ayllus",
  display_name: "Mariana Fernandes",
  crn: "CRN3 61672",
  phone: "(11) 91365-7788",
  email: "nutri.marianafernandes@gmail.com",
} as const;

const limpa = (s: string | null | undefined) => s?.replace(/\s+/g, " ").trim() ?? "";

/** Config salva + padrão para o que estiver em branco (campo nunca salvo). Campo apagado de propósito ("") fica vazio. */
export function comPadrao(salva: Partial<ConfigRodape> | null | undefined): ConfigRodape {
  const s = salva ?? {};
  const v = (campo: keyof typeof RODAPE_PADRAO) => (s[campo] == null ? RODAPE_PADRAO[campo] : s[campo]);
  return {
    clinic_name: v("clinic_name"),
    display_name: v("display_name"),
    crn: v("crn"),
    phone: v("phone"),
    email: v("email"),
    signature_data: s.signature_data ?? null,
  };
}

/**
 * As linhas do rodapé, na ordem:
 *   Clínica Ayllus | Nutricionista Mariana Fernandes
 *   CRN3 61672
 *   Tel.:(11) 91365-7788
 *   E-mail: nutri.marianafernandes@gmail.com
 * Campos em branco não geram linha.
 */
export function linhasDoRodape(c: Pick<ConfigRodape, "clinic_name" | "display_name" | "crn" | "phone" | "email">): string[] {
  const clinica = limpa(c.clinic_name);
  const nome = limpa(c.display_name);
  const primeira = [clinica, nome ? `Nutricionista ${nome}` : ""].filter(Boolean).join(" | ");
  const tel = limpa(c.phone);
  const email = limpa(c.email);
  return [primeira, limpa(c.crn), tel ? `Tel.:${tel}` : "", email ? `E-mail: ${email}` : ""].filter(Boolean);
}

/** Aceita só imagem PNG ou JPEG em data URL, de tamanho razoável (o react-pdf não desenha WebP). */
export function assinaturaValida(data: string | null | undefined): data is string {
  return typeof data === "string" && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(data) && data.length <= 400_000;
}

/** Quanto cabe a imagem da assinatura no PDF: mantém a proporção dentro de uma caixa. */
export function medidasDaAssinatura(largura: number, altura: number, maxLargura = 150, maxAltura = 52): { largura: number; altura: number } {
  if (!(largura > 0) || !(altura > 0)) return { largura: maxLargura, altura: maxAltura };
  const f = Math.min(maxLargura / largura, maxAltura / altura, 1); // nunca amplia (ficaria borrado)
  return { largura: Math.round(largura * f * 10) / 10, altura: Math.round(altura * f * 10) / 10 };
}

/** Largura e altura (em pixels) de um PNG ou JPEG em data URL, lidas do cabeçalho do arquivo. Null se não der. */
export function dimensoesDaImagem(dataUrl: string): { largura: number; altura: number } | null {
  const m = dataUrl.match(/^data:image\/(png|jpeg);base64,(.+)$/);
  if (!m) return null;
  let b: Uint8Array;
  try {
    const bin = atob(m[2].slice(0, m[1] === "png" ? 64 : m[2].length));
    b = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
  if (m[1] === "png") {
    // assinatura PNG (8 bytes), depois o bloco IHDR: largura e altura em 4 bytes cada (a partir do byte 16)
    if (b.length < 24 || b[1] !== 0x50 || b[2] !== 0x4e || b[3] !== 0x47) return null;
    const u32 = (i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
    return { largura: u32(16), altura: u32(20) };
  }
  // JPEG: percorre os blocos até o SOF (0xC0..0xCF, menos 0xC4, 0xC8 e 0xCC), que traz altura e largura
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marcador = b[i + 1];
    if (marcador >= 0xc0 && marcador <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marcador)) return { altura: (b[i + 5] << 8) | b[i + 6], largura: (b[i + 7] << 8) | b[i + 8] };
    i += 2 + ((b[i + 2] << 8) | b[i + 3]);
  }
  return null;
}
