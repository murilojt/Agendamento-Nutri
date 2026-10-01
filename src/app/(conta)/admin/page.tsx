"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { ErrorText } from "@/components/ui/ErrorText";

type Patient = {
  id: string;
  full_name: string | null;
  created_at: string;
};

export default function DashboardPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error: loadError } = await supabase
        .from("profiles")
        .select("id, full_name, created_at")
        .eq("role", "patient")
        .order("created_at", { ascending: false });

      if (loadError) {
        setError("Não foi possível carregar a lista de pacientes.");
      }
      setPatients(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl">Pacientes</h1>
        <Link
          href="/admin/pacientes/novo"
          className="rounded-lg px-4 py-2 text-sm font-semibold "
          style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
        >
          + Novo paciente
        </Link>
      </div>

      <ErrorText>{error}</ErrorText>

      {loading ? (
        <p style={{ color: "var(--color-text-muted)" }}>Carregando...</p>
      ) : patients.length === 0 ? (
        <Card className="p-10 text-center">
          <p style={{ color: "var(--color-text-muted)" }}>
            Nenhum paciente cadastrado ainda. Clique em &quot;Novo paciente&quot;
            pra começar.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {patients.map((p, i) => (
            <Link
              key={p.id}
              href={`/admin/pacientes/${p.id}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-[var(--color-bg)] transition-colors"
              style={{
                borderTop: i === 0 ? "none" : "1px solid var(--color-border)",
              }}
            >
              <span className="font-medium">{p.full_name || "(sem nome)"}</span>
              <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Ver dieta →
              </span>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
