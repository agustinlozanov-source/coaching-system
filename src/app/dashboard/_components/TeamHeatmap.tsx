'use client';

import type { Dimension, Evaluacion } from '@/types/teamx';
import { dashIniciales, dashPctDimForEval, dashSemaforoPct, DASH_SEMAFORO_BG } from '@/lib/teamx/dashboard-equipo';

interface EmpleadoLite {
  id: string;
  nombre: string;
}

export function TeamHeatmap({
  dims,
  empleados,
  latest,
}: {
  dims: Dimension[];
  empleados: EmpleadoLite[];
  latest: Map<string, Evaluacion>;
}) {
  if (dims.length === 0 || empleados.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Sin datos suficientes todavía.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-[160px] bg-card p-2 text-left text-xs font-semibold uppercase text-muted-foreground">
              Dimensión
            </th>
            {empleados.map((emp) => (
              <th key={emp.id} className="p-2 text-center text-xs font-medium text-muted-foreground">
                <div
                  className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-foreground"
                  title={emp.nombre}
                >
                  {dashIniciales(emp.nombre)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dims.map((dim) => (
            <tr key={dim.id} className="border-t">
              <td className="sticky left-0 z-10 bg-card p-2 font-medium">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: dim.color }} />
                  {dim.nombre}
                </span>
              </td>
              {empleados.map((emp) => {
                const ev = latest.get(emp.id);
                const pct = ev ? dashPctDimForEval(ev, dim.id) : null;
                const sem = dashSemaforoPct(pct);
                return (
                  <td key={emp.id} className="p-1 text-center">
                    <div
                      className={`mx-auto flex h-9 w-14 items-center justify-center rounded-md text-xs font-bold tabular-nums ${DASH_SEMAFORO_BG[sem]}`}
                      title={`${emp.nombre} · ${dim.nombre}`}
                    >
                      {pct !== null ? `${pct}%` : '—'}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
