import { CONFIG_AGENDA, type ConfigAgenda } from "./config";
import type { Horario } from "./schemas";

export type Intervalo = { inicio: Date; fim: Date };

const MIN = 60_000;

const paraMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const paraHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

function deslocamentoMs(config: ConfigAgenda) {
  const sinal = config.fuso.startsWith("-") ? -1 : 1;
  return sinal * paraMinutos(config.fuso.slice(1)) * MIN;
}

/** "AAAA-MM-DD" + "HH:MM" no fuso da agenda → Date */
export function montarDataHora(data: string, hhmm: string, config: ConfigAgenda = CONFIG_AGENDA) {
  return new Date(`${data}T${hhmm}:00${config.fuso}`);
}

/** Dia da semana (0 = domingo) de "AAAA-MM-DD" */
export const diaDaSemana = (data: string) => new Date(`${data}T12:00:00Z`).getUTCDay();

/** Instante → "AAAA-MM-DD" no fuso da agenda */
export const dataLocal = (d: Date, config: ConfigAgenda = CONFIG_AGENDA) =>
  new Date(d.getTime() + deslocamentoMs(config)).toISOString().slice(0, 10);

/** Instante → "HH:MM" no fuso da agenda */
export const horaLocal = (d: Date, config: ConfigAgenda = CONFIG_AGENDA) =>
  new Date(d.getTime() + deslocamentoMs(config)).toISOString().slice(11, 16);

/** Instante → ISO com o fuso da agenda (formato canônico de um horário) */
export const isoLocal = (d: Date, config: ConfigAgenda = CONFIG_AGENDA) =>
  `${dataLocal(d, config)}T${horaLocal(d, config)}:00${config.fuso}`;

export function somarDias(data: string, dias: number) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Todas as datas "AAAA-MM-DD" de um mês "AAAA-MM" */
export function diasDoMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  const total = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return Array.from({ length: total }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`);
}

export function somarMeses(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

/** Primeiro e último mês em que o cliente pode marcar */
export function janelaDeMeses(agora = new Date(), config: ConfigAgenda = CONFIG_AGENDA) {
  const hoje = dataLocal(agora, config);
  return { primeiro: hoje.slice(0, 7), ultimo: somarDias(hoje, config.diasAFrente).slice(0, 7) };
}

/**
 * Horários de um dia. Cada horário vem marcado como livre ou preenchido.
 * Horários que já passaram (ou dentro da antecedência mínima) não aparecem.
 */
export function horariosDoDia(params: {
  data: string;
  ocupados: Intervalo[];
  agora?: Date;
  config?: ConfigAgenda;
}): Horario[] {
  const { data, ocupados, agora = new Date(), config = CONFIG_AGENDA } = params;
  const hoje = dataLocal(agora, config);
  if (data < hoje || data > somarDias(hoje, config.diasAFrente)) return [];

  const minimo = agora.getTime() + config.antecedenciaMinimaHoras * 60 * MIN;
  const lista: Horario[] = [];

  for (const p of config.horarios[diaDaSemana(data)] ?? []) {
    const fimPeriodo = paraMinutos(p.fim);
    for (let t = paraMinutos(p.inicio); t + config.duracaoMin <= fimPeriodo; t += config.intervaloMin) {
      const inicio = montarDataHora(data, paraHHMM(t), config);
      if (inicio.getTime() < minimo) continue;
      const fim = new Date(inicio.getTime() + config.duracaoMin * MIN);
      const livre = !ocupados.some((o) => inicio < o.fim && fim > o.inicio);
      lista.push({ inicio: isoLocal(inicio, config), livre });
    }
  }
  return lista;
}

/** Disponibilidade de um mês inteiro (só dias que têm horários). */
export function horariosDoMes(params: {
  mes: string;
  ocupados: Intervalo[];
  agora?: Date;
  config?: ConfigAgenda;
}): Record<string, Horario[]> {
  const dias: Record<string, Horario[]> = {};
  for (const data of diasDoMes(params.mes)) {
    const lista = horariosDoDia({ ...params, data });
    if (lista.length > 0) dias[data] = lista;
  }
  return dias;
}
