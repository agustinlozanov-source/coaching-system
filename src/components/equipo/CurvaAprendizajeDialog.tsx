'use client';

import { TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { EmpleadoStats } from '@/lib/teamx/equipo';
import { curvaAprendizaje } from '@/lib/teamx/equipo';

interface Props {
  stats: EmpleadoStats | null;
  onClose: () => void;
}

export function CurvaAprendizajeDialog({ stats, onClose }: Props) {
  const puntos = stats ? curvaAprendizaje(stats.empleado, stats.evaluacionesAsc) : [];

  return (
    <Dialog open={!!stats} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Curva de aprendizaje{stats ? ` — ${stats.empleado.nombre}` : ''}
          </DialogTitle>
          <DialogDescription>
            % de competencias por evaluación, según semanas de antigüedad.
          </DialogDescription>
        </DialogHeader>

        {puntos.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Aún no hay evaluaciones suficientes para trazar la curva.
          </div>
        ) : (
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={puntos} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="semana"
                  tickFormatter={(v) => `S${v}`}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Semanas de antigüedad', position: 'insideBottom', offset: -2, fontSize: 11 }}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'Competencias']}
                  labelFormatter={(v) => `Semana ${v}`}
                />
                <Line
                  type="monotone"
                  dataKey="pct"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#059669' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
