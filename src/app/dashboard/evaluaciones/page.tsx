'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, ClipboardList, ChevronRight } from 'lucide-react';
import { listEvaluaciones } from '@/lib/teamx/evaluacion';
import { getEmpleados } from '@/hooks/useEmpleados';
import type { Evaluacion } from '@/types/teamx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador', revision: 'En revisión', firmada: 'Firmada', cofirmada: 'Co-firmada', bloqueada: 'Bloqueada',
};

export default function EvaluacionesPage() {
  const router = useRouter();
  const [evals, setEvals] = useState<Evaluacion[]>([]);
  const [nombres, setNombres] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [ev, emps] = await Promise.all([listEvaluaciones(), getEmpleados()]);
      setEvals(ev);
      setNombres(Object.fromEntries(emps.map((e) => [e.id, e.nombre])));
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const total = evals.length;
    const borradores = evals.filter((e) => e.estado === 'borrador').length;
    const conValor = evals.map((e) => e.promedioGeneral).filter((v): v is number => v != null);
    const prom = conValor.length ? Math.round(conValor.reduce((s, v) => s + v, 0) / conValor.length) : 0;
    return { total, borradores, prom };
  }, [evals]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Evaluaciones</h1>
          <p className="text-muted-foreground">Tableros de coaching de tu equipo.</p>
        </div>
        <Button onClick={() => router.push('/dashboard/evaluaciones/nueva')}>
          <Plus className="mr-2 h-4 w-4" /> Nueva evaluación
        </Button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Borradores', value: stats.borradores },
          { label: 'Promedio general', value: `${stats.prom}%` },
        ].map((s) => (
          <Card key={s.label}><CardContent className="py-5">
            <div className="text-xs font-semibold uppercase text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-3xl font-extrabold tabular-nums">{s.value}</div>
          </CardContent></Card>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : evals.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center py-16 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 font-bold">Aún no hay evaluaciones este ciclo</h3>
          <p className="mt-1 text-sm text-muted-foreground">Crea la primera y empieza a medir el proceso.</p>
          <Button className="mt-4" onClick={() => router.push('/dashboard/evaluaciones/nueva')}>
            <Plus className="mr-2 h-4 w-4" /> Nueva evaluación
          </Button>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Empleado</th>
                  <th className="p-3 text-left">Semana</th>
                  <th className="p-3 text-left">Fecha</th>
                  <th className="p-3 text-left">Estado</th>
                  <th className="p-3 text-right">General</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {evals.map((e) => (
                  <tr key={e.id} className="border-b transition hover:bg-muted/30">
                    <td className="p-3 font-medium">
                      {nombres[e.empleadoId] ? (
                        <Link href={`/dashboard/empleados/${e.empleadoId}`} className="hover:underline">
                          {nombres[e.empleadoId]}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">{e.semana ?? '—'}</td>
                    <td className="p-3 text-muted-foreground">{e.fecha}</td>
                    <td className="p-3"><Badge variant={e.estado === 'borrador' ? 'secondary' : 'default'}>{ESTADO_LABEL[e.estado] ?? e.estado}</Badge></td>
                    <td className="p-3 text-right font-bold tabular-nums">{e.promedioGeneral ?? 0}%</td>
                    <td className="p-3 text-right">
                      <Link href={`/dashboard/evaluaciones/${e.id}/editar`} className="inline-flex items-center text-emerald-600 hover:underline">
                        Abrir <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}
