'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts';
import {
  Target, Loader2, AlertTriangle, TrendingDown, GraduationCap, Users, Plus, ListChecks,
} from 'lucide-react';
import { getDimensiones, listEvaluaciones } from '@/lib/teamx/evaluacion';
import { getActiveOrgId } from '@/lib/teamx/org';
import { getEmpleados } from '@/hooks/useEmpleados';
import { buildAreasOportunidad, type AreasOportunidadData, type DimensionAgg } from '@/lib/teamx/areas-oportunidad';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

/** Color por % (mismo criterio: rojo crítico, naranja/ámbar en riesgo, verde saludable). */
function colorForPct(pct: number): string {
  if (pct < 30) return '#ef4444';
  if (pct < 50) return '#f97316';
  if (pct < 70) return '#f59e0b';
  return '#16a34a';
}

function Barra({ pct }: { pct: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: colorForPct(pct) }}
      />
    </div>
  );
}

export default function AreasOportunidadPage() {
  const router = useRouter();
  const [data, setData] = useState<AreasOportunidadData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const orgId = await getActiveOrgId();
        const [evaluaciones, empleados, dimensionesActuales] = await Promise.all([
          listEvaluaciones(),
          getEmpleados(),
          orgId ? getDimensiones(orgId) : Promise.resolve([]),
        ]);
        const empleadosMin = empleados.map((e) => ({ id: e.id, nombre: e.nombre }));
        setData(buildAreasOportunidad(evaluaciones, empleadosMin, dimensionesActuales));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const radarData = useMemo(() => {
    if (!data) return [];
    return [...data.dimensiones]
      .sort((a, b) => a.orden - b.orden)
      .map((d) => ({
        dim: d.nombre.length > 16 ? `${d.nombre.slice(0, 15)}…` : d.nombre,
        pct: d.avgPct,
      }));
  }, [data]);

  const header = (
    <div>
      <h1 className="text-2xl font-bold">Áreas de Oportunidad</h1>
      <p className="text-muted-foreground">
        Brechas del equipo, detectadas automáticamente a partir de la última evaluación de cada miembro.
      </p>
    </div>
  );

  if (loading) {
    return (
      <div>
        <div className="mb-6">{header}</div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!data || data.totalConEvaluacion === 0) {
    return (
      <div>
        <div className="mb-6">{header}</div>
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Target className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-bold">Aún no hay evaluaciones para analizar</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              En cuanto tu equipo tenga evaluaciones en curso o firmadas, aquí vas a ver automáticamente
              qué dimensiones y aspectos son más débiles, priorizados por impacto, con sugerencias de
              capacitación.
            </p>
            <Button className="mt-4" onClick={() => router.push('/dashboard/evaluaciones/nueva')}>
              <Plus className="mr-2 h-4 w-4" /> Nueva evaluación
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { dimensionesPorImpacto, aspectosDebiles, headline, sugerencias, totalConEvaluacion, totalEmpleados } = data;
  const aspectosTop = aspectosDebiles.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {header}
        <Badge variant="muted" className="w-fit">
          <Users className="mr-1 h-3.5 w-3.5" /> {totalConEvaluacion} de {totalEmpleados} miembros con evaluación
        </Badge>
      </div>

      {headline && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="flex items-start gap-3 py-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-600" />
            <p className="text-sm font-medium text-orange-900">{headline}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Radar del perfil agregado del equipo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Perfil agregado del equipo</CardTitle>
            <CardDescription>Promedio de % por dimensión de competencia (última evaluación de cada miembro).</CardDescription>
          </CardHeader>
          <CardContent>
            {radarData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Sin dimensiones de competencia configuradas.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickCount={5} />
                    <Radar dataKey="pct" name="Equipo" stroke="#059669" fill="#059669" fillOpacity={0.35} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Priorización por impacto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4 text-emerald-600" /> Priorización por impacto
            </CardTitle>
            <CardDescription>Dimensiones más débiles × más personas afectadas (debajo del 50%).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dimensionesPorImpacto.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos suficientes todavía.</p>
            ) : (
              dimensionesPorImpacto.slice(0, 6).map((d: DimensionAgg, i: number) => (
                <div key={d.id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">
                      <span className="text-muted-foreground">{i + 1}.</span> {d.nombre}
                    </span>
                    <span className="whitespace-nowrap tabular-nums text-muted-foreground">
                      {d.avgPct}% · {d.bajo50.length}/{d.miembros.length} afectados
                    </span>
                  </div>
                  <Barra pct={d.avgPct} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Desglose por aspecto granular */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-emerald-600" /> Aspectos más débiles del equipo
          </CardTitle>
          <CardDescription>Promedio por aspecto (no solo por dimensión), de menor a mayor dominio.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {aspectosTop.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Sin aspectos respondidos todavía.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Aspecto</th>
                    <th className="p-3 text-left">Dimensión</th>
                    <th className="p-3 text-left">Equipo</th>
                    <th className="p-3 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {aspectosTop.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{a.nombre}</td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          style={{ borderColor: a.dimensionColor, color: a.dimensionColor }}
                        >
                          {a.dimensionNombre}
                        </Badge>
                      </td>
                      <td className="w-1/3 p-3">
                        <Barra pct={a.avgPct} />
                      </td>
                      <td className="p-3 text-right font-bold tabular-nums">{a.avgPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sugerencias de capacitación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-4 w-4 text-emerald-600" /> Sugerencias de capacitación
          </CardTitle>
          <CardDescription>Foco recomendado según las áreas más débiles detectadas en el equipo.</CardDescription>
        </CardHeader>
        <CardContent>
          {sugerencias.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              El equipo no muestra dimensiones por debajo del 70% todavía. ¡Buen momento para sostener el nivel!
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {sugerencias.map((s) => (
                <div key={s.dimensionId} className="rounded-lg border p-4" style={{ borderLeftColor: s.color, borderLeftWidth: 4 }}>
                  <div className="mb-1 text-sm font-bold">{s.dimensionNombre}</div>
                  <p className="text-sm text-muted-foreground">{s.texto}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
