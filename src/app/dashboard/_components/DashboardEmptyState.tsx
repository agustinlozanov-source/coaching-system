'use client';

import { useRouter } from 'next/navigation';
import { ClipboardList, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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
        <Button className="mt-5" onClick={() => router.push('/dashboard/evaluaciones/nueva')}>
          <Plus className="mr-2 h-4 w-4" /> Nueva evaluación
        </Button>
      </CardContent>
    </Card>
  );
}
