import type { Metadata, Viewport } from "next";
import { PaginaRaiz } from "@/components/PaginaRaiz";
import "./conta.css";

export const metadata: Metadata = {
  title: { default: "Área de contas | Ayllus", template: "%s | Ayllus" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#5C1E21" };

export default function ContaLayout({ children }: { children: React.ReactNode }) {
  return <PaginaRaiz>{children}</PaginaRaiz>;
}
