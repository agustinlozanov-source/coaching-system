'use client';

import { ShieldHalf } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { SEMAFORO_COLOR, type CeldaGladiador } from '@/lib/teamx/gladiadores';

/** Un ícono de gladiador coloreado por el semáforo de eficiencia de esa semana. */
export function GladiadorCelda({ celda, tv = false }: { celda: CeldaGladiador; tv?: boolean }) {
  const c = SEMAFORO_COLOR[celda.semaforo];
  const size = tv ? 'h-9 w-9' : 'h-6 w-6';
  const wrap = tv ? 'h-14 w-14' : 'h-9 w-9';
  const title = celda.logro !== null
    ? `Semana ${celda.semana}: ${celda.logro}% (${c.label})`
    : `Semana ${celda.semana}: sin evaluación`;

  return (
    <div
      title={title}
      className={cn(
        'mx-auto flex items-center justify-center rounded-full border transition-colors',
        wrap,
        celda.semaforo === 'sin-dato' ? cn(c.bg, c.border, 'opacity-50') : cn(c.bg, c.border),
      )}
    >
      <ShieldHalf className={cn(size, c.text)} strokeWidth={celda.semaforo === 'sin-dato' ? 1.5 : 2.25} />
    </div>
  );
}
