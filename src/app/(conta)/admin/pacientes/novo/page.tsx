"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";

export default function NewPatientPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          password,
          nutritionistAccessToken: session?.access_token,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error ?? "Erro ao criar paciente.");
        return;
      }

      router.push(`/admin/pacientes/${result.id}`);
    } catch {
      setError("Não foi possível conectar. Verifique sua internet e tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-3xl mb-8">Novo paciente</h1>

      <Card className="p-8">
        <form onSubmit={handleSubmit}>
          <TextField
            label="Nome completo"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <TextField
            label="E-mail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <TextField
            label="Senha provisória"
            type="text"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="Mínimo 6 caracteres. Repasse essa senha ao paciente — ele poderá trocá-la depois."
          />

          <ErrorText>{error}</ErrorText>

          <Button type="submit" disabled={loading}>
            {loading ? "Criando..." : "Criar paciente"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
