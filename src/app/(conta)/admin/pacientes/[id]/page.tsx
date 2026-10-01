"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { dataHoraCompleta } from "@/lib/formatar";

type Meal = {
  id: string;
  meal_name: string;
  meal_time: string | null;
  description: string;
};

type Diet = {
  id: string;
  title: string;
  active: boolean;
};

type Consulta = {
  id: string;
  starts_at: string;
  status: string;
};

type Message = {
  id: string;
  body: string;
  created_at: string;
};

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [patientName, setPatientName] = useState("");
  const [diet, setDiet] = useState<Diet | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // formulário de nova refeição
  const [mealName, setMealName] = useState("");
  const [mealTime, setMealTime] = useState("");
  const [mealDescription, setMealDescription] = useState("");
  const [savingMeal, setSavingMeal] = useState(false);
  const [mealError, setMealError] = useState<string | null>(null);

  // formulário de mensagem
  const [messageBody, setMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  const [dietError, setDietError] = useState<string | null>(null);

  const loadMeals = useCallback(async (dietId: string) => {
    const { data, error } = await supabase
      .from("meals")
      .select("id, meal_name, meal_time, description")
      .eq("diet_id", dietId)
      .order("meal_time", { ascending: true });

    if (error) {
      setMealError("Não foi possível carregar as refeições.");
      return;
    }
    setMeals(data ?? []);
  }, []);

  const loadMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, body, created_at")
      .eq("patient_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      setMessageError("Não foi possível carregar o histórico de mensagens.");
      return;
    }
    setMessages(data ?? []);
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadError(null);

      const { data: patient, error: patientError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", id)
        .single();

      if (cancelled) return;

      if (patientError) {
        setLoadError("Paciente não encontrado ou sem permissão de acesso.");
        setLoading(false);
        return;
      }
      setPatientName(patient?.full_name ?? "Paciente");

      const { data: activeDiet, error: dietLoadError } = await supabase
        .from("diets")
        .select("id, title, active")
        .eq("patient_id", id)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (dietLoadError) {
        setLoadError("Não foi possível carregar a dieta do paciente.");
      }
      setDiet(activeDiet ?? null);

      if (activeDiet) {
        await loadMeals(activeDiet.id);
      } else {
        setMeals([]);
      }

      await loadMessages();

      // Consultas marcadas pelo site e vinculadas a este paciente
      const { data: cons } = await supabase
        .from("appointments")
        .select("id, starts_at, status")
        .eq("patient_id", id)
        .order("starts_at", { ascending: false })
        .limit(10);
      if (!cancelled) setConsultas(cons ?? []);

      if (!cancelled) setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id, loadMeals, loadMessages]);

  async function handleCreateDiet() {
    setDietError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("diets")
      .insert({
        patient_id: id,
        created_by: user.id,
        title: "Plano alimentar",
        active: true,
      })
      .select()
      .single();

    if (error || !data) {
      setDietError("Não foi possível criar a dieta.");
      return;
    }

    setDiet(data);
    setMeals([]);
  }

  async function handleAddMeal(e: React.FormEvent) {
    e.preventDefault();
    if (!diet) return;
    setSavingMeal(true);
    setMealError(null);

    const { error } = await supabase.from("meals").insert({
      diet_id: diet.id,
      meal_name: mealName,
      meal_time: mealTime || null,
      description: mealDescription,
    });

    setSavingMeal(false);

    if (error) {
      setMealError("Não foi possível salvar a refeição.");
      return;
    }

    setMealName("");
    setMealTime("");
    setMealDescription("");
    await loadMeals(diet.id);
  }

  async function handleDeleteMeal(mealId: string) {
    if (!diet) return;
    if (!window.confirm("Remover essa refeição da dieta?")) return;

    setMealError(null);
    const { error } = await supabase.from("meals").delete().eq("id", mealId);

    if (error) {
      setMealError("Não foi possível remover a refeição.");
      return;
    }

    await loadMeals(diet.id);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageBody.trim()) return;
    setSendingMessage(true);
    setMessageError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: id,
          body: messageBody.trim(),
          nutritionistAccessToken: session?.access_token,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setMessageError(result.error ?? "Não foi possível enviar a mensagem.");
        return;
      }

      setMessageBody("");
      await loadMessages();
    } catch {
      setMessageError("Não foi possível conectar. Verifique sua internet e tente de novo.");
    } finally {
      setSendingMessage(false);
    }
  }

  if (loading) {
    return <p style={{ color: "var(--color-text-muted)" }}>Carregando...</p>;
  }

  if (loadError) {
    return <ErrorText>{loadError}</ErrorText>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl mb-1">{patientName}</h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-muted)" }}>
        {diet ? diet.title : "Sem dieta ativa"}
      </p>

      {!diet ? (
        <Card className="p-10 text-center">
          <p className="mb-4" style={{ color: "var(--color-text-muted)" }}>
            Esse paciente ainda não tem uma dieta cadastrada.
          </p>
          <ErrorText>{dietError}</ErrorText>
          <Button onClick={handleCreateDiet}>Criar dieta</Button>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-3 mb-8">
            {meals.length === 0 && (
              <p style={{ color: "var(--color-text-muted)" }}>
                Nenhuma refeição cadastrada ainda. Adicione abaixo.
              </p>
            )}
            {meals.map((m) => (
              <Card key={m.id} className="p-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{m.meal_name}</span>
                    {m.meal_time && (
                      <span
                        className="text-xs font-semibold"
                        style={{ color: "var(--color-primary)" }}
                      >
                        {m.meal_time}
                      </span>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {m.description}
                  </p>
                </div>
                <Button
                  variant="text-danger"
                  onClick={() => handleDeleteMeal(m.id)}
                  className="shrink-0"
                >
                  Remover
                </Button>
              </Card>
            ))}
          </div>

          <Card className="p-6">
            <form onSubmit={handleAddMeal}>
              <h3 className="text-lg mb-4">Adicionar refeição</h3>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <TextField
                  label="Nome da refeição"
                  required
                  placeholder="Ex: Café da manhã"
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  containerClassName=""
                />
                <TextField
                  label="Horário"
                  type="time"
                  value={mealTime}
                  onChange={(e) => setMealTime(e.target.value)}
                  containerClassName=""
                />
              </div>

              <TextAreaField
                label="Descrição"
                required
                rows={3}
                placeholder="Ex: 2 ovos mexidos + 1 fatia de pão integral + 1 fruta"
                value={mealDescription}
                onChange={(e) => setMealDescription(e.target.value)}
              />

              <ErrorText>{mealError}</ErrorText>

              <Button type="submit" disabled={savingMeal}>
                {savingMeal ? "Salvando..." : "Adicionar refeição"}
              </Button>
            </form>
          </Card>
        </>
      )}

      {consultas.length > 0 && (
        <div className="mt-10">
          <h2 className="text-2xl mb-4">Consultas</h2>
          <div className="flex flex-col gap-2">
            {consultas.map((c) => (
              <Card key={c.id} className="p-4 flex items-center justify-between text-sm">
                <span className="font-semibold">{dataHoraCompleta(c.starts_at)}</span>
                <span style={{ color: "var(--color-text-muted)" }}>{c.status === "confirmed" ? "Confirmada" : "Cancelada"}</span>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        <h2 className="text-2xl mb-4">Mensagens</h2>

        <Card className="p-6 mb-4">
          <form onSubmit={handleSendMessage}>
            <TextAreaField
              label="Enviar mensagem pro paciente"
              rows={3}
              placeholder="Ex: Lembre-se de beber bastante água hoje!"
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              containerClassName="mb-3"
            />
            <ErrorText>{messageError}</ErrorText>
            <Button type="submit" disabled={sendingMessage || !messageBody.trim()}>
              {sendingMessage ? "Enviando..." : "Enviar"}
            </Button>
            <p className="text-xs mt-2" style={{ color: "var(--color-text-muted)" }}>
              Se o paciente tiver notificações ativadas no app, ele recebe um
              push imediatamente. A mensagem também fica salva no histórico
              dele.
            </p>
          </form>
        </Card>

        {messages.length > 0 && (
          <div className="flex flex-col gap-2">
            {messages.map((m) => (
              <Card key={m.id} className="p-4">
                <p className="text-sm mb-1">{m.body}</p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {new Date(m.created_at).toLocaleString("pt-BR")}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
