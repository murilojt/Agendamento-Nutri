"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, supabaseConfigurado, MSG_NAO_CONFIGURADO } from "@/lib/supabase";
import { validarSenhaNova } from "@/lib/senha";
import { CabecalhoConta } from "@/components/CabecalhoConta";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";

// Tela obrigatória no primeiro acesso com senha provisória (definida pela nutricionista)
export default function TrocarSenhaPage() {
  const router = useRouter();
  const [pronto, setPronto] = useState(false);
  const [provisoria, setProvisoria] = useState("");
  const [nova, setNova] = useState("");
  const [repetida, setRepetida] = useState("");
  const [erro, setErro] = useState<string | null>(supabaseConfigurado ? null : MSG_NAO_CONFIGURADO);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/entrar");
      else setPronto(true);
    });
  }, [router]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const invalida = validarSenhaNova(nova, repetida, provisoria);
    if (invalida) return setErro(invalida);

    setSalvando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: nova });
      if (error) return setErro(error.message.includes("different") ? "Escolha uma senha diferente da provisória." : "Não foi possível salvar a nova senha. Tente de novo.");
      const { data: { session } } = await supabase.auth.getSession();
      await fetch("/api/conta/senha-trocada", { method: "POST", headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } });
      router.replace("/paciente");
    } catch {
      setErro("Não foi possível conectar ao servidor. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  async function sair() {
    await supabase.auth.signOut();
    router.replace("/entrar");
  }

  return (
    <div className="min-h-screen px-4 py-4">
      <CabecalhoConta />
      <div className="flex items-center justify-center pt-12">
        <Card className="w-full max-w-sm p-8">
          <h1 className="mb-1 text-3xl">Crie sua senha</h1>
          <p className="mb-6 mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Você entrou com uma senha provisória. Escolha uma senha só sua para continuar.
          </p>
          {pronto && (
            <form onSubmit={enviar}>
              <TextField label="Senha provisória (a que você recebeu)" type="password" autoComplete="current-password" value={provisoria} onChange={(e) => setProvisoria(e.target.value)} />
              <TextField label="Nova senha" type="password" required autoComplete="new-password" hint="Pelo menos 8 caracteres." value={nova} onChange={(e) => setNova(e.target.value)} />
              <TextField label="Repita a nova senha" type="password" required autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} />
              <ErrorText>{erro}</ErrorText>
              <Button type="submit" disabled={salvando} className="w-full">{salvando ? "Salvando..." : "Salvar e continuar"}</Button>
            </form>
          )}
          <button type="button" onClick={sair} className="mt-5 text-sm font-semibold underline">Sair</button>
        </Card>
      </div>
    </div>
  );
}
