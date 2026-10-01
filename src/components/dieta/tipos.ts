import type { ItemRefeicao, Macros } from "@/lib/nutricao";

export type Paciente = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  weight_kg: number | null;
  height_cm: number | null;
};

export type Dieta = {
  id: string;
  title: string;
  objective: string | null;
  target_kcal: number | null;
  target_protein_gkg: number | null;
  target_fat_gkg: number | null;
  target_carb_gkg: number | null;
  supplements: string | null;
  recipes: string | null;
};

export type Refeicao = { id: string; diet_id: string; meal_name: string; meal_time: string | null; notes: string | null; position: number };

export type Favorita = { id: string; name: string; meal_time: string | null; items: ItemFavorito[] };
export type ItemFavorito = Macros & { food_id: string | null; name: string; quantity_g: number };

export type Anamnese = {
  main_complaint: string;
  health_history: string;
  medications: string;
  allergies: string;
  habits: string;
  goals: string;
};

export type { ItemRefeicao };
