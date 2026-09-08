'use client';

import { AlertTriangle, TrendingDown, CalendarX, CheckCircle2 } from 'lucide-react';
import { dashIniciales, type AttentionEntry } from '@/lib/teamx/dashboard-equipo';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const REASON_INFO: Record<AttentionEntry['reasons'][number], { label: string; icon: typeof AlertTriangle }> = {
  score_bajo: { label: 'Score bajo', icon: AlertTriangle },
  tendencia_negativa: { label: 'Tendencia negativa', icon: TrendingDown },
  sin_reciente: { label: 'Sin evaluación reciente', icon: CalendarX },
};

export function AttentionList({
  entries,
  nombres,
  fotos,
}: {
  entries: AttentionEntry[];
  nombres: Record<string, string>;
  fotos?: Record<string, string | undefined>;
}) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        <p className="mt-2 text-sm text-muted-foreground">Sin alertas: el equipo está al día.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((e) => (
        <div key={e.empleadoId} className="flex items-center gap-3 rounded-lg border p-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={fotos?.[e.empleadoId] || undefined} alt="" />
            <AvatarFallback>{dashIniciales(nombres[e.empleadoId] ?? '?')}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{nombres[e.empleadoId] ?? 'Empleado'}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {e.reasons.map((r) => {
                const info = REASON_INFO[r];
                const Icon = info.icon;
                return (
                  <Badge key={r} variant="destructive" className="gap-1 text-[10px] font-medium">
                    <Icon className="h-3 w-3" />
                    {info.label}
                  </Badge>
                );
              })}
            </div>
          </div>
          {e.pct !== null && <div className="text-lg font-bold tabular-nums text-red-600">{e.pct}%</div>}
        </div>
      ))}
    </div>
  );
}
