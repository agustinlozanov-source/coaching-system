'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Target, Gauge, Users, ClipboardCheck } from 'lucide-react';
import { startOfWeek, endOfWeek } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { listEvaluaciones, getDimensiones, getCicloActivo } from '@/lib/teamx/evaluacion';
import { getActiveOrgId } from '@/lib/teamx/org';
import { getEmpleados } from '@/hooks/useEmpleados';
import type { Dimension, Evaluacion } from '@/types/teamx';
import type { Empleado } from '@/types/empleado';
import {
  dashLatestByEmpleado,
  dashPreviousByEmpleado,
  dashPromedioPorDimension,
  dashRequierenAtencion,
  dashTopMejoras,
  dashSemaforoEficiencia,
} from '@/lib/teamx/dashboard-equipo';
import { KpiCards, type Kpi } from './_components/KpiCards';
import { InsightsBanner } from './_components/InsightsBanner';
import { DimensionBars } from './_components/DimensionBars';
import { TeamRadarChart } from './_components/TeamRadarChart';
import { TeamHeatmap } from './_components/TeamHeatmap';
import { AttentionList } from './_components/AttentionList';
import { TopMejoras } from './_components/TopMejoras';
import { DashboardEmptyState } from './_components/DashboardEmptyState';

export const dynamic = 'force-dynamic';

const EFICIENCIA_ESTILO: Record<string, { color: string; bg: string }> = {
  verde: { color: 'text-emerald-600', bg: 'bg-emerald-50' },
  amarillo: { color: 'text-amber-600', bg: 'bg-amber-50' },
  rojo: { color: 'text-red-600', bg: 'bg-red-50' },
  gris: { color: 'text-muted-foreground', bg: 'bg-muted' },
};

