'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, AlertCircle } from 'lucide-react';
import { useReportes } from '@/hooks/useReportes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ReporteData } from '@/types/reporte';

export const dynamic = 'force-dynamic';

const LoadingSkeleton = () => (
  <div className="space-y-4">
    <div className="h-20 bg-gray-200 rounded animate-pulse" />
    <div className="grid grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
      ))}
    </div>
    <div className="h-64 bg-gray-200 rounded animate-pulse" />
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-12">
    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
    <h3 className="text-lg font-semibold mb-2">No hay ejecutivos registrados</h3>
    <p className="text-muted-foreground">
      Agrega ejecutivos al sistema para generar reportes
    </p>
  </div>
);

export default function ReporteEjecutivosPage() {
  const { getReporteEjecutivos } = useReportes();
  const [reporte, setReporte] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarReporte = async () => {
      try {
        setLoading(true);
        setError(null);
        const datos = await getReporteEjecutivos();
        setReporte(datos);
      } catch (err) {
        console.error('Error cargando reporte:', err);
        setError('No se pudo cargar el reporte de ejecutivos');
      } finally {
        setLoading(false);
      }
    };

    cargarReporte();
  }, [getReporteEjecutivos]);

  const generarDistribucion = () => {
    if (!reporte) return [];

    const rangos = [
      { rango: '0-50%', min: 0, max: 50, color: '#ef4444' },
      { rango: '50-70%', min: 50, max: 70, color: '#eab308' },
      { rango: '70-85%', min: 70, max: 85, color: '#3b82f6' },
      { rango: '85-100%', min: 85, max: 100, color: '#22c55e' },
    ];

    return rangos.map((rango) => {
      const cantidad = reporte.empleados.filter((e) => {
        const efectividad = e.efectividadUltima || 0;
        return efectividad >= rango.min && efectividad <= rango.max;
      }).length;

      return {
        rango: rango.rango,
        cantidad,
        fill: rango.color,
      };
    });
  };

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!reporte || reporte.total === 0) {
    return <EmptyState />;
  }

  const empleadosOrdenados = [...reporte.empleados].sort(
    (a, b) => (b.efectividadUltima || 0) - (a.efectividadUltima || 0)
  );

  const distribucion = generarDistribucion();

  const obtenerEstadoBadge = (efectividad?: number) => {
    if (!efectividad) return { label: 'Sin evaluar', variant: 'secondary' as const };
    if (efectividad >= 85) return { label: 'Excelente', variant: 'default' as const };
    if (efectividad >= 70) return { label: 'Bueno', variant: 'default' as const };
    if (efectividad >= 50) return { label: 'Promedio', variant: 'secondary' as const };
    return { label: 'Necesita atención', variant: 'destructive' as const };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reporte de Ejecutivos</h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Efectividad Promedio */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Efectividad Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">
                  {Math.round(reporte.promedioEfectividad * 10) / 10}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {reporte.evaluados > 0
                    ? 'Basado en evaluaciones realizadas'
                    : 'Sin evaluaciones realizadas'}
                </p>
              </div>
              <div className="flex items-center justify-center h-20 w-20">
                <div
                  className="relative flex items-center justify-center w-16 h-16 rounded-full border-4"
                  style={{
                    borderColor:
                      reporte.promedioEfectividad >= 85
                        ? '#22c55e'
                        : reporte.promedioEfectividad >= 70
                          ? '#3b82f6'
                          : reporte.promedioEfectividad >= 50
                            ? '#eab308'
                            : '#ef4444',
                  }}
                >
                  <span className="text-lg font-bold">
                    {Math.round(reporte.promedioEfectividad)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Evaluados */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cobertura de Evaluaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {reporte.evaluados}/{reporte.total}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((reporte.evaluados / reporte.total) * 100)}% de ejecutivos evaluados
            </p>
            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${(reporte.evaluados / reporte.total) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Última Actualización */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Última Actualización</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-mono">
              {new Date().toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Hace menos de un minuto
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Áreas de Oportunidad Comunes */}
      <Card>
        <CardHeader>
          <CardTitle>Áreas de Oportunidad Comunes</CardTitle>
          <CardDescription>Las 5 áreas más frecuentes identificadas</CardDescription>
        </CardHeader>
        <CardContent>
          {reporte.areasComunes.length === 0 ? (
            <p className="text-muted-foreground">No hay áreas de oportunidad identificadas</p>
          ) : (
            <div className="space-y-4">
              {reporte.areasComunes.map((area, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">{area.area}</p>
                    <Badge variant="secondary">{area.frecuencia}</Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full"
                      style={{
                        width: `${(area.frecuencia / Math.max(...reporte.areasComunes.map((a) => a.frecuencia))) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Distribución de Efectividad */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución de Efectividad</CardTitle>
          <CardDescription>Cantidad de ejecutivos por rango de efectividad</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={distribucion}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="rango" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="cantidad" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabla de Ejecutivos */}
      <Card>
        <CardHeader>
          <CardTitle>Ejecutivos</CardTitle>
          <CardDescription>{reporte.total} ejecutivos en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Última Evaluación</TableHead>
                  <TableHead className="text-right">Efectividad</TableHead>
                  <TableHead className="text-right">Promedio General</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empleadosOrdenados.map((empleado) => {
                  const estado = obtenerEstadoBadge(empleado.efectividadUltima);
                  const fechaEval = empleado.ultimaEvaluacion
                    ? format(empleado.ultimaEvaluacion.fecha.toDate(), 'dd/MM/yyyy', { locale: es })
                    : 'Sin evaluar';

                  return (
                    <TableRow
                      key={empleado.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        // Aquí irá el navegador al detalle
                      }}
                    >
                      <TableCell className="font-medium">{empleado.nombre}</TableCell>
                      <TableCell>{empleado.cargo || 'N/A'}</TableCell>
                      <TableCell className="text-sm">{fechaEval}</TableCell>
                      <TableCell className="text-right">
                        {empleado.efectividadUltima !== undefined
                          ? `${Math.round(empleado.efectividadUltima * 10) / 10}%`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {empleado.ultimaEvaluacion?.promedioGeneral !== undefined
                          ? `${Math.round(empleado.ultimaEvaluacion.promedioGeneral * 10) / 10}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={estado.variant}>{estado.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
