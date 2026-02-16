'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, BarChart3, FileText, TrendingUp, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EvaluacionesTable } from '@/components/evaluaciones/EvaluacionesTable';
import { useEvaluaciones } from '@/hooks/useEvaluaciones';
import type { Evaluacion } from '@/types/evaluacion';

export const dynamic = 'force-dynamic';

export default function EvaluacionesPage() {
  const router = useRouter();
  const { getEvaluaciones } = useEvaluaciones();
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar evaluaciones
  useEffect(() => {
    const cargarEvaluaciones = async () => {
      try {
        setLoading(true);
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

  // Calcular stats
  const stats = useMemo(() => {
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const annoActual = ahora.getFullYear();

    const evaluacionesEseMes = evaluaciones.filter((e) => {
      const fecha = e.fecha.toDate();
      return fecha.getMonth() === mesActual && fecha.getFullYear() === annoActual;
    });

    const borradores = evaluaciones.filter((e) => e.status === 'borrador');

    const efectividadPromedio =
      evaluacionesEseMes.length > 0
        ? evaluacionesEseMes.reduce((sum, e) => sum + e.efectividad, 0) /
          evaluacionesEseMes.length
        : 0;

    return {
      total: evaluaciones.length,
      borradores: borradores.length,
      efectividadPromedio,
      esteM: evaluacionesEseMes.length,
    };
  }, [evaluaciones]);

  const handleView = (id: string) => {
    router.push(`/dashboard/evaluaciones/${id}`);
  };

  const handleEdit = (id: string) => {
    router.push(`/dashboard/evaluaciones/${id}/editar`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Evaluaciones</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona y visualiza las evaluaciones de desempeño
          </p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/evaluaciones/nueva')}
          size="lg"
        >
          Nueva Evaluación
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total evaluaciones */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Evaluaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.borradores > 0
                ? `${stats.borradores} pendientes`
                : 'Todo al día'}
            </p>
          </CardContent>
        </Card>

        {/* Borradores */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Borradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {stats.borradores}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pendientes de finalizar
            </p>
          </CardContent>
        </Card>

        {/* Efectividad promedio */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Efectividad Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.efectividadPromedio.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Este mes</p>
          </CardContent>
        </Card>

        {/* Evaluaciones este mes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Este Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.esteM}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Evaluaciones registradas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <EvaluacionesTable
        evaluaciones={evaluaciones}
        onView={handleView}
        onEdit={handleEdit}
      />
    </div>
  );
}
