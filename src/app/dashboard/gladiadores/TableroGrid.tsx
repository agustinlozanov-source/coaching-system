'use client';

import { Medal } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { TableroGladiadores } from '@/lib/teamx/gladiadores';
import { GladiadorCelda } from './GladiadorCelda';
import { RachaBadge } from './RachaBadge';

const iniciales = (n: string) =>
  n.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

function colorAcumulado(pct: number | null): string {
  if (pct === null) return 'text-muted-foreground';
  if (pct > 95) return 'text-emerald-600';
  if (pct >= 85) return 'text-amber-600';
  return 'text-red-600';
}

const MEDALLA = ['text-yellow-500', 'text-slate-400', 'text-amber-700'];

/** Grilla del tablero: filas = miembros del equipo, columnas = semanas del ciclo. */
export function TableroGrid({
  tablero,
  semanaActual,
  tv = false,
}: {
  tablero: TableroGladiadores;
  semanaActual?: number | null;
  tv?: boolean;
}) {
  // Ranking: mejor eficiencia acumulada primero (empate → orden original / alfabético).
  const filasOrdenadas = [...tablero.filas].sort((a, b) => {
    if (a.eficienciaAcumulada === b.eficienciaAcumulada) return a.nombre.localeCompare(b.nombre);
    if (a.eficienciaAcumulada === null) return 1;
    if (b.eficienciaAcumulada === null) return -1;
    return b.eficienciaAcumulada - a.eficienciaAcumulada;
  });

  const cellPad = tv ? 'p-3' : 'p-2';
  const nameColW = tv ? 'min-w-[280px]' : 'min-w-[220px]';
  const weekColW = tv ? 'min-w-[64px]' : 'min-w-[48px]';

  return (
    <div className={cn('overflow-x-auto rounded-lg border', tv ? 'border-white/10' : 'bg-card')}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className={cn(tv ? 'bg-white/5' : 'bg-muted/40 text-xs uppercase text-muted-foreground')}>
            <th
              className={cn(
                'sticky left-0 z-10 text-left font-semibold',
                cellPad, nameColW,
                tv ? 'bg-zinc-950' : 'bg-muted/40',
              )}
            >
              Gladiador
            </th>
            {tablero.semanas.map((s) => (
              <th
                key={s}
                className={cn(
                  'text-center font-semibold tabular-nums',
                  cellPad, weekColW,
                  s === semanaActual && (tv ? 'bg-white/10' : 'bg-emerald-50 text-emerald-700'),
                )}
              >
                S{s}
              </th>
            ))}
            <th className={cn('text-right font-semibold', cellPad, tv ? 'min-w-[110px]' : 'min-w-[90px]')}>
              % Acum.
            </th>
            <th className={cn('text-center font-semibold', cellPad, tv ? 'min-w-[100px]' : 'min-w-[80px]')}>
              Racha
            </th>
          </tr>
        </thead>
        <tbody>
          {filasOrdenadas.map((fila, idx) => (
            <tr
              key={fila.empleadoId}
              className={cn(
                'border-t transition-colors',
                tv ? 'border-white/10 hover:bg-white/5' : 'hover:bg-muted/30',
              )}
            >
              <td
                className={cn(
                  'sticky left-0 z-10',
                  cellPad, nameColW,
                  tv ? 'bg-zinc-950' : 'bg-card',
                )}
              >
                <div className="flex items-center gap-3">
                  {idx < 3 && fila.eficienciaAcumulada !== null ? (
                    <Medal className={cn(tv ? 'h-6 w-6' : 'h-4 w-4', 'shrink-0', MEDALLA[idx])} />
                  ) : (
                    <span className={cn('shrink-0 text-center font-bold tabular-nums text-muted-foreground', tv ? 'w-6 text-lg' : 'w-4 text-xs')}>
                      {idx + 1}
                    </span>
                  )}
                  <Avatar className={tv ? 'h-11 w-11' : 'h-8 w-8'}>
                    <AvatarImage src={fila.photoURL} alt={fila.nombre} />
                    <AvatarFallback className={cn('bg-emerald-100 text-emerald-700', tv && 'text-base')}>
                      {iniciales(fila.nombre)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className={cn('truncate font-semibold', tv && 'text-lg')}>{fila.nombre}</div>
                    <div className={cn('truncate text-muted-foreground', tv ? 'text-sm' : 'text-xs')}>{fila.cargo}</div>
                  </div>
                </div>
              </td>
              {fila.celdas.map((celda) => (
                <td
                  key={celda.semana}
                  className={cn(cellPad, weekColW, celda.semana === semanaActual && (tv ? 'bg-white/5' : 'bg-emerald-50/60'))}
                >
                  <GladiadorCelda celda={celda} tv={tv} />
                </td>
              ))}
              <td className={cn('text-right font-extrabold tabular-nums', cellPad, tv && 'text-xl', colorAcumulado(fila.eficienciaAcumulada))}>
                {fila.eficienciaAcumulada !== null ? `${fila.eficienciaAcumulada}%` : '—'}
              </td>
              <td className={cn('text-center', cellPad)}>
                <RachaBadge racha={fila.racha} tv={tv} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={cn('border-t-2 font-bold', tv ? 'border-white/20 bg-white/5' : 'border-border bg-muted/40')}>
            <td className={cn('sticky left-0 z-10', cellPad, nameColW, tv ? 'bg-zinc-950' : 'bg-muted/40')}>
              Promedio del equipo
            </td>
            {tablero.promediosColumna.map((p, i) => (
              <td
                key={tablero.semanas[i]}
                className={cn(
                  'text-center tabular-nums',
                  cellPad, weekColW,
                  tv && 'text-base',
                  colorAcumulado(p),
                )}
              >
                {p !== null ? `${p}%` : '—'}
              </td>
            ))}
            <td className={cn('text-right tabular-nums', cellPad, tv && 'text-xl', colorAcumulado(tablero.promedioEquipo))}>
              {tablero.promedioEquipo !== null ? `${tablero.promedioEquipo}%` : '—'}
            </td>
            <td className={cellPad} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
