"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, supabaseConfigurado, MSG_NAO_CONFIGURADO } from "@/lib/supabase";
import { CabecalhoConta } from "@/components/CabecalhoConta";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";

// O Supabase devolve os tokens no fragmento (#access_token=...&refresh_token=...) da URL do e-mail
function tokensDaUrl() {
  const params = new URLSearchParams(window.location.hash.replace("#", ""));
  return { access_token: params.get("access_token"), refresh_token: params.get("refresh_token") };
}

export default function RedefinirSenhaPage() {
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function preparar() {
      const { access_token, refresh_token } = tokensDaUrl();
      if (!access_token || !refresh_token) {
        setInvalidLink(true);
        setReady(true);
        return;
      }
      const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
      if (sessionError) setInvalidLink(true);

      // Tira os tokens da barra de endereço e do histórico depois de usá-los
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      setReady(true);
    }
    if (supabaseConfigurado) preparar();
    else {
      setInvalidLink(true);
      setReady(true);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirm) return setError("As senhas não coincidem.");

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) return setError(updateError.message);
      await supabase.auth.signOut();
      setDone(true);
    } catch {
      setError("Não foi possível conectar ao servidor. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-4">
      <CabecalhoConta />
      <div className="flex items-center justify-center pt-12">
        <Card className="w-full max-w-sm p-8">
          <h1 className="mb-1 text-3xl">Nova senha</h1>
          {!ready ? (
            <p className="mt-3 text-sm" style={{ color: "var(--color-text-muted)" }}>Carregando...</p>
          ) : done ? (
            <>
              <p className="mb-6 mt-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
                Senha alterada com sucesso. Entre com a nova senha.
              </p>
              <Link href="/entrar" className="text-sm font-semibold underline">Ir para o login</Link>
            </>
          ) : invalidLink ? (
            <>
              <p className="mb-6 mt-3 text-sm" style={{ color: "var(--color-danger)" }}>
                {supabaseConfigurado ? "Este link é inválido ou expirou. Peça um novo." : MSG_NAO_CONFIGURADO}
              </p>
              <Link href="/esqueci-senha" className="text-sm font-semibold underline">Pedir novo link</Link>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="mb-8 mt-3 text-sm" style={{ color: "var(--color-text-muted)" }}>Escolha uma nova senha para a sua conta.</p>
              <TextField label="Nova senha" type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <TextField label="Repita a nova senha" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              <ErrorText>{error}</ErrorText>
              <Button type="submit" disabled={loading} className="w-full">{loading ? "Salvando..." : "Salvar nova senha"}</Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
