'use client';

import Link from 'next/link';
import { ArrowUp, Trophy } from 'lucide-react';
import { dashIniciales, type ImprovementEntry } from '@/lib/teamx/dashboard-equipo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function TopMejoras({
  entries,
  nombres,
  fotos,
}: {
  entries: ImprovementEntry[];
  nombres: Record<string, string>;
  fotos?: Record<string, string | undefined>;
}) {
  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aún no hay comparaciones suficientes. Se necesitan al menos dos evaluaciones por miembro.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((e, i) => (
        <div key={e.empleadoId} className="flex items-center gap-3 rounded-lg border p-3">
          {i === 0 ? (
            <Trophy className="h-5 w-5 flex-shrink-0 text-amber-500" />
          ) : (
            <span className="w-5 flex-shrink-0 text-center text-sm font-bold text-muted-foreground">{i + 1}</span>
          )}
          <Link href={`/dashboard/empleados/${e.empleadoId}`} className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={fotos?.[e.empleadoId] || undefined} alt="" />
              <AvatarFallback>{dashIniciales(nombres[e.empleadoId] ?? '?')}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="cursor-pointer truncate text-sm font-medium hover:underline">{nombres[e.empleadoId] ?? 'Empleado'}</p>
              <p className="text-xs text-muted-foreground">
                {e.anterior}% → {e.actual}%
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-1 text-sm font-bold text-emerald-600">
            <ArrowUp className="h-4 w-4" /> +{e.delta}
          </div>
        </div>
      ))}
    </div>
  );
}
