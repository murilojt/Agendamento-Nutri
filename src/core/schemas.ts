import { z } from "zod";

/** Formatos de dados compartilhados entre site, API e (no futuro) app e painel. */

export const mesSchema = z.string().regex(/^\d{4}-\d{2}$/, "Use o formato AAAA-MM");

export const horarioSchema = z.object({
  inicio: z.string(), // ISO com fuso, ex.: 2026-10-05T09:00:00-03:00
  livre: z.boolean(),
});
export type Horario = z.infer<typeof horarioSchema>;

export const disponibilidadeMesSchema = z.object({
  mes: mesSchema,
  /** Chave: data "AAAA-MM-DD". Só aparecem dias com atendimento. */
  dias: z.record(z.array(horarioSchema)),
});
export type DisponibilidadeMes = z.infer<typeof disponibilidadeMesSchema>;

export const novoAgendamentoSchema = z.object({
  inicio: z.string().datetime({ offset: true }),
  nome: z.string().trim().min(2, "Informe seu nome"),
  sobrenome: z.string().trim().min(2, "Informe seu sobrenome"),
  celular: z
    .string()
    .trim()
    .refine((v) => /^\d{10,13}$/.test(v.replace(/\D/g, "")), "Celular inválido. Use DDD + número"),
  email: z.string().trim().email("E-mail inválido"),
  nascimento: z
    .string()
    .trim()
    .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)), "Informe sua data de nascimento")
    .refine((v) => v >= "1900-01-01" && v <= new Date().toISOString().slice(0, 10), "Data de nascimento inválida"),
  consentimento: z.literal(true, { errorMap: () => ({ message: "Aceite o uso dos dados para agendar" }) }),
});
export type NovoAgendamento = z.infer<typeof novoAgendamentoSchema>;

export const agendamentoCriadoSchema = z.object({
  inicio: z.string(),
  fim: z.string(),
  nome: z.string(),
});
export type AgendamentoCriado = z.infer<typeof agendamentoCriadoSchema>;

export type ErroApi = { erro: string; detalhes?: Record<string, string[]> };
