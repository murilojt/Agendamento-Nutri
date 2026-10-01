"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, supabaseConfigurado, MSG_NAO_CONFIGURADO } from "@/lib/supabase";
import { BotaoTema } from "@/components/BotaoTema";
import { Carregando } from "@/components/ui/Carregando";
import { ErrorText } from "@/components/ui/ErrorText";

export default function PacienteLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState("");
  const [checkError, setCheckError] = useState<string | null>(supabaseConfigurado ? null : MSG_NAO_CONFIGURADO);

  useEffect(() => {
    if (!supabaseConfigurado) return;
    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return router.replace("/entrar");

      const { data: perfil, error } = await supabase.from("profiles").select("role, full_name").eq("id", session.user.id).single();
      if (error) {
        setCheckError("Não foi possível verificar sua conta. Tente recarregar a página.");
        setChecking(false);
        return;
      }
      // A nutricionista tem o painel; esta área é só do paciente
      if (perfil?.role === "nutritionist") return router.replace("/admin");

      setName(perfil?.full_name ?? session.user.email ?? "");
      setChecking(false);
    }
    check();
  }, [router]);

  async function sair() {
    await supabase.auth.signOut();
    router.replace("/entrar");
  }

  if (checkError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <ErrorText>{checkError}</ErrorText>
      </div>
    );
  }
  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Carregando />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-4">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 rounded-full px-5 py-2" style={{ background: "var(--profundo)" }}>
        <Link href="/paciente" aria-label="Ayllus, minha área" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marca/ayllus-isotipo-dourado.svg" alt="" width={168} height={191} className="h-9 w-auto" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marca/ayllus-logotipo-dourado.svg" alt="Ayllus" width={370} height={100} className="hidden h-7 w-auto sm:block" />
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-[10rem] truncate text-sm sm:block" style={{ color: "var(--sobre-profundo-suave)" }}>
            {name}
          </span>
          <BotaoTema />
          <button onClick={sair} className="rounded-full px-4 py-2 text-sm font-semibold" style={{ background: "var(--gema)", color: "var(--sobre-gema)" }}>
            Sair
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl pt-10 pb-16">{children}</main>
    </div>
  );
}
