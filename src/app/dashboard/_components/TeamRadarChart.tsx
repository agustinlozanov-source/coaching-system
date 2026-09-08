'use client';

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { DimAvg } from '@/lib/teamx/dashboard-equipo';

export function TeamRadarChart({ data }: { data: DimAvg[] }) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Sin dimensiones configuradas.</p>;
  }

  const chartData = data.map(({ dim, pct }) => ({
    dim: dim.nombre.length > 16 ? `${dim.nombre.slice(0, 15)}…` : dim.nombre,
    pct: pct ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={chartData} outerRadius="72%">
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11, fill: '#6b7280' }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
        <Radar name="Equipo" dataKey="pct" stroke="#059669" fill="#059669" fillOpacity={0.35} strokeWidth={2} />
        <Tooltip
          formatter={(value: any) => [`${value}%`, 'Equipo']}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 6 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
