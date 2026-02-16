'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface CompetenciaData {
  competencia: string;
  puntuacion: number;
}

interface CompetenciasRadarProps {
  data: CompetenciaData[];
  maxValue?: number;
  previousData?: CompetenciaData[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
        <p className="font-semibold text-sm">{payload[0].payload.competencia}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function CompetenciasRadar({
  data,
  maxValue = 5,
  previousData,
}: CompetenciasRadarProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <p className="text-muted-foreground">Sin datos para mostrar</p>
      </div>
    );
  }

  // Procesar datos para mejorar visualización en el radar
  const processedData = data.map((item) => {
    const competenciaCorta =
      item.competencia.length > 15
        ? item.competencia.substring(0, 15) + '...'
        : item.competencia;

    return {
      ...item,
      competenciaCorta,
    };
  });

  // Mezclar con datos anteriores si existen
  const chartData = processedData.map((current) => {
    const previous = previousData?.find(
      (p) => p.competencia === current.competencia
    );

    return {
      competencia: current.competenciaCorta,
      competenciaFull: current.competencia,
      puntuacion: current.puntuacion,
      ...(previous && { evaluacionAnterior: previous.puntuacion }),
    };
  });

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <PolarGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            gridType="polygon"
          />
          <PolarAngleAxis
            dataKey="competencia"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            angle={90}
            orientation="outer"
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, maxValue]}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickCount={maxValue + 1}
          />

          <Radar
            name="Evaluación Actual"
            dataKey="puntuacion"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.6}
            animationDuration={800}
            isAnimationActive={true}
          />

          {previousData && previousData.length > 0 && (
            <Radar
              name="Evaluación Anterior"
              dataKey="evaluacionAnterior"
              stroke="#f59e0b"
              strokeDasharray="5 5"
              fill="none"
              animationDuration={800}
              isAnimationActive={true}
            />
          )}

          <Tooltip content={<CustomTooltip />} />

          {previousData && previousData.length > 0 && (
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              verticalAlign="bottom"
              height={36}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
