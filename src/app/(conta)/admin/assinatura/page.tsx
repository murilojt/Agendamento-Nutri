"use client";

import { useEffect, useRef, useState } from "react";
import { carregarConfigRodape, salvarConfigRodape } from "@/lib/configuracoesNutri";
import { reduzirAssinatura } from "@/lib/imagemAssinatura";
import { comPadrao, linhasDoRodape, RODAPE_PADRAO, type ConfigRodape } from "@/lib/rodapePdf.ts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Carregando } from "@/components/ui/Carregando";
import { ErrorText } from "@/components/ui/ErrorText";
import { TextField } from "@/components/ui/TextField";

const vazio = (v: string | null) => v ?? "";

export default function AssinaturaPage() {
  const [carregando, setCarregando] = useState(true);
  const [tabelaExiste, setTabelaExiste] = useState(true);
  const [cfg, setCfg] = useState<ConfigRodape>(comPadrao(null));
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [lendoImagem, setLendoImagem] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    carregarConfigRodape().then(({ config, tabelaExiste: ok }) => {
      setCfg(config);
      setTabelaExiste(ok);
      setCarregando(false);
    });
  }, []);

  const muda = (campo: keyof ConfigRodape) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSalvo(false);
    setCfg((c) => ({ ...c, [campo]: e.target.value }));
  };

  async function escolherImagem(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    setSalvo(false);
    setLendoImagem(true);
    try {
      setCfg((c) => ({ ...c, signature_data: null }));
      const data = await reduzirAssinatura(arquivo);
      setCfg((c) => ({ ...c, signature_data: data }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível usar esta imagem.");
    } finally {
      setLendoImagem(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvo(false);
    setSalvando(true);
    const falha = await salvarConfigRodape(cfg);
    setSalvando(false);
    if (falha) setErro(falha);
    else setSalvo(true);
  }

  if (carregando) return <Carregando />;

  const linhas = linhasDoRodape(cfg);

  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 text-3xl">Assinatura e dados do PDF</h1>
      <p className="mb-8 text-sm" style={{ color: "var(--color-text-muted)" }}>
        Estes dados saem no rodapé de todas as páginas do PDF da dieta: o texto da clínica no canto esquerdo e a assinatura no canto direito.
      </p>

      {!tabelaExiste && (
        <Card className="mb-6 p-5" style={{ borderColor: "var(--gema)" }}>
          <p className="text-sm">
            Para <strong>salvar</strong> a assinatura, rode o script <strong>09-assinatura-e-rodape-do-pdf.sql</strong> no Supabase (pasta <code>supabase/</code> do projeto). Enquanto isso, o PDF usa os dados padrão e fica sem assinatura.
          </p>
        </Card>
      )}

      <form onSubmit={salvar}>
        <Card className="mb-6 p-6">
          <h2 className="mb-1 text-xl">Assinatura</h2>
          <p className="mb-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Envie uma imagem da assinatura (PNG, JPG ou WebP), de preferência com fundo branco ou transparente. Ela é reduzida automaticamente.
          </p>
          <div className="mb-4 flex min-h-28 items-center justify-center rounded-2xl border border-dashed p-4" style={{ borderColor: "var(--color-border)", background: "#ffffff" }}>
            {cfg.signature_data ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cfg.signature_data} alt="Assinatura da nutricionista" className="max-h-28 max-w-full" />
            ) : (
              <p className="text-sm" style={{ color: "#6b5248" }}>{lendoImagem ? "Processando imagem..." : "Nenhuma assinatura enviada"}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-full px-5 py-2.5 text-sm font-semibold" style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}>
              {cfg.signature_data ? "Trocar imagem" : "Escolher imagem"}
              <input ref={entrada} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={lendoImagem} onChange={(e) => escolherImagem(e.target.files?.[0])} />
            </label>
            {cfg.signature_data && (
              <button type="button" onClick={() => { setCfg((c) => ({ ...c, signature_data: null })); setSalvo(false); }} className="text-sm font-semibold underline" style={{ color: "var(--color-danger)" }}>
                Remover assinatura
              </button>
            )}
          </div>
        </Card>

        <Card className="mb-6 p-6">
          <h2 className="mb-1 text-xl">Dados do rodapé</h2>
          <p className="mb-4 text-sm" style={{ color: "var(--color-text-muted)" }}>Campos em branco não aparecem no PDF.</p>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <TextField label="Clínica" value={vazio(cfg.clinic_name)} onChange={muda("clinic_name")} placeholder={RODAPE_PADRAO.clinic_name} />
            <TextField label="Nome da nutricionista" value={vazio(cfg.display_name)} onChange={muda("display_name")} placeholder={RODAPE_PADRAO.display_name} />
            <TextField label="CRN" value={vazio(cfg.crn)} onChange={muda("crn")} placeholder={RODAPE_PADRAO.crn} />
            <TextField label="Telefone" value={vazio(cfg.phone)} onChange={muda("phone")} placeholder={RODAPE_PADRAO.phone} />
          </div>
          <TextField label="E-mail" type="email" value={vazio(cfg.email)} onChange={muda("email")} placeholder={RODAPE_PADRAO.email} />
        </Card>

        <Card className="mb-6 p-6">
          <h2 className="mb-3 text-xl">Como fica no PDF</h2>
          <div className="flex items-end justify-between gap-6 rounded-2xl border p-4" style={{ borderColor: "var(--color-border)", background: "#ffffff", color: "#2b1a17" }} aria-label="Pré-visualização do rodapé">
            <div className="text-xs leading-5" style={{ color: "#6b5248" }} data-testid="previa-linhas">
              {linhas.map((l, i) => (
                <p key={i} className={i === 0 ? "font-semibold" : ""}>{l}</p>
              ))}
              {linhas.length === 0 && <p>(sem texto)</p>}
            </div>
            <div className="flex h-14 w-40 items-end justify-end">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {cfg.signature_data && <img src={cfg.signature_data} alt="" className="max-h-14 max-w-full" />}
            </div>
          </div>
        </Card>

        <ErrorText>{erro}</ErrorText>
        {salvo && <p role="status" className="mb-3 text-sm font-semibold" style={{ color: "var(--color-primary)" }}>Salvo. O próximo PDF já sai com estes dados.</p>}
        <Button type="submit" disabled={salvando || lendoImagem}>{salvando ? "Salvando..." : "Salvar"}</Button>
      </form>
    </div>
  );
}
