"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, supabaseConfigurado, destinoDoPerfil, MSG_NAO_CONFIGURADO } from "@/lib/supabase";
import { CabecalhoConta } from "@/components/CabecalhoConta";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";

async function perfilDe(userId: string) {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role as string | undefined;
}

export default function EntrarPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(supabaseConfigurado ? null : MSG_NAO_CONFIGURADO);

  // Quem já está logado vai direto para a própria área
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) router.replace(destinoDoPerfil(await perfilDe(session.user.id)));
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) {
        setError("E-mail ou senha incorretos.");
        return;
      }
      router.push(destinoDoPerfil(await perfilDe(data.user.id)));
    } catch {
      setError("Não foi possível conectar. Verifique sua internet e tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-4">
      <CabecalhoConta />
      <div className="flex items-center justify-center pt-12">
        <Card className="w-full max-w-sm p-8">
          <form onSubmit={handleSubmit}>
            <h1 className="mb-1 text-3xl">Entrar</h1>
            <p className="mb-8 text-sm" style={{ color: "var(--color-text-muted)" }}>
              Pacientes e nutricionista acessam por aqui.
            </p>

            <TextField label="E-mail" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField
              label="Senha"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              containerClassName="mb-2"
            />

            <ErrorText>{error}</ErrorText>

            <Button type="submit" disabled={loading || !supabaseConfigurado} className="mt-4 w-full">
              {loading ? "Entrando..." : "Entrar"}
            </Button>

            <p className="mt-5 text-center text-sm">
              <Link href="/esqueci-senha" className="underline">
                Esqueci minha senha
              </Link>
            </p>
          </form>
        </Card>
      </div>
      <p className="mt-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
        Ainda não é paciente?{" "}
        <Link href="/agendar" className="font-semibold underline">
          Agende sua consulta
        </Link>
      </p>
    </div>
  );
}
