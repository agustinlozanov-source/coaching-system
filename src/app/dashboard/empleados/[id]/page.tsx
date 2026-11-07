'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Edit2, Loader2, TrendingUp, AlertCircle, AlertTriangle } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { getEmpleadoById, getCoaches } from '@/hooks/useEmpleados';
import { listEvaluaciones } from '@/lib/teamx/evaluacion';
import {
  buildEmpleadoStats,
  iniciales,
  semaforoEficiencia,
  SEMAFORO_TEXT_CLASS,
  SEMAFORO_BAR_CLASS,
  type EmpleadoStats,
} from '@/lib/teamx/equipo';
import { cn } from '@/lib/utils/cn';
import type { Empleado } from '@/types/empleado';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EmpleadoDialog } from '@/components/empleados/EmpleadoDialog';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  revision: 'En revisión',
  firmada: 'Firmada',
  cofirmada: 'Co-firmada',
  bloqueada: 'Bloqueada',
};

/** Un porcentaje listo para leer, o un guion cuando todavía no hay dato. */
function pct(v: number | null | undefined): string {
  return typeof v === 'number' ? `${Math.round(v)}%` : '—';
}

export default function EmpleadoDetailPage({ params }: PageProps) {
  const router = useRouter();
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [stats, setStats] = useState<EmpleadoStats | null>(null);
  const [coachNombre, setCoachNombre] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      try {
        setCargando(true);
        setError(null);

        const persona = await getEmpleadoById(params.id);
        if (!activo) return;
        if (!persona) {
          setError('Persona no encontrada');
          return;
        }
        setEmpleado(persona);

        // listEvaluaciones() trae las de la organización activa; buildEmpleadoStats
        // se queda con las de esta persona y calcula antigüedad, madurez y alertas.
        const [evaluaciones, coaches] = await Promise.all([listEvaluaciones(), getCoaches()]);
        if (!activo) return;

        setStats(buildEmpleadoStats(persona, evaluaciones));
        setCoachNombre(coaches.find((c) => c.id === persona.coachAsignado)?.nombre ?? null);
      } catch (err) {
        console.error('Error al cargar la ficha de la persona:', err);
        if (activo) setError('Error al cargar la información');
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargar();
    return () => {
      activo = false;
    };
  }, [params.id, recarga]);

  // Una línea por evaluación: competencias y eficiencia en la misma gráfica, que
  // es la comparación que de verdad se mira (el qué sabe hacer contra el qué logró).
  const serie = useMemo(() => {
    if (!stats) return [];
    return stats.evaluacionesAsc.map((e) => ({
      etiqueta: e.semana ? `S${e.semana}` : format(new Date(`${e.fecha}T00:00:00`), 'dd/MM', { locale: es }),
      competencias: typeof e.promedioGeneral === 'number' ? Math.round(e.promedioGeneral) : null,
      eficiencia: typeof e.eficiencia?.logro === 'number' ? Math.round(e.eficiencia.logro) : null,
    }));
  }, [stats]);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Cargando información de la persona...</p>
      </div>
    );
  }

  if (error || !empleado || !stats) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/empleados')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a personas
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-4 text-lg font-semibold text-muted-foreground">
              {error || 'Persona no encontrada'}
            </p>
            <Button onClick={() => router.push('/dashboard/empleados')}>Volver a la lista</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const semaforo = semaforoEficiencia(stats.pctEficiencia);
  const fechaIngresoFormato = format(empleado.fechaIngreso.toDate(), "d 'de' MMMM yyyy", { locale: es });
  const evalsDesc = stats.evaluacionesAsc.slice().reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/empleados')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <Button onClick={() => setShowDialog(true)}>
          <Edit2 className="mr-2 h-4 w-4" />
          Editar
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={empleado.photoURL || undefined} alt="" />
              <AvatarFallback className="text-lg font-semibold">
                {iniciales(empleado.nombre)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h1 className="font-jakarta text-3xl font-bold">{empleado.nombre}</h1>
                <Badge variant={empleado.activo ? 'success' : 'muted'}>
                  {empleado.activo ? 'Activo' : 'Inactivo'}
                </Badge>
                <Badge className={stats.madurez.badgeClass}>{stats.madurez.label}</Badge>
              </div>
              <p className="mb-4 text-lg text-muted-foreground">{empleado.cargo}</p>
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Consecutivo</span>
                  <p className="font-semibold">#{empleado.consecutivo}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Puesto</span>
                  <p className="font-semibold">{empleado.categorias?.['puesto'] || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Antigüedad</span>
                  <p className="font-semibold">
                    {stats.antiguedadSemanas} {stats.antiguedadSemanas === 1 ? 'semana' : 'semanas'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {stats.alerta && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-900">
              {stats.ultimaEvaluacion
                ? `Sin evaluar desde hace ${stats.semanasSinEvaluar} semanas.`
                : 'Todavía no tiene ninguna evaluación.'}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto shrink-0"
              onClick={() => router.push(`/dashboard/evaluaciones/nueva?empleadoId=${params.id}`)}
            >
              Evaluar ahora
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {empleado.email && (
              <div>
                <p className="text-sm text-muted-foreground">Correo</p>
                <p className="font-medium">{empleado.email}</p>
              </div>
            )}
            {empleado.telefono && (
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-medium">{empleado.telefono}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Fecha de ingreso</p>
              <p className="font-medium">{fechaIngresoFormato}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Coach asignado</p>
              <p className="font-medium">{coachNombre ?? 'Sin asignar'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Desempeño</CardTitle>
            <CardDescription>
              {stats.ultimaEvaluacion
                ? `Última evaluación: ${format(
                    new Date(`${stats.ultimaEvaluacion.fecha}T00:00:00`),
                    "d 'de' MMMM",
                    { locale: es }
                  )}${stats.ultimaEvaluacion.semana ? ` · semana ${stats.ultimaEvaluacion.semana}` : ''}`
                : 'Sin evaluaciones todavía'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-sm text-muted-foreground">Competencias</p>
                <span className="text-sm font-semibold tabular-nums">{pct(stats.pctCompetencias)}</span>
              </div>
              <Progress value={stats.pctCompetencias ?? 0} className="h-2" />
            </div>

            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-sm text-muted-foreground">Eficiencia (logro)</p>
                <span className={cn('text-sm font-semibold tabular-nums', SEMAFORO_TEXT_CLASS[semaforo])}>
                  {pct(stats.pctEficiencia)}
                </span>
              </div>
              <Progress
                value={Math.min(100, stats.pctEficiencia ?? 0)}
                className={cn('h-2', SEMAFORO_BAR_CLASS[semaforo])}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-4 text-sm">
              <div>
                <p className="text-muted-foreground">Evaluaciones</p>
                <p className="text-2xl font-bold tabular-nums">{stats.evaluacionesAsc.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Semanas sin evaluar</p>
                <p
                  className={cn(
                    'text-2xl font-bold tabular-nums',
                    stats.alerta && 'text-amber-600'
                  )}
                >
                  {stats.semanasSinEvaluar ?? '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {serie.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Evolución
            </CardTitle>
            <CardDescription>Competencias y eficiencia a lo largo del ciclo.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={serie}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="etiqueta" stroke="#6b7280" />
                <YAxis domain={[0, 100]} stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                  }}
                  formatter={(value: any) => (value === null ? 'sin dato' : `${value}%`)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="competencias"
                  name="Competencias"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  connectNulls
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="eficiencia"
                  name="Eficiencia"
                  stroke="#10b981"
                  strokeWidth={2}
                  connectNulls
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evaluaciones</CardTitle>
          <CardDescription>Historial de evaluaciones de desempeño.</CardDescription>
        </CardHeader>
        <CardContent>
          {evalsDesc.length === 0 ? (
            <div className="space-y-4 py-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Sin evaluaciones todavía</p>
              <Button
                size="sm"
                onClick={() => router.push(`/dashboard/evaluaciones/nueva?empleadoId=${params.id}`)}
              >
                Crear la primera evaluación
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {evalsDesc.slice(0, 5).map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {format(new Date(`${ev.fecha}T00:00:00`), "d 'de' MMM yyyy", { locale: es })}
                      {ev.semana ? <span className="text-muted-foreground"> · semana {ev.semana}</span> : null}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Competencias {pct(ev.promedioGeneral)} · Eficiencia{' '}
                      {pct(typeof ev.eficiencia?.logro === 'number' ? ev.eficiencia.logro : null)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge variant={ev.estado === 'borrador' ? 'secondary' : 'default'}>
                      {ESTADO_LABEL[ev.estado] ?? ev.estado}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/dashboard/evaluaciones/${ev.id}`)}
                    >
                      Ver
                    </Button>
                  </div>
                </div>
              ))}
              {evalsDesc.length > 5 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/dashboard/evaluaciones')}
                >
                  Ver todas ({evalsDesc.length})
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <EmpleadoDialog
        open={showDialog}
        empleado={empleado}
        onClose={() => setShowDialog(false)}
        onSuccess={() => {
          setShowDialog(false);
          setRecarga((n) => n + 1);
        }}
      />

      <div className="fixed bottom-6 right-6">
        <Button
          size="lg"
          className="rounded-full shadow-lg"
          onClick={() => router.push(`/dashboard/evaluaciones/nueva?empleadoId=${params.id}`)}
        >
          <TrendingUp className="mr-2 h-5 w-5" />
          Evaluar ahora
        </Button>
      </div>
    </div>
  );
}
