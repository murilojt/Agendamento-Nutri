"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase, supabaseConfigurado, MSG_NAO_CONFIGURADO } from "@/lib/supabase";
import { CabecalhoConta } from "@/components/CabecalhoConta";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(supabaseConfigurado ? null : MSG_NAO_CONFIGURADO);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // O e-mail traz um link para /redefinir-senha neste mesmo site
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setSent(true);
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
          <h1 className="mb-1 text-3xl">Recuperar senha</h1>
          {sent ? (
            <>
              <p className="mb-6 mt-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
                Enviamos um link para {email}. Abra o e-mail para criar uma nova senha.
              </p>
              <Link href="/entrar" className="text-sm font-semibold underline">
                Voltar para o login
              </Link>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="mb-8 text-sm" style={{ color: "var(--color-text-muted)" }}>
                Digite seu e-mail e enviaremos um link para criar uma nova senha.
              </p>
              <TextField label="E-mail" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <ErrorText>{error}</ErrorText>
              <Button type="submit" disabled={loading || !supabaseConfigurado} className="mt-2 w-full">
                {loading ? "Enviando..." : "Enviar link"}
              </Button>
              <p className="mt-5 text-center text-sm">
                <Link href="/entrar" className="underline">
                  Voltar para o login
                </Link>
              </p>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
