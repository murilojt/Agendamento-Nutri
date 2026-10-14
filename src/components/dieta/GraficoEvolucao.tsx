import { formatarData, formatarNumero } from "@/lib/evolucao";

type Ponto = { data: string; valor: number };

const L = 520, A = 220, ME = 44, MD = 16, MT = 16, MB = 30;

/** Gráfico de linha simples (SVG) de uma medida ao longo do tempo. */
export function GraficoEvolucao({ pontos, unidade, titulo }: { pontos: Ponto[]; unidade: string; titulo: string }) {
  if (pontos.length === 0) return null;
  const valores = pontos.map((p) => p.valor);
  let min = Math.min(...valores), max = Math.max(...valores);
  const folga = Math.max((max - min) * 0.15, 0.5);
  min -= folga; max += folga;
  const t = (d: string) => new Date(`${d}T12:00:00`).getTime();
  const t0 = t(pontos[0].data), t1 = t(pontos[pontos.length - 1].data);
  const x = (d: string) => (t1 === t0 ? (ME + L - MD) / 2 : ME + ((t(d) - t0) / (t1 - t0)) * (L - ME - MD));
  const y = (v: number) => MT + (1 - (v - min) / (max - min)) * (A - MT - MB);
  const linha = pontos.map((p) => `${x(p.data).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
  const guias = [min + folga, (min + max) / 2, max - folga];
  const descricao = `${titulo}: ${pontos.map((p) => `${formatarData(p.data)} ${formatarNumero(p.valor)} ${unidade}`).join("; ")}`;

  return (
    <svg viewBox={`0 0 ${L} ${A}`} role="img" aria-label={descricao} className="w-full" style={{ maxHeight: 260 }}>
      {guias.map((g, i) => (
        <g key={i}>
          <line x1={ME} x2={L - MD} y1={y(g)} y2={y(g)} stroke="var(--color-border)" strokeWidth="1" />
          <text x={ME - 6} y={y(g) + 4} textAnchor="end" fontSize="11" fill="var(--color-text-muted)">{formatarNumero(g)}</text>
        </g>
      ))}
      {pontos.length > 1 && <polyline points={linha} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {pontos.map((p, i) => (
        <g key={p.data + i}>
          <circle cx={x(p.data)} cy={y(p.valor)} r="4.5" fill="var(--color-primary)" stroke="var(--color-bg)" strokeWidth="2">
            <title>{`${formatarData(p.data)}: ${formatarNumero(p.valor)} ${unidade}`}</title>
          </circle>
          {(i === 0 || i === pontos.length - 1) && (
            <text x={x(p.data)} y={A - 10} textAnchor={i === 0 && pontos.length > 1 ? "start" : pontos.length === 1 ? "middle" : "end"} fontSize="11" fill="var(--color-text-muted)">
              {formatarData(p.data)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
