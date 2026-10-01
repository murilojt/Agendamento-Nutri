import type { Metadata } from "next";
import { CalendarioAgendamento } from "@/components/CalendarioAgendamento";
import { Topo } from "@/components/Topo";

const nome = process.env.NEXT_PUBLIC_NOME_CLINICA ?? "Ayllus Nutrição";

export const metadata: Metadata = { title: `Agendar consulta | ${nome}` };

export default function Agendar() {
  return (
    <>
      <Topo nome={nome} mostrarBotao={false} />
      <main className="agendar">
        <h1>Escolha um horário</h1>
        <p className="dica">Toque em um dia para ver os horários livres. Cada consulta dura 1 hora.</p>
        <CalendarioAgendamento />
      </main>
    </>
  );
}
