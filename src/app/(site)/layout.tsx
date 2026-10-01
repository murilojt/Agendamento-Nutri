import type { Metadata, Viewport } from "next";
import { PaginaRaiz } from "@/components/PaginaRaiz";
import "./site.css";

const nome = process.env.NEXT_PUBLIC_NOME_CLINICA ?? "Ayllus Nutrição";

export const metadata: Metadata = {
  title: nome,
  description: `Atendimento nutricional e agendamento online com a ${nome}.`,
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#5C1E21" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <PaginaRaiz>{children}</PaginaRaiz>;
}
