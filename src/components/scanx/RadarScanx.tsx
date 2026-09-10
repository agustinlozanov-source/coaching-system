'use client';

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { DIMENSIONES, VALOR_MAX, type ResultadoDimension } from '@/types/scanx';

/** Radar de las 10 dimensiones (0..4). Se usa en el runner (en vivo) y en resultados. */
export function RadarScanx({ dims, size = 300 }: { dims: ResultadoDimension[]; size?: number }) {
  const data = DIMENSIONES.map((d) => ({
    dim: d.corto,
    valor: dims.find((x) => x.id === d.id)?.valor ?? 0,
  }));
  return (
    <ResponsiveContainer width="100%" height={size}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="currentColor" strokeOpacity={0.15} />
        <PolarAngleAxis dataKey="dim" tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.7 }} />
        <PolarRadiusAxis domain={[0, VALOR_MAX]} tick={false} axisLine={false} />
        <Radar dataKey="valor" stroke="#3533cd" strokeWidth={2} fill="#1aab99" fillOpacity={0.35} isAnimationActive />
      </RadarChart>
    </ResponsiveContainer>
  );
}
