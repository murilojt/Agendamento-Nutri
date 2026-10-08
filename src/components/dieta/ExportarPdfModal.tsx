"use client";

import { useEffect, useState } from "react";
import { OPCOES_PADRAO, type OpcoesPdf } from "@/lib/pdfDieta.ts";
import { Modal } from "./Modal";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";

const CHAVE = "pdfOpcoes";

const ITENS: { chave: keyof OpcoesPdf; titulo: string; dica: string }[] = [
  { chave: "macrosPorRefeicao", titulo: "Macros de cada refeição", dica: "Proteínas, lipídios, carboidratos e calorias ao lado do nome da refeição." },
  { chave: "kcalPorAlimento", titulo: "Calorias de cada alimento", dica: "Mostra as kcal ao lado de cada item." },
  { chave: "substitutos", titulo: "Substitutos dos alimentos", dica: "Mostra, abaixo de cada alimento, as opções que podem ser comidas no lugar." },
  { chave: "resumoDoDia", titulo: "Resumo do dia", dica: "Calorias totais e distribuição de proteínas, carboidratos e lipídios." },
  { chave: "suplementos", titulo: "Suplementos e produtos", dica: "O texto cadastrado na finalização do planejamento." },
  { chave: "receitas", titulo: "Receitas", dica: "O texto de receitas culinárias, se houver." },
  { chave: "listaDeCompras", titulo: "Lista de compras (7 dias)", dica: "Soma de todos os alimentos da rotina." },
  { chave: "comparacaoComMetas", titulo: "Prescrito x meta (visão clínica)", dica: "Tabela de análise com as metas do protocolo. Normalmente não vai para o paciente." },
];

/** Janela com as opções de conteúdo do PDF. `gerar` monta e baixa o arquivo. */
export function ExportarPdfModal({ aberto, aoFechar, gerar, semRefeicoes }: { aberto: boolean; aoFechar: () => void; gerar: (o: OpcoesPdf) => Promise<string>; semRefeicoes: boolean }) {
  const [opcoes, setOpcoes] = useState<OpcoesPdf>(OPCOES_PADRAO);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    setErro(null);
    setPronto(null);
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? "null");
      if (salvo && typeof salvo === "object") setOpcoes({ ...OPCOES_PADRAO, ...salvo });
    } catch {
      // sem armazenamento: usa o padrão
    }
  }, [aberto]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setPronto(null);
    setGerando(true);
    try {
      localStorage.setItem(CHAVE, JSON.stringify(opcoes));
    } catch {
      // ignora
    }
    try {
      setPronto(await gerar(opcoes));
    } catch (err) {
      console.error(err);
      setErro("Não foi possível gerar o PDF. Atualize a página e tente de novo.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Exportar dieta em PDF">
      <form onSubmit={enviar}>
        <p className="mb-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
          O PDF sai com a identidade Ayllus e é gerado no seu navegador: nada é enviado a nenhum servidor. Escolha o que incluir.
        </p>
        <ul className="mb-5 flex flex-col gap-1">
          {ITENS.map((i) => (
            <li key={i.chave}>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl px-3 py-2 hover:bg-[var(--fundo-alt)]">
                <input type="checkbox" className="mt-1" checked={opcoes[i.chave]} onChange={(e) => setOpcoes({ ...opcoes, [i.chave]: e.target.checked })} />
                <span>
                  <span className="block text-sm font-semibold">{i.titulo}</span>
                  <span className="block text-xs" style={{ color: "var(--color-text-muted)" }}>{i.dica}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        {semRefeicoes && <p className="mb-3 text-sm" style={{ color: "var(--color-text-muted)" }}>Esta dieta ainda não tem refeições: o PDF sairá só com o cabeçalho.</p>}
        <ErrorText>{erro}</ErrorText>
        {pronto && <p role="status" className="mb-3 text-sm font-semibold" style={{ color: "var(--color-primary)" }}>PDF gerado: {pronto}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={gerando}>{gerando ? "Gerando PDF..." : "Gerar PDF"}</Button>
          <button type="button" onClick={() => setOpcoes(OPCOES_PADRAO)} className="text-sm font-semibold underline">Restaurar padrão</button>
        </div>
      </form>
    </Modal>
  );
}
