'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus, Users } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Empleado } from '@/types/empleado';
import type { Evaluacion } from '@/types/teamx';
import {
  ultimasPorEmpleado, evolucionSemanal, tendenciasEquipoPorDimension,
  semaforoEficiencia, SEMAFORO_BADGE, SEMAFORO_LABEL, type Direccion,
} from '@/lib/teamx/reportes';

interface Props {
  empleados: Empleado[];
  evaluaciones: Evaluacion[];
}

function IconoTendencia({ direccion }: { direccion: Direccion }) {
  if (direccion === 'sube') return <TrendingUp className="h-4 w-4 text-emerald-600" />;
  if (direccion === 'baja') return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

const DIRECCION_LABEL: Record<Direccion, string> = {
  sube: 'Sube', baja: 'Baja', estable: 'Estancada', 'sin-datos': 'Sin datos',
};

export function ReporteEquipo({ empleados, evaluaciones }: Props) {
  const ultimas = useMemo(() => ultimasPorEmpleado(evaluaciones), [evaluaciones]);
  const ultimasArr = useMemo(() => Array.from(ultimas.values()), [ultimas]);

  const cobertura = { evaluados: ultimas.size, total: empleados.length };

  const promedioEquipo = useMemo(() => {
    const vals = ultimasArr.map((e) => e.promedioGeneral).filter((v): v is number => v != null);
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  }, [ultimasArr]);

  const eficienciaEquipo = useMemo(() => {
    const vals = ultimasArr
      .map((e) => (typeof e.eficiencia?.logro === 'number' ? e.eficiencia.logro : null))
      .filter((v): v is number => v != null);
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  }, [ultimasArr]);

  const evolucion = useMemo(() => evolucionSemanal(evaluaciones), [evaluaciones]);
  const tendenciasDim = useMemo(() => tendenciasEquipoPorDimension(evaluaciones), [evaluaciones]);

  const filasTabla = useMemo(() => empleados
    .map((emp) => {
      const ultima = ultimas.get(emp.id) ?? null;
      const totalEvals = evaluaciones.filter((e) => e.empleadoId === emp.id).length;
      const eficiencia = typeof ultima?.eficiencia?.logro === 'number' ? ultima.eficiencia.logro : null;
      return { emp, ultima, totalEvals, eficiencia };
    })
    .sort((a, b) => (b.ultima?.promedioGeneral ?? -1) - (a.ultima?.promedioGeneral ?? -1)),
  [empleados, evaluaciones, ultimas]);

  return (
    <div className="space-y-6">
      {/* Consolidación */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="py-5">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Cobertura</div>
          <div className="mt-1 text-3xl font-extrabold tabular-nums">{cobertura.evaluados}/{cobertura.total}</div>
          <Progress
            value={cobertura.total ? (cobertura.evaluados / cobertura.total) * 100 : 0}
            className="mt-3 h-2"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {cobertura.total ? Math.round((cobertura.evaluados / cobertura.total) * 100) : 0}% del equipo evaluado
          </p>
        </CardContent></Card>
        <Card><CardContent className="py-5">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Promedio general</div>
          <div className="mt-1 text-3xl font-extrabold tabular-nums">{promedioEquipo ?? '—'}{promedioEquipo != null ? '%' : ''}</div>
          <p className="mt-1 text-xs text-muted-foreground">Última evaluación de cada empleado</p>
        </CardContent></Card>
        <Card><CardContent className="py-5">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Eficiencia promedio</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-3xl font-extrabold tabular-nums">{eficienciaEquipo ?? '—'}{eficienciaEquipo != null ? '%' : ''}</span>
            {(() => {
              const s = semaforoEficiencia(eficienciaEquipo);
              return <Badge variant={SEMAFORO_BADGE[s]}>{SEMAFORO_LABEL[s]}</Badge>;
            })()}
          </div>
        </CardContent></Card>
        <Card><CardContent className="py-5">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Evaluaciones totales</div>
          <div className="mt-1 text-3xl font-extrabold tabular-nums">{evaluaciones.length}</div>
        </CardContent></Card>
      </div>

      {/* Evolución del promedio semana a semana */}
      <Card className="print:break-inside-avoid">
        <CardHeader>
          <CardTitle>Evolución del promedio del equipo</CardTitle>
          <CardDescription>Promedio general de todas las evaluaciones, agrupado por semana.</CardDescription>
        </CardHeader>
        <CardContent>
          {evolucion.length < 2 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Se necesitan evaluaciones de al menos 2 semanas distintas para ver una tendencia.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={evolucion}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis domain={[0, 100]} fontSize={12} />
                <Tooltip formatter={(v: any, _name: any, props: any) => [`${v}%`, `Promedio (n=${props?.payload?.n ?? '?'})`]} />
                <Legend />
                <Line type="monotone" dataKey="promedio" name="Promedio general" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Dimensiones que suben / se estancan / bajan */}
      <Card className="print:break-inside-avoid">
        <CardHeader>
          <CardTitle>Dimensiones: primera mitad vs. segunda mitad del ciclo</CardTitle>
          <CardDescription>Compara el promedio de las evaluaciones más antiguas contra las más recientes.</CardDescription>
        </CardHeader>
        <CardContent>
          {tendenciasDim.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Se necesitan al menos 2 evaluaciones para comparar dimensiones en el tiempo.
            </p>
          ) : (
            <div className="space-y-2">
              {tendenciasDim.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                    <div>
                      <div className="text-sm font-medium">{t.nombre}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.early ?? '—'}% → {t.late ?? '—'}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={t.direccion === 'sube' ? 'success' : t.direccion === 'baja' ? 'destructive' : 'muted'}>
                      {DIRECCION_LABEL[t.direccion]}
                    </Badge>
                    <IconoTendencia direccion={t.direccion} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de empleados */}
      <Card className="print:break-inside-avoid">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Empleados</CardTitle>
          <CardDescription>{empleados.length} empleados activos.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Empleado</th>
                  <th className="p-3 text-left">Cargo</th>
                  <th className="p-3 text-left">Última evaluación</th>
                  <th className="p-3 text-right">Evaluaciones</th>
                  <th className="p-3 text-right">General</th>
                  <th className="p-3 text-right">Eficiencia</th>
                  <th className="p-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filasTabla.map(({ emp, ultima, totalEvals, eficiencia }) => {
                  const s = semaforoEficiencia(eficiencia);
                  return (
                    <tr key={emp.id} className="border-b">
                      <td className="p-3 font-medium">{emp.nombre}</td>
                      <td className="p-3 text-muted-foreground">{emp.cargo || '—'}</td>
                      <td className="p-3 text-muted-foreground">
                        {ultima ? format(new Date(ultima.fecha + 'T00:00:00'), 'dd/MM/yyyy', { locale: es }) : 'Sin evaluar'}
                      </td>
                      <td className="p-3 text-right tabular-nums">{totalEvals}</td>
                      <td className="p-3 text-right font-bold tabular-nums">{ultima?.promedioGeneral ?? '—'}{ultima?.promedioGeneral != null ? '%' : ''}</td>
                      <td className="p-3 text-right tabular-nums">{eficiencia ?? '—'}{eficiencia != null ? '%' : ''}</td>
                      <td className="p-3"><Badge variant={SEMAFORO_BADGE[s]}>{SEMAFORO_LABEL[s]}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
