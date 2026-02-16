'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { differenceInDays } from 'date-fns';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle, ArrowLeft, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EvaluacionForm } from '@/components/evaluaciones/EvaluacionForm';
import { useEvaluaciones } from '@/hooks/useEvaluaciones';
import { useEmpleados } from '@/hooks/useEmpleados';
import { useToast } from '@/hooks/use-toast';
import type { Evaluacion, EvaluacionFormData } from '@/types/evaluacion';
import type { Empleado } from '@/types/empleado';

export default function EditarBorradorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { toast } = useToast();

  const { getEvaluacionById, updateEvaluacion } = useEvaluaciones();
  const { getEmpleadoById } = useEmpleados();

  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null);
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOldDraft, setIsOldDraft] = useState(false);

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

        // Validar que sea borrador
        if (evalData.status !== 'borrador') {
          setError('Esta evaluación ya fue finalizada y no puede ser editada');
          return;
        }

        // Verificar antigüedad del borrador
        const diasAntiguedad = differenceInDays(new Date(), new Date(evalData.fecha));
        if (diasAntiguedad > 7) {
          setIsOldDraft(true);
        }

        setEvaluacion(evalData);

        // Cargar empleado
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

  const handleSave = async (data: EvaluacionFormData) => {
    if (!evaluacion) return;

    try {
      await updateEvaluacion(id, {
        ...data,
        status: 'finalizada',
      });

      toast({
        title: 'Evaluación finalizada',
        description: 'La evaluación se ha guardado correctamente',
      });

      router.push(`/dashboard/evaluaciones/${id}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo finalizar la evaluación',
        variant: 'destructive',
      });
    }
  };

  const handleSaveDraft = async (data: Partial<EvaluacionFormData>) => {
    if (!evaluacion) return;

    try {
      await updateEvaluacion(id, {
        ...data,
        status: 'borrador',
      });

      toast({
        title: 'Borrador actualizado',
        description: 'Los cambios se han guardado correctamente',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el borrador',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/evaluaciones');
  };

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
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <p className="font-semibold text-red-600 mb-2">
                  {error || 'Evaluación no encontrada'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {!evaluacion && 'La evaluación que intentas editar no existe.'}
                  {evaluacion?.status === 'finalizada' &&
                    'Las evaluaciones finalizadas no pueden ser editadas. Puedes verla en detalle.'}
                </p>
                {evaluacion?.status === 'finalizada' && (
                  <Button
                    onClick={() =>
                      router.push(`/dashboard/evaluaciones/${id}`)
                    }
                  >
                    Ver Detalle
                  </Button>
                )}
                {!evaluacion && (
                  <Button onClick={() => router.push('/dashboard/evaluaciones')}>
                    Volver a Evaluaciones
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botón volver */}
      <Button variant="outline" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver
      </Button>

      {/* Alerta de borrador antiguo */}
      {isOldDraft && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Este borrador tiene más de 7 días sin actualizarse. Considera finalizarlo
            o crear una nueva evaluación.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="space-y-2">
            <CardTitle>Editar Evaluación - Borrador</CardTitle>
            <p className="text-sm text-muted-foreground">
              Empleado: <strong>{empleado.nombre}</strong> • Creado:{' '}
              <strong>
                {format(new Date(evaluacion.fecha), 'dd MMM yyyy', { locale: es })}
              </strong>
            </p>
          </div>
        </CardHeader>
      </Card>

      {/* Formulario */}
      <EvaluacionForm
        empleado={empleado}
        evaluacion={evaluacion}
        onSave={handleSave}
        onSaveDraft={handleSaveDraft}
        onCancel={handleCancel}
      />
    </div>
  );
}
