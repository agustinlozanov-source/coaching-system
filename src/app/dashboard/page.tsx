'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
  FileEdit,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { format, formatDistanceToNow, subMonths, startOfMonth, endOfMonth, subWeeks, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useEvaluaciones } from '@/hooks/useEvaluaciones';
import { useEmpleadosRealtime } from '@/hooks/useEmpleados';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const router = useRouter();
  const { getEvaluaciones } = useEvaluaciones();
  const empleados = useEmpleadosRealtime();

  const [evaluaciones, setEvaluaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar evaluaciones
  useEffect(() => {
    const cargarEvaluaciones = async () => {
      try {
        const data = await getEvaluaciones();
        setEvaluaciones(data);
      } catch (error) {
        console.error('Error cargando evaluaciones:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarEvaluaciones();
  }, [getEvaluaciones]);

  // Calcular métricas
  const metrics = useMemo(() => {
    const ahora = new Date();
    const inicioMes = startOfMonth(ahora);
    const finMes = endOfMonth(ahora);

    // Evaluaciones este mes
    const evalEseMes = evaluaciones.filter((e) => {
      const fecha = e.fecha.toDate();
      return fecha >= inicioMes && fecha <= finMes;
    });

    // Borradores pendientes
    const borradores = evaluaciones.filter((e) => e.status === 'borrador');

    // Efectividad promedio total
    const efectividadPromedio =
      evaluaciones.length > 0
        ? evaluaciones.reduce((sum, e) => sum + e.efectividad, 0) / evaluaciones.length
        : 0;

    // Efectividad promedio mes anterior
    const inicioMesAnterior = startOfMonth(subMonths(ahora, 1));
    const finMesAnterior = endOfMonth(subMonths(ahora, 1));
    const evalMesAnterior = evaluaciones.filter((e) => {
      const fecha = e.fecha.toDate();
      return fecha >= inicioMesAnterior && fecha <= finMesAnterior;
    });
    const efectividadMesAnterior =
      evalMesAnterior.length > 0
        ? evalMesAnterior.reduce((sum, e) => sum + e.efectividad, 0) / evalMesAnterior.length
        : 0;

    const tendencia = efectividadMesAnterior
      ? ((efectividadPromedio - efectividadMesAnterior) / efectividadMesAnterior) * 100
      : 0;

    // Empleados sin evaluar en más de 30 días
    const hace30Dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
    const empleadosSinEvaluar = empleados.filter((emp) => {
      const ultimaEval = evaluaciones
        .filter((e) => e.empleadoId === emp.id)
        .sort((a, b) => b.fecha.toDate().getTime() - a.fecha.toDate().getTime())[0];

      if (!ultimaEval) return true;
      return ultimaEval.fecha.toDate() < hace30Dias;
    });

    return {
      evalEseMes: evalEseMes.length,
      borradores: borradores.length,
      efectividadPromedio,
      tendencia,
      empleadosSinEvaluar: empleadosSinEvaluar.length,
    };
  }, [evaluaciones, empleados]);

  // Datos para gráfica de 8 semanas
  const chartData = useMemo(() => {
    const ahora = new Date();
    const datos = [];

    for (let i = 7; i >= 0; i--) {
      const inicio = startOfWeek(subWeeks(ahora, i));
      const fin = new Date(inicio.getTime() + 7 * 24 * 60 * 60 * 1000);

      const evalSemana = evaluaciones.filter((e) => {
        const fecha = new Date(e.fecha);
        return fecha >= inicio && fecha <= fin;
      });

      const efectividadSemana =
        evalSemana.length > 0
          ? evalSemana.reduce((sum, e) => sum + e.efectividad, 0) / evalSemana.length
          : 0;

      datos.push({
        semana: format(inicio, 'MMM dd', { locale: es }),
        efectividad: Math.round(efectividadSemana * 10) / 10,
      });
    }

    return datos;
  }, [evaluaciones]);

  const stats = [
    {
      title: 'Evaluaciones del Mes',
      value: metrics.evalEseMes.toString(),
      description: `Total de evaluaciones en ${format(new Date(), 'MMMM', { locale: es })}`,
      icon: ClipboardCheck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Borradores Pendientes',
      value: metrics.borradores.toString(),
      description: 'Evaluaciones sin finalizar',
      icon: FileEdit,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Efectividad del Equipo',
      value: `${metrics.efectividadPromedio.toFixed(1)}%`,
      description: `${metrics.tendencia > 0 ? '+' : ''}${metrics.tendencia.toFixed(1)}% vs mes anterior`,
      icon: TrendingUp,
      color: metrics.tendencia >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: metrics.tendencia >= 0 ? 'bg-green-50' : 'bg-red-50',
    },
    {
      title: 'Requieren Atención',
      value: metrics.empleadosSinEvaluar.toString(),
      description: 'Sin evaluación en 30 días',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Centro de Comando
        </h1>
        <p className="text-muted-foreground">
          Resumen de tu equipo y evaluaciones
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Gráfica de Tendencia */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Efectividad</CardTitle>
            <CardDescription>Últimas 8 semanas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="semana" stroke="#6b7280" />
                <YAxis domain={[0, 100]} stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                  }}
                  formatter={(value: any) => `${value}%`}
                />
                <Line
                  type="monotone"
                  dataKey="efectividad"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Evaluaciones Recientes */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Evaluaciones Recientes</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/evaluaciones')}
                className="gap-2"
              >
                Ver todas
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>Últimas 5 evaluaciones finalizadas</CardDescription>
          </CardHeader>
          <CardContent>
            {evaluaciones.filter((e) => e.status === 'finalizada').length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Sin evaluaciones aún
              </p>
            ) : (
              <div className="space-y-4">
                {evaluaciones
                  .filter((e) => e.status === 'finalizada')
                  .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                  .slice(0, 5)
                  .map((evaluation) => (
                    <div
                      key={evaluation.id}
                      className="flex items-center gap-3 pb-3 border-b last:border-0 last:pb-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1 rounded transition-colors"
                      onClick={() => router.push(`/dashboard/evaluaciones/${evaluation.id}`)}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>
                          {evaluation.empleadoNombre
                            .split(' ')
                            .map((n: string) => n[0])
                            .join('')
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{evaluation.empleadoNombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(evaluation.fecha), {
                            locale: es,
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={
                            evaluation.efectividad >= 80
                              ? 'bg-green-100 text-green-800'
                              : evaluation.efectividad >= 60
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {evaluation.efectividad.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Borradores Pendientes */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Borradores Pendientes</CardTitle>
              {metrics.borradores > 0 && (
                <Badge variant="destructive">{metrics.borradores}</Badge>
              )}
            </div>
            <CardDescription>Evaluaciones sin finalizar</CardDescription>
          </CardHeader>
          <CardContent>
            {evaluaciones.filter((e) => e.status === 'borrador').length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Sin borradores pendientes
              </p>
            ) : (
              <div className="space-y-4">
                {evaluaciones
                  .filter((e) => e.status === 'borrador')
                  .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                  .slice(0, 5)
                  .map((evaluation) => (
                    <div
                      key={evaluation.id}
                      className="flex items-center gap-3 pb-3 border-b last:border-0 last:pb-0"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>
                          {evaluation.empleadoNombre
                            .split(' ')
                            .map((n: string) => n[0])
                            .join('')
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{evaluation.empleadoNombre}</p>
                        <p className="text-xs text-muted-foreground">
                          Iniciado{' '}
                          {formatDistanceToNow(new Date(evaluation.fecha), {
                            locale: es,
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(`/dashboard/evaluaciones/${evaluation.id}/editar`)
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Acciones Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
          <CardDescription>Tareas comunes para gestionar tu equipo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <button
              onClick={() => router.push('/dashboard/evaluaciones/nueva')}
              className="p-4 text-left border rounded-lg hover:bg-accent transition-colors"
            >
              <h3 className="font-semibold mb-1">Nueva Evaluación</h3>
              <p className="text-sm text-muted-foreground">
                Crear una evaluación para un empleado
              </p>
            </button>
            <button
              onClick={() => router.push('/dashboard/empleados')}
              className="p-4 text-left border rounded-lg hover:bg-accent transition-colors"
            >
              <h3 className="font-semibold mb-1">Agregar Empleado</h3>
              <p className="text-sm text-muted-foreground">
                Registrar un nuevo miembro del equipo
              </p>
            </button>
            <button
              onClick={() => router.push('/dashboard/reportes')}
              className="p-4 text-left border rounded-lg hover:bg-accent transition-colors"
            >
              <h3 className="font-semibold mb-1">Ver Reportes</h3>
              <p className="text-sm text-muted-foreground">
                Consultar reportes y estadísticas
              </p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
