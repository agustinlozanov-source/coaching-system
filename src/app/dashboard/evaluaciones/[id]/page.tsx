'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowLeft,
  Download,
  Edit,
  Loader2,
  Star,
  AlertCircle,
  Lightbulb,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { useEvaluaciones } from '@/hooks/useEvaluaciones';
import { useEmpleados } from '@/hooks/useEmpleados';
import { ESCALA_EVALUACION } from '@/lib/constants/competencias';
import type { Evaluacion } from '@/types/evaluacion';
import type { Empleado } from '@/types/empleado';

const ESCALA_COLORES: Record<number, string> = {
  1: 'bg-green-100 text-green-800',
  2: 'bg-blue-100 text-blue-800',
  3: 'bg-yellow-100 text-yellow-800',
  4: 'bg-red-100 text-red-800',
  5: 'bg-gray-100 text-gray-800',
};

export default function EvaluacionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { getEvaluacionById } = useEvaluaciones();
  const { getEmpleadoById } = useEmpleados();

  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null);
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar evaluación y empleado
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        const evalData = await getEvaluacionById(id);

        if (!evalData) {
          setError('Evaluación no encontrada');
          return;
        }

        setEvaluacion(evalData);

        const empData = await getEmpleadoById(evalData.empleadoId);
        setEmpleado(empData);
      } catch (err) {
        setError('Error cargando la evaluación');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [id, getEvaluacionById, getEmpleadoById]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !evaluacion || !empleado) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <p>{error || 'Evaluación no encontrada'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getEstadoBadge = (estado: string) => {
    if (estado === 'finalizada') {
      return <Badge className="bg-green-100 text-green-800">Finalizada</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800">Borrador</Badge>;
  };

  const getEfectividadColor = (efectividad: number) => {
    if (efectividad >= 80) return 'bg-green-50 text-green-700';
    if (efectividad >= 60) return 'bg-yellow-50 text-yellow-700';
    return 'bg-red-50 text-red-700';
  };

  return (
    <div className="space-y-6">
      {/* Botón volver */}
      <Button variant="outline" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver
      </Button>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4 flex-1">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="text-lg">
                  {empleado.nombre
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{empleado.nombre}</CardTitle>
                <p className="text-sm text-muted-foreground">{empleado.cargo}</p>
              </div>
            </div>
            <div className="text-right space-y-2">
              {getEstadoBadge(evaluacion.status)}
              <p className="text-sm text-muted-foreground">
                {format(new Date(evaluacion.fecha), 'dd MMM yyyy', { locale: es })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Coach</p>
              <p className="font-medium">{evaluacion.coachNombre || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Promedio General</p>
              <p className="text-2xl font-bold">
                {evaluacion.promedioGeneral.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Efectividad</p>
              <p className="text-2xl font-bold">
                {evaluacion.efectividad.toFixed(1)}%
              </p>
            </div>
            {evaluacion.proximaRevision && (
              <div>
                <p className="text-xs text-muted-foreground">Próxima Revisión</p>
                <p className="font-medium">
                  {format(new Date(evaluacion.proximaRevision), 'dd MMM yyyy', {
                    locale: es,
                  })}
                </p>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Secciones con Radar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {evaluacion.secciones.map((seccion: any) => {
          // Preparar datos para el radar
          const radarData = seccion.items.map((item: any) => ({
            competencia: item.competencia,
            puntuacion: item.puntuacion,
          }));

          return (
            <Card key={seccion.titulo}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{seccion.titulo}</CardTitle>
                  {seccion.promedio > 0 && (
                    <Badge variant="outline">
                      Promedio: {seccion.promedio.toFixed(2)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Radar Chart */}
                {radarData.length > 0 && (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis
                          dataKey="competencia"
                          tick={{ fontSize: 12 }}
                        />
                        <PolarRadiusAxis angle={90} domain={[0, 5]} />
                        <Radar
                          name="Puntuación"
                          dataKey="puntuacion"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.6}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Competencias */}
                <div className="space-y-3">
                  {seccion.items.map((item: any, idx: number) => (
                    <div key={idx} className="border-t pt-3 first:border-t-0">
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-medium text-sm">{item.competencia}</p>
                        <Badge
                          className={ESCALA_COLORES[item.puntuacion] || ''}
                        >
                          {item.puntuacion}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {ESCALA_EVALUACION[item.puntuacion] || 'No aplica'}
                      </p>
                      {item.observaciones && (
                        <p className="text-xs mt-2 p-2 bg-gray-50 rounded">
                          {item.observaciones}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Resumen General */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Promedio y Efectividad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg ${getEfectividadColor(evaluacion.efectividad)}`}>
              <p className="text-sm font-medium mb-2">Promedio General</p>
              <p className="text-4xl font-bold">
                {evaluacion.promedioGeneral.toFixed(2)}
              </p>
              <p className="text-xs mt-2 opacity-75">
                Escala 1-5 (1: Evidente, 5: No Aplica)
              </p>
            </div>

            <div className={`p-4 rounded-lg ${getEfectividadColor(evaluacion.efectividad)}`}>
              <p className="text-sm font-medium mb-2">Efectividad Estimada</p>
              <p className="text-4xl font-bold">
                {evaluacion.efectividad.toFixed(1)}%
              </p>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    evaluacion.efectividad >= 80
                      ? 'bg-green-600'
                      : evaluacion.efectividad >= 60
                      ? 'bg-yellow-600'
                      : 'bg-red-600'
                  }`}
                  style={{ width: `${Math.min(evaluacion.efectividad, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Fortalezas y Áreas de Oportunidad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fortalezas */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <h3 className="font-semibold">Fortalezas</h3>
              </div>
              {evaluacion.fortalezas && evaluacion.fortalezas.length > 0 ? (
                <ul className="space-y-2">
                  {evaluacion.fortalezas.map((fortaleza: string, idx: number) => (
                    <li
                      key={idx}
                      className="flex gap-2 text-sm p-2 bg-green-50 rounded"
                    >
                      <span className="text-green-600 font-bold">•</span>
                      <span>{fortaleza}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Sin registros</p>
              )}
            </div>

            {/* Áreas de Oportunidad */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold">Áreas de Oportunidad</h3>
              </div>
              {evaluacion.areasOportunidad &&
              evaluacion.areasOportunidad.length > 0 ? (
                <ul className="space-y-2">
                  {evaluacion.areasOportunidad.map(
                    (area: string, idx: number) => (
                      <li
                        key={idx}
                        className="flex gap-2 text-sm p-2 bg-blue-50 rounded"
                      >
                        <span className="text-blue-600 font-bold">•</span>
                        <span>{area}</span>
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Sin registros</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observaciones y Compromisos */}
      <Card>
        <CardHeader>
          <CardTitle>Observaciones y Compromisos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Observaciones generales */}
          <div>
            <h3 className="font-semibold mb-2">Observaciones del Coach</h3>
            {evaluacion.observacionesGenerales ? (
              <p className="text-sm p-3 bg-gray-50 rounded whitespace-pre-wrap">
                {evaluacion.observacionesGenerales}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Sin observaciones</p>
            )}
          </div>

          {/* Compromisos */}
          {evaluacion.compromisos && evaluacion.compromisos.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Compromisos de Mejora</h3>
              <ul className="space-y-2">
                {evaluacion.compromisos.map((compromiso: string, idx: number) => (
                  <li key={idx} className="flex gap-3 text-sm">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span>{compromiso}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Próxima revisión */}
          {evaluacion.proximaRevision && (
            <div className="p-3 bg-blue-50 rounded flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm">
                <strong>Próxima revisión:</strong>{' '}
                {format(new Date(evaluacion.proximaRevision), 'dd MMM yyyy', {
                  locale: es,
                })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botones de acción */}
      <Card>
        <CardContent className="pt-6 flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>

          {evaluacion.status === 'borrador' && (
            <Button
              onClick={() =>
                router.push(`/dashboard/evaluaciones/${id}/editar`)
              }
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar Borrador
            </Button>
          )}

          <Button variant="outline" disabled>
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
