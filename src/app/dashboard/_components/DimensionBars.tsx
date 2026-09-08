'use client';

import type { DimAvg } from '@/lib/teamx/dashboard-equipo';

export function DimensionBars({ data }: { data: DimAvg[] }) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Sin dimensiones configuradas.</p>;
  }
  return (
    <div className="space-y-4">
      {data.map(({ dim, pct, cambioPromedio }) => (
        <div key={dim.id}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium">{dim.nombre}</span>
            <span className="flex items-center gap-2">
              {cambioPromedio !== null && cambioPromedio !== 0 && (
                <span
                  className={`text-xs font-semibold ${cambioPromedio > 0 ? 'text-emerald-600' : 'text-red-600'}`}
                >
                  {cambioPromedio > 0 ? `↑ +${cambioPromedio}` : `↓ ${cambioPromedio}`}
                </span>
              )}
              <span className="font-bold tabular-nums">{pct !== null ? `${pct}%` : '—'}</span>
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct ?? 0}%`, backgroundColor: dim.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
