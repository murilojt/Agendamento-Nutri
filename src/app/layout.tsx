import type { Metadata, Viewport } from "next";
import "./globals.css";

const nome = process.env.NEXT_PUBLIC_NOME_CLINICA ?? "Allyus Nutrição";

export const metadata: Metadata = {
  title: nome,
  description: `Atendimento nutricional e agendamento online com a ${nome}.`,
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2F5D3F" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
