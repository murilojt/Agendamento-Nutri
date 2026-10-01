"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase, supabaseConfigurado, MSG_NAO_CONFIGURADO } from "@/lib/supabase";
import { BotaoTema } from "@/components/BotaoTema";
import { Carregando } from "@/components/ui/Carregando";

const LINKS = [
  { href: "/admin", rotulo: "Pacientes", ativo: (p: string) => p === "/admin" || p.startsWith("/admin/pacientes/") },
  { href: "/admin/consultas", rotulo: "Consultas", ativo: (p: string) => p.startsWith("/admin/consultas") },
  { href: "/admin/alimentos", rotulo: "Alimentos", ativo: (p: string) => p.startsWith("/admin/alimentos") },
  { href: "/admin/assinatura", rotulo: "Assinatura e PDF", ativo: (p: string) => p.startsWith("/admin/assinatura") },
  { href: "/admin/pacientes/novo", rotulo: "Novo paciente", ativo: (p: string) => p === "/admin/pacientes/novo" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState<string | null>(null);
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
      // Só a nutricionista entra no painel; paciente vai para a própria área
      if (perfil?.role !== "nutritionist") return router.replace("/paciente");

      setName(perfil.full_name ?? session.user.email ?? "");
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
        <p style={{ color: "var(--color-danger)" }}>{checkError}</p>
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
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside
        className="flex shrink-0 flex-col gap-4 p-5 md:w-64 md:justify-between md:p-6"
        style={{ background: "var(--profundo)", color: "var(--sobre-profundo)" }}
      >
        <div>
          <div className="mb-4 flex items-center justify-between md:mb-8 md:block">
            <Link href="/admin" aria-label="Ayllus, painel" className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/marca/ayllus-isotipo-dourado.svg" alt="" width={168} height={191} className="h-9 w-auto" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/marca/ayllus-logotipo-dourado.svg" alt="Ayllus" width={370} height={100} className="h-7 w-auto" />
            </Link>
            <div className="md:hidden">
              <BotaoTema />
            </div>
          </div>
          <p className="mb-4 truncate text-xs md:mb-6" style={{ color: "var(--sobre-profundo-suave)" }}>
            {name}
          </p>
          <nav className="flex items-start gap-1 overflow-x-auto md:flex-col md:overflow-visible" aria-label="Painel">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={l.ativo(pathname) ? "page" : undefined}
                className="shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold"
                style={l.ativo(pathname) ? { background: "var(--gema)", color: "var(--sobre-gema)" } : { color: "var(--sobre-profundo)" }}
              >
                {l.rotulo}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center justify-between gap-3 md:flex-col md:items-start">
          <div className="hidden md:block">
            <BotaoTema />
          </div>
          <Link href="/" className="text-sm font-medium" style={{ color: "var(--sobre-profundo-suave)" }}>
            Ver o site
          </Link>
          <button onClick={sair} className="text-left text-sm font-semibold" style={{ color: "var(--gema)" }}>
            Sair
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-5 md:p-10">{children}</main>
    </div>
  );
}
