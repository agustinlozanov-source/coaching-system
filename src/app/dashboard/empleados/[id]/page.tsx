'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Edit2, Loader2 } from 'lucide-react';
import { getEmpleadoById } from '@/hooks/useEmpleados';
import { Empleado } from '@/types/empleado';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmpleadoDialog } from '@/components/empleados/EmpleadoDialog';
import {
  calcularDiasAntiguedad,
  calcularSemanasAntiguedad,
} from '@/lib/utils/calculations';

interface PageProps {
  params: {
    id: string;
  };
}

export default function EmpleadoDetailPage({ params }: PageProps) {
  const router = useRouter();
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    const loadEmpleado = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getEmpleadoById(params.id);
        if (!data) {
          setError('Empleado no encontrado');
        } else {
          setEmpleado(data);
        }
      } catch (err) {
        console.error('Error al cargar empleado:', err);
        setError('Error al cargar el empleado');
      } finally {
        setLoading(false);
      }
    };

    loadEmpleado();
  }, [params.id]);

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
            <div className="space-y-3">
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
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Las métricas se actualizarán cuando haya evaluaciones disponibles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Evaluaciones Recientes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evaluaciones Recientes</CardTitle>
          <CardDescription>
            Historial de evaluaciones de desempeño
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Sin evaluaciones aún</p>
            <p className="text-sm mt-2">
              Las evaluaciones aparecerán aquí cuando se creen
            </p>
          </div>
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
    </div>
  );
}
