import type { Metadata, Viewport } from "next";
import "./globals.css";

const nome = process.env.NEXT_PUBLIC_NOME_CLINICA ?? "Ayllus Nutrição";

export const metadata: Metadata = {
  title: nome,
  description: `Atendimento nutricional e agendamento online com a ${nome}.`,
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#5C1E21" };

// Aplica o tema salvo antes da primeira pintura, para a página não piscar.
const SCRIPT_TEMA = `try{var t=localStorage.getItem("tema");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
