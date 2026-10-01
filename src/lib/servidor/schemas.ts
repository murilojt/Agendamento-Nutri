import { z } from "zod";

export const createPatientSchema = z.object({
  fullName: z.string().trim().min(1, "Nome é obrigatório."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres."),
  nutritionistAccessToken: z.string().min(1, "Não autenticado."),
});

export const sendMessageSchema = z.object({
  patientId: z.string().uuid("Paciente inválido."),
  body: z.string().trim().min(1, "Mensagem vazia.").max(1000, "Mensagem muito longa (máx. 1000 caracteres)."),
  nutritionistAccessToken: z.string().min(1, "Não autenticado."),
});
