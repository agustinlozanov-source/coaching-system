'use client';

import { useRouter } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { GlowButton } from '@/components/ui/glow-button';

export function DashboardEmptyState() {
  const router = useRouter();
  return (
    <Card>
      <CardContent className="flex flex-col items-center py-20 text-center">
        <div className="rounded-full bg-emerald-50 p-4">
          <ClipboardList className="h-10 w-10 text-emerald-600" />
        </div>
        <h3 className="mt-4 text-lg font-bold">Todavía no hay evaluaciones</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Cuando registres la primera evaluación de tu equipo vas a ver acá el panel completo: promedios por
          dimensión, radar del equipo, mapa de calor y alertas de coaching.
        </p>
        <GlowButton className="mt-5" onClick={() => router.push('/dashboard/evaluaciones/nueva')}>
          Nueva evaluación
        </GlowButton>
      </CardContent>
    </Card>
  );
}
