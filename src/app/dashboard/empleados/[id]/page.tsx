'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Edit2, Loader2, TrendingUp, AlertCircle } from 'lucide-react';
import { getEmpleadoById } from '@/hooks/useEmpleados';
import { useEvaluaciones } from '@/hooks/useEvaluaciones';
import { Empleado } from '@/types/empleado';
import { Evaluacion } from '@/types/evaluacion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmpleadoDialog } from '@/components/empleados/EmpleadoDialog';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  calcularDiasAntiguedad,
  calcularSemanasAntiguedad,
  calcularAvanceCurva,
} from '@/lib/utils/calculations';

interface PageProps {
  params: {
    id: string;
  };
}

export default function EmpleadoDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { getEvaluacionesByEmpleado } = useEvaluaciones();
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    const loadDatos = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getEmpleadoById(params.id);
        if (!data) {
          setError('Empleado no encontrado');
        } else {
          setEmpleado(data);
          // Cargar evaluaciones del empleado
          const evals = await getEvaluacionesByEmpleado(params.id);
          setEvaluaciones(evals);
        }
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('Error al cargar la información');
      } finally {
        setLoading(false);
      }
    };

    loadDatos();
  }, [params.id, getEvaluacionesByEmpleado]);

  const getInitials = (nombre: string) => {
    return nombre
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Cargando información del empleado...</p>
      </div>
    );
  }

  if (error || !empleado) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/empleados')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a empleados
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-semibold text-muted-foreground mb-4">
              {error || 'Empleado no encontrado'}
            </p>
            <Button onClick={() => router.push('/dashboard/empleados')}>
              Volver a la lista
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const diasAntiguedad = calcularDiasAntiguedad(empleado.fechaIngreso);
  const semanasAntiguedad = calcularSemanasAntiguedad(empleado.fechaIngreso);
  const fechaIngresoFormato = format(empleado.fechaIngreso.toDate(), 'dd MMMM yyyy', {
    locale: es,
  });

  return (
    <div className="space-y-6">
      {/* Header con botones */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/empleados')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <Button onClick={() => setShowDialog(true)}>
          <Edit2 className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>

      {/* Card de información del empleado */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-lg font-semibold">
                {getInitials(empleado.nombre)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold font-jakarta">
                  {empleado.nombre}
                </h1>
                <Badge variant={empleado.activo ? 'success' : 'muted'}>
                  {empleado.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground mb-4">{empleado.cargo}</p>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Consecutivo:</span>
                  <p className="font-semibold">#{empleado.consecutivo}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo Puesto:</span>
                  <p className="font-semibold capitalize">{empleado.tipoPuesto}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información Personal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información Personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {empleado.email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
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
              <p className="text-sm text-muted-foreground">Fecha de Ingreso</p>
              <p className="font-medium">{fechaIngresoFormato}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Antigüedad (días)</p>
                <p className="text-2xl font-bold">{diasAntiguedad}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Antigüedad (semanas)</p>
                <p className="text-2xl font-bold">{semanasAntiguedad}</p>
              </div>
            </div>
            {empleado.coachAsignado && (
              <div>
                <p className="text-sm text-muted-foreground">Coach Asignado</p>
                <p className="font-medium">{empleado.coachAsignado}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Métricas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Métricas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {evaluaciones.length > 0 ? (
              <>
                {/* Efectividad Actual */}
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Efectividad (Última)</p>
                    <span className="text-sm font-semibold">
                      {evaluaciones[0].efectividad.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        evaluaciones[0].efectividad >= 80
                          ? 'bg-green-500'
                          : evaluaciones[0].efectividad >= 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(evaluaciones[0].efectividad, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Avance en Curva */}
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Avance en Curva</p>
                    <span className="text-sm font-semibold">
                      {calcularAvanceCurva(evaluaciones[0].promedioGeneral).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${Math.min(calcularAvanceCurva(evaluaciones[0].promedioGeneral), 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Áreas de Oportunidad */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Áreas de Oportunidad</p>
                  {evaluaciones[0].areasOportunidad &&
                  evaluaciones[0].areasOportunidad.length > 0 ? (
                    <ul className="space-y-1">
                      {evaluaciones[0].areasOportunidad.slice(0, 3).map((area: string, idx: number) => (
                        <li key={idx} className="text-xs flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          <span>{area}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sin áreas de oportunidad</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Efectividad</p>
                    <span className="text-sm font-semibold">--</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full"></div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Avance Curva</p>
                    <span className="text-sm font-semibold">--</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full"></div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Áreas de Oportunidad</p>
                    <span className="text-sm font-semibold">--</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full"></div>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Las métricas se actualizarán cuando haya evaluaciones disponibles
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Evolución */}
      {evaluaciones.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Evolución de Efectividad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={evaluaciones.reverse().map((eval) => ({
                  fecha: format(new Date(eval.fecha), 'dd/MM', { locale: es }),
                  efectividad: eval.efectividad,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="fecha" stroke="#6b7280" />
                <YAxis domain={[0, 100]} stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                  }}
                  formatter={(value: any) => `${value.toFixed(1)}%`}
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evaluaciones Recientes</CardTitle>
          <CardDescription>
            Historial de evaluaciones de desempeño
          </CardDescription>
        </CardHeader>
        <CardContent>
          {evaluaciones.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
              <p className="text-muted-foreground">Sin evaluaciones aún</p>
              <Button
                onClick={() =>
                  router.push(`/dashboard/evaluaciones/nueva?empleadoId=${params.id}`)
                }
                size="sm"
              >
                Crear Primera Evaluación
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {evaluaciones.slice(0, 5).map((eval) => (
                <div
                  key={eval.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {format(new Date(eval.fecha), 'dd MMM yyyy', { locale: es })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Promedio: {eval.promedioGeneral.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      className={
                        eval.efectividad >= 80
                          ? 'bg-green-100 text-green-800'
                          : eval.efectividad >= 60
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {eval.efectividad.toFixed(1)}%
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/dashboard/evaluaciones/${eval.id}`)}
                    >
                      Ver
                    </Button>
                  </div>
                </div>
              ))}
              {evaluaciones.length > 5 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/dashboard/evaluaciones')}
                >
                  Ver todas ({evaluaciones.length})
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para editar */}
      <EmpleadoDialog
        open={showDialog}
        empleado={empleado}
        onClose={() => setShowDialog(false)}
        onSuccess={() => {
          setShowDialog(false);
          // Los datos se recargarán automáticamente si es necesario
        }}
      />

      {/* Botón flotante Evaluar Ahora */}
      <div className="fixed bottom-6 right-6">
        <Button
          size="lg"
          onClick={() =>
            router.push(`/dashboard/evaluaciones/nueva?empleadoId=${params.id}`)
          }
          className="rounded-full shadow-lg"
        >
          <TrendingUp className="h-5 w-5 mr-2" />
          Evaluar Ahora
        </Button>
      </div>
    </div>
  );
}
