"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Carregando } from "@/components/ui/Carregando";
import { ErrorText } from "@/components/ui/ErrorText";
import { dataHoraCompleta } from "@/lib/formatar";

type Consulta = {
  id: string;
  starts_at: string;
  status: string;
  patient_id: string | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  profiles: { full_name: string | null } | null;
};

export default function ConsultasPage() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      // Consultas de hoje em diante, marcadas pelo site (a agenda de verdade continua na Google Agenda)
      const inicioDoDia = new Date();
      inicioDoDia.setHours(0, 0, 0, 0);
      const { data, error: loadError } = await supabase
        .from("appointments")
        .select("id, starts_at, status, patient_id, guest_name, guest_email, guest_phone, profiles(full_name)")
        .gte("starts_at", inicioDoDia.toISOString())
        .order("starts_at", { ascending: true });

      if (loadError) setError("Não foi possível carregar as consultas. Confirme que o patch SQL 05 foi aplicado no Supabase.");
      setConsultas((data as unknown as Consulta[]) ?? []);
      setLoading(false);
    }
    carregar();
  }, []);

  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 text-3xl">Consultas</h1>
      <p className="mb-8 text-sm" style={{ color: "var(--color-text-muted)" }}>
        Consultas marcadas pelo site, da mais próxima para a mais distante. Os cancelamentos feitos direto na Google Agenda ainda não aparecem aqui.
      </p>

      <ErrorText>{error}</ErrorText>

      {loading ? (
        <Carregando />
      ) : consultas.length === 0 ? (
        <Card className="p-10 text-center">
          <p style={{ color: "var(--color-text-muted)" }}>Nenhuma consulta marcada daqui para a frente.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {consultas.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="font-semibold">{dataHoraCompleta(c.starts_at)}</p>
                <p className="text-sm">{c.guest_name}</p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {c.guest_phone} · {c.guest_email}
                </p>
              </div>
              {c.patient_id ? (
                <Link
                  href={`/admin/pacientes/${c.patient_id}`}
                  className="rounded-full px-4 py-2 text-sm font-semibold"
                  style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
                >
                  Paciente: {c.profiles?.full_name ?? "ver ficha"}
                </Link>
              ) : (
                <span className="rounded-full px-4 py-2 text-xs font-semibold" style={{ background: "var(--fundo-alt)" }}>
                  Sem cadastro no sistema
                </span>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
