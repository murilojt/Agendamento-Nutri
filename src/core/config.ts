/**
 * Regras de funcionamento da agenda.
 * Não depende de Next.js nem do Google: pode ser copiado para o app Expo
 * ou virar um pacote compartilhado quando os projetos forem unidos.
 */

export type Periodo = { inicio: string; fim: string }; // "HH:MM"

export const CONFIG_AGENDA = {
  /** Fuso de Brasília (o Brasil não tem horário de verão desde 2019). */
  fuso: "-03:00",
  fusoIana: "America/Sao_Paulo",
  /** Duração de cada consulta, em minutos. */
  duracaoMin: 60,
  /** De quantos em quantos minutos os horários começam. */
  intervaloMin: 60,
  /** Antecedência mínima para marcar, em horas. */
  antecedenciaMinimaHoras: 2,
  /** Até quantos dias à frente o cliente pode marcar. */
  diasAFrente: 60,
  /** Horários de atendimento por dia da semana (0 = domingo ... 6 = sábado). */
  horarios: {
    0: [],
    1: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:00", fim: "18:00" }],
    2: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:00", fim: "18:00" }],
    3: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:00", fim: "18:00" }],
    4: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:00", fim: "18:00" }],
    5: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:00", fim: "17:00" }],
    6: [{ inicio: "08:00", fim: "12:00" }],
  } as Record<number, Periodo[]>,
};

export type ConfigAgenda = typeof CONFIG_AGENDA;
