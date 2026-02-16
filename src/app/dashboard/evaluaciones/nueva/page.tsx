'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { useEmpleados } from '@/hooks/useEmpleados';
import { useEvaluaciones } from '@/hooks/useEvaluaciones';
import { useToast } from '@/hooks/use-toast';
import { EvaluacionForm } from '@/components/evaluaciones/EvaluacionForm';
import { EmpleadoSelector } from '@/components/evaluaciones/EmpleadoSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import type { EvaluacionFormData } from '@/types/evaluacion';
import type { Empleado } from '@/types/empleado';

export default function NuevaEvaluacionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const empleadoId = searchParams.get('empleadoId');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);

  const { empleados, loading: empleadosLoading } = useEmpleados();
  const { createEvaluacion, saveDraft } = useEvaluaciones();

  // Obtener empleado seleccionado
  const empleadoSeleccionado = useMemo(() => {
    if (!empleadoId) return null;
    return empleados.find((emp) => emp.id === empleadoId);
  }, [empleados, empleadoId]);

  const handleSelectEmpleado = (empleado: Empleado) => {
    router.push(`/dashboard/evaluaciones/nueva?empleadoId=${empleado.id}`);
  };

  const handleSave = async (data: EvaluacionFormData) => {
    if (!empleadoSeleccionado) return;

    try {
      setIsSubmitting(true);
      await createEvaluacion(
        empleadoSeleccionado.id,
        empleadoSeleccionado.nombre,
        data
      );

      toast({
        title: 'Evaluación creada',
        description: `Evaluación de ${empleadoSeleccionado.nombre} registrada correctamente`,
      });

      router.push('/dashboard/evaluaciones');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la evaluación',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async (data: Partial<EvaluacionFormData>) => {
    if (!empleadoSeleccionado) return;

    try {
      setIsDrafting(true);
      await saveDraft(
        empleadoSeleccionado.id,
        empleadoSeleccionado.nombre,
        data
      );

      toast({
        title: 'Borrador guardado',
        description: 'Tu progreso se ha guardado automáticamente',
      });
    } catch (error) {
      console.error('Error guardando borrador:', error);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/evaluaciones');
  };

  // Estado: Cargando empleados
  if (empleadosLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Estado: Sin empleadoId - Mostrar selector
  if (!empleadoId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Nueva Evaluación</h1>
          <p className="text-muted-foreground mt-1">
            Selecciona un empleado para crear una nueva evaluación
          </p>
        </div>

        <EmpleadoSelector
          onSelect={handleSelectEmpleado}
          empleadosConEvaluacionReciente={[]}
        />
      </div>
    );
  }

  // Estado: Cargando empleado seleccionado
  if (!empleadoSeleccionado) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Estado: Mostrar formulario
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={() => router.push('/dashboard/evaluaciones')}
          className="hover:text-foreground transition-colors"
        >
          Evaluaciones
        </button>
        <ChevronRight className="h-4 w-4" />
        <span>Nueva</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{empleadoSeleccionado.nombre}</span>
      </div>

      {/* Header con info del empleado */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-lg">
                {empleadoSeleccionado.nombre
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle>{empleadoSeleccionado.nombre}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {empleadoSeleccionado.cargo}
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard/evaluaciones/nueva')}
            >
              Cambiar Empleado
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Formulario */}
      <EvaluacionForm
        empleado={empleadoSeleccionado}
        onSave={handleSave}
        onSaveDraft={handleSaveDraft}
        onCancel={handleCancel}
      />
    </div>
  );
}
