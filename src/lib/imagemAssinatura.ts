/**
 * Prepara a imagem da assinatura no navegador: reduz para caber (600x240) e devolve um PNG em data URL
 * pequeno (a imagem fica guardada no banco). Se o PNG ficar grande demais, reduz mais e, em último caso, usa JPEG.
 */
const LIMITE_CARACTERES = 300_000;
const MAX_LARGURA = 600;
const MAX_ALTURA = 240;
export const TAMANHO_MAXIMO_ARQUIVO = 10 * 1024 * 1024;

function carregar(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não consegui abrir esta imagem. Use um arquivo PNG, JPG ou WebP."));
    };
    img.src = url;
  });
}

export async function reduzirAssinatura(arquivo: File): Promise<string> {
  if (!arquivo.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem (PNG, JPG ou WebP).");
  if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) throw new Error("A imagem é grande demais (máximo 10 MB).");
  const img = await carregar(arquivo);
  if (!img.naturalWidth || !img.naturalHeight) throw new Error("A imagem está vazia.");

  const desenhar = (escala: number, fundoBranco: boolean) => {
    const f = Math.min(MAX_LARGURA / img.naturalWidth, MAX_ALTURA / img.naturalHeight, 1) * escala;
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * f));
    c.height = Math.max(1, Math.round(img.naturalHeight * f));
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("O navegador não conseguiu processar a imagem.");
    if (fundoBranco) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
    }
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c;
  };

  for (const escala of [1, 0.75, 0.5]) {
    const png = desenhar(escala, false).toDataURL("image/png");
    if (png.length <= LIMITE_CARACTERES) return png;
  }
  // PNG muito pesado (foto de assinatura em papel): JPEG com fundo branco
  for (const escala of [1, 0.75, 0.5]) {
    const jpg = desenhar(escala, true).toDataURL("image/jpeg", 0.85);
    if (jpg.length <= LIMITE_CARACTERES) return jpg;
  }
  throw new Error("Não consegui reduzir esta imagem o bastante. Tente uma imagem mais simples ou menor.");
}