function avg(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

export default function DashboardPage() {
  const [evals, setEvals] = useState<Evaluacion[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [dims, setDims] = useState<Dimension[]>([]);
  const [cicloId, setCicloId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const orgId = await getActiveOrgId();
        const [ev, emps, dimensiones, ciclo] = await Promise.all([
          listEvaluaciones(),
          getEmpleados(),
          orgId ? getDimensiones(orgId) : Promise.resolve([]),
          orgId ? getCicloActivo(orgId) : Promise.resolve(null),
        ]);
        setEvals(ev);
        setEmpleados(emps);
        setDims(dimensiones.filter((d) => d.naturaleza === 'competencia'));
        setCicloId(ciclo?.id ?? null);
      } catch (error) {
        console.error('Error cargando el dashboard de equipo:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const nombres = useMemo(
    () => Object.fromEntries(empleados.map((e) => [e.id, e.nombre])),
    [empleados]
  );
  const fotos = useMemo(
    () => Object.fromEntries(empleados.map((e) => [e.id, e.photoURL])),
    [empleados]
  );
  const empleadoIds = useMemo(() => empleados.map((e) => e.id), [empleados]);

  const latest = useMemo(() => dashLatestByEmpleado(evals), [evals]);
  const previous = useMemo(() => dashPreviousByEmpleado(evals), [evals]);

  const dimAvgs = useMemo(() => dashPromedioPorDimension(dims, latest), [dims, latest]);

  const atencion = useMemo(
    () => dashRequierenAtencion(empleadoIds, latest, previous),
    [empleadoIds, latest, previous]
  );

  const topMejoras = useMemo(
    () => dashTopMejoras(empleadoIds, latest, previous),
    [empleadoIds, latest, previous]
  );

  const kpis = useMemo(() => {
    const latestVals = Array.from(latest.values());

    const promGeneral = avg(
      latestVals.map((e) => e.promedioGeneral).filter((v): v is number => v !== null && v !== undefined)
    );

    const eficienciaVals: number[] = [];
    latestVals.forEach((e) => {
      const l = e.eficiencia?.logro;
      if (typeof l === 'number' && !Number.isNaN(l)) eficienciaVals.push(l);
    });
    const eficienciaProm = avg(eficienciaVals);

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const evaluadosEstaSemana = new Set(
      evals
        .filter((e) => {
          const f = new Date(`${e.fecha}T00:00:00`);
          return f >= weekStart && f <= weekEnd;
        })
        .map((e) => e.empleadoId)
    );
    const cobertura = empleados.length ? Math.round((evaluadosEstaSemana.size / empleados.length) * 100) : 0;

    const evaluacionesCiclo = cicloId ? evals.filter((e) => e.cicloId === cicloId).length : evals.length;

    return {
      promGeneral,
      eficienciaProm,
      cobertura,
      evaluadosEstaSemana: evaluadosEstaSemana.size,
      evaluacionesCiclo,
      hayCiclo: cicloId !== null,
    };
  }, [latest, evals, empleados, cicloId]);

  const insights = useMemo(() => {
    const out: string[] = [];

    const conCambio = dimAvgs.filter((d) => d.cambioPromedio !== null && d.cambioPromedio !== 0);
    const mejorDim = [...conCambio]
      .filter((d) => (d.cambioPromedio as number) > 0)
      .sort((a, b) => (b.cambioPromedio as number) - (a.cambioPromedio as number))[0];
    const peorDim = [...conCambio]
      .filter((d) => (d.cambioPromedio as number) < 0)
      .sort((a, b) => (a.cambioPromedio as number) - (b.cambioPromedio as number))[0];

    if (mejorDim) {
      out.push(
        `El equipo mejoró en ${mejorDim.dim.nombre} (+${mejorDim.cambioPromedio} pts en promedio) respecto a la evaluación anterior de cada miembro.`
      );
    }
    if (peorDim) {
      out.push(
        `${peorDim.dim.nombre} bajó ${Math.abs(peorDim.cambioPromedio as number)} pts en promedio: conviene reforzarla en la próxima sesión de coaching.`
      );
    }
    if (out.length === 0 && kpis.promGeneral !== null) {
      out.push(
        `El promedio general del equipo es ${kpis.promGeneral}%, con ${kpis.cobertura}% de cobertura de coaching esta semana.`
      );
    }
    if (out.length < 3 && atencion.length > 0) {
      out.push(
        `${atencion.length} ${atencion.length === 1 ? 'miembro requiere' : 'miembros requieren'} atención esta semana.`
      );
    }

    return out.slice(0, 3);
  }, [dimAvgs, kpis, atencion]);

  const kpiCards: Kpi[] = useMemo(() => {
    const eficienciaSem = dashSemaforoEficiencia(kpis.eficienciaProm);
    const eficienciaEstilo = EFICIENCIA_ESTILO[eficienciaSem];
    return [
      {
        title: 'Promedio general del equipo',
        value: kpis.promGeneral !== null ? `${kpis.promGeneral}%` : '—',
        description: 'Competencias, última evaluación de cada miembro',
        icon: Target,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
      },
      {
        title: 'Eficiencia promedio',
        value: kpis.eficienciaProm !== null ? `${kpis.eficienciaProm}%` : '—',
        description: 'Logro vs. meta, última evaluación',
        icon: Gauge,
        color: eficienciaEstilo.color,
        bg: eficienciaEstilo.bg,
      },
      {
        title: 'Cobertura de coaching',
        value: `${kpis.cobertura}%`,
        description: `${kpis.evaluadosEstaSemana} de ${empleados.length} evaluados esta semana`,
        icon: Users,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
      },
      {
        title: kpis.hayCiclo ? 'Evaluaciones del ciclo' : 'Evaluaciones totales',
        value: kpis.evaluacionesCiclo.toString(),
        description: kpis.hayCiclo ? 'Registradas en el ciclo activo' : 'Sin ciclo activo configurado',
        icon: ClipboardCheck,
        color: 'text-violet-600',
        bg: 'bg-violet-50',
      },
    ];
  }, [kpis, empleados.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de equipo</h1>
        <p className="text-muted-foreground">Panel de coaching: cómo está el equipo hoy y dónde enfocar la próxima sesión.</p>
      </div>

      {evals.length === 0 ? (
        <DashboardEmptyState />
      ) : (
        <>
          <KpiCards kpis={kpiCards} />

          <InsightsBanner insights={insights} />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Promedio por dimensión</CardTitle>
                <CardDescription>Todo el equipo, última evaluación de cada miembro</CardDescription>
              </CardHeader>
              <CardContent>
                <DimensionBars data={dimAvgs} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Perfil del equipo</CardTitle>
                <CardDescription>Vista radar de las dimensiones de competencia</CardDescription>
              </CardHeader>
              <CardContent>
                <TeamRadarChart data={dimAvgs} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Mapa de calor</CardTitle>
              <CardDescription>Dimensiones × miembros, última evaluación de cada uno</CardDescription>
            </CardHeader>
            <CardContent>
              <TeamHeatmap dims={dims} empleados={empleados} latest={latest} />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Requiere atención</CardTitle>
                <CardDescription>Score bajo, tendencia negativa o sin evaluación reciente</CardDescription>
              </CardHeader>
              <CardContent>
                <AttentionList entries={atencion} nombres={nombres} fotos={fotos} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top mejoras del periodo</CardTitle>
                <CardDescription>Quién avanzó más vs. su evaluación anterior</CardDescription>
              </CardHeader>
              <CardContent>
                <TopMejoras entries={topMejoras} nombres={nombres} fotos={fotos} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
