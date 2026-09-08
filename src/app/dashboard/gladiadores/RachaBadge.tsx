'use client';

import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/** Badge de racha: semanas consecutivas en verde. Solo se destaca a partir de 2. */
export function RachaBadge({ racha, tv = false }: { racha: number; tv?: boolean }) {
  if (racha <= 0) {
    return <span className={cn('text-muted-foreground', tv ? 'text-base' : 'text-xs')}>—</span>;
  }
  const caliente = racha >= 3;
  return (
    <span
      title={`${racha} semana${racha === 1 ? '' : 's'} consecutivas en verde`}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-bold tabular-nums',
        tv ? 'text-base px-3 py-1' : 'text-xs',
        caliente
          ? 'border-orange-300 bg-orange-100 text-orange-700'
          : 'border-emerald-300 bg-emerald-100 text-emerald-700',
      )}
    >
      <Flame className={cn(tv ? 'h-4 w-4' : 'h-3 w-3', caliente && 'fill-orange-500')} />
      {racha}
    </span>
  );
}
