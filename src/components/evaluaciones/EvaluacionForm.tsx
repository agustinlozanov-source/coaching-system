'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, ChevronRight, CheckCircle2, Cloud, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';
import { SeccionEvaluacion } from './SeccionEvaluacion';
import type { Empleado } from '@/types/empleado';
import type { Evaluacion, EvaluacionFormData } from '@/types/evaluacion';
import {
  COMPETENCIAS_PLANEACION,
  COMPETENCIAS_NO_NEGOCIABLES,
  COMPETENCIAS_USO_SISTEMAS,
  COMPETENCIAS_CONOCIMIENTO_PRODUCTO,
} from '@/lib/constants/competencias';
import {
  calcularPromedioSeccion,
  calcularEfectividad,
} from '@/lib/utils/calculations';

interface SeccionData {
  titulo: string;
  competencias: string[];
  values: Record<string, number>;
}

interface EvaluacionFormProps {
  empleado: Empleado;
  evaluacion?: Evaluacion | null;
  onSave: (data: EvaluacionFormData) => Promise<void>;
  onSaveDraft: (data: Partial<EvaluacionFormData>) => Promise<void>;
  onCancel: () => void;
}

const SECCIONES_CONFIG = [
  {
    titulo: 'Planeación y Organización',
    competencias: COMPETENCIAS_PLANEACION,
  },
  {
    titulo: 'No Negociables',
    competencias: COMPETENCIAS_NO_NEGOCIABLES,
  },
  {
    titulo: 'Uso de Sistemas',
    competencias: COMPETENCIAS_USO_SISTEMAS,
  },
  {
    titulo: 'Conocimiento del Producto',
    competencias: COMPETENCIAS_CONOCIMIENTO_PRODUCTO,
  },
];

export function EvaluacionForm({
  empleado,
  evaluacion,
  onSave,
  onSaveDraft,
  onCancel,
}: EvaluacionFormProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Estado de secciones
  const [secciones, setSecciones] = useState<Record<string, Record<string, number>>>(
    () => {
      const inicial: Record<string, Record<string, number>> = {};
      SECCIONES_CONFIG.forEach((seccion) => {
        inicial[seccion.titulo] = {};
        seccion.competencias.forEach((comp) => {
          inicial[seccion.titulo][comp] = 0;
        });
      });

      // Cargar datos de evaluación existente
      if (evaluacion?.secciones) {
        Object.values(evaluacion.secciones).forEach((sec: any) => {
          inicial[sec.titulo] = sec.items.reduce(
            (acc: Record<string, number>, item: any) => {
              acc[item.competencia] = item.puntuacion || 0;
              return acc;
            },
            {}
          );
        });
      }

      return inicial;
    }
  );

  const [observacionesGenerales, setObservacionesGenerales] = useState(
    evaluacion?.observacionesGenerales || ''
  );
  const [compromisos, setCompromisos] = useState<string[]>(
    evaluacion?.compromisos || []
  );
  const [proximaRevision, setProximaRevision] = useState<string>(
    evaluacion?.proximaRevision
      ? format(
          typeof evaluacion.proximaRevision === 'string'
            ? new Date(evaluacion.proximaRevision)
            : evaluacion.proximaRevision.toDate?.()
            ? evaluacion.proximaRevision.toDate()
            : new Date(evaluacion.proximaRevision as any),
          'yyyy-MM-dd'
        )
      : ''
  );
  const [nuevoCompromiso, setNuevoCompromiso] = useState('');

  // Validar si una sección está completa
  const isSectionComplete = useCallback((titulo: string) => {
    const values = secciones[titulo];
    const config = SECCIONES_CONFIG.find((s) => s.titulo === titulo);
    if (!config) return false;
    return config.competencias.every((c) => values[c] && values[c] !== 0);
  }, [secciones]);

  // Calcular promedios por sección
  const seccionesPromedios = useMemo(() => {
    const promedios: Record<string, number> = {};
    SECCIONES_CONFIG.forEach((seccion) => {
      const puntuaciones = seccion.competencias
        .map((comp) => secciones[seccion.titulo]?.[comp] || 0)
        .filter((v) => v !== 0);
      promedios[seccion.titulo] = calcularPromedioSeccion(puntuaciones);
    });
    return promedios;
  }, [secciones]);

  // Calcular promedio general
  const promedioGeneral = useMemo(() => {
    const todos = Object.values(seccionesPromedios).filter((v) => v > 0);
    return todos.length > 0 ? calcularPromedioSeccion(todos) : 0;
  }, [seccionesPromedios]);

  // Calcular efectividad
  const efectividad = useMemo(() => {
    return calcularEfectividad(promedioGeneral);
  }, [promedioGeneral]);

  // Auto-save cada 30 segundos si hay cambios
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!isDirty) return;

      try {
        setIsSaving(true);
        
        // Construir secciones como objeto con arrays de ItemEvaluacion
        const seccionesObj = {
          planeacionOrganizacion: COMPETENCIAS_PLANEACION.map((comp) => ({
            competencia: comp,
            puntuacion: (secciones['Planeación y Organización']?.[comp] || 0) as any,
            observaciones: '',
          })),
          noNegociables: COMPETENCIAS_NO_NEGOCIABLES.map((comp) => ({
            competencia: comp,
            puntuacion: (secciones['No Negociables']?.[comp] || 0) as any,
            observaciones: '',
          })),
          usoSistemas: COMPETENCIAS_USO_SISTEMAS.map((comp) => ({
            competencia: comp,
            puntuacion: (secciones['Uso de Sistemas']?.[comp] || 0) as any,
            observaciones: '',
          })),
          conocimientoProducto: COMPETENCIAS_CONOCIMIENTO_PRODUCTO.map((comp) => ({
            competencia: comp,
            puntuacion: (secciones['Conocimiento del Producto']?.[comp] || 0) as any,
            observaciones: '',
          })),
        };
        
        await onSaveDraft({
          fecha: new Date(),
          secciones: seccionesObj,
          observacionesGenerales,
          compromisos,
          proximaRevision: proximaRevision ? new Date(proximaRevision) : undefined,
        });
        setLastSaved(new Date());
        setIsDirty(false);
      } catch (error) {
        console.error('Error en auto-save:', error);
      } finally {
        setIsSaving(false);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isDirty, secciones, observacionesGenerales, compromisos, proximaRevision, onSaveDraft]);

  // Advertencia al cerrar pestaña
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Handlers
  const handleSeccionChange = useCallback(
    (titulo: string, competencia: string, value: number) => {
      setIsDirty(true);
      setSecciones((prev) => ({
        ...prev,
        [titulo]: {
          ...prev[titulo],
          [competencia]: value,
        },
      }));
    },
    []
  );

  const handleAddCompromiso = () => {
    if (nuevoCompromiso.trim()) {
      setIsDirty(true);
      setCompromisos([...compromisos, nuevoCompromiso]);
      setNuevoCompromiso('');
    }
  };

  const handleRemoveCompromiso = (index: number) => {
    setIsDirty(true);
    setCompromisos(compromisos.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    if (currentStep < 5) {
      if (!isSectionComplete(SECCIONES_CONFIG[currentStep - 1].titulo)) {
        toast({
          title: 'Sección incompleta',
          description: 'Por favor completa todas las competencias antes de continuar',
          variant: 'destructive',
        });
        return;
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraftManual = async () => {
    try {
      setIsSaving(true);
      
      // Construir secciones como objeto con arrays de ItemEvaluacion
      const seccionesObj = {
        planeacionOrganizacion: COMPETENCIAS_PLANEACION.map((comp) => ({
          competencia: comp,
          puntuacion: (secciones['Planeación y Organización']?.[comp] || 0) as any,
          observaciones: '',
        })),
        noNegociables: COMPETENCIAS_NO_NEGOCIABLES.map((comp) => ({
          competencia: comp,
          puntuacion: (secciones['No Negociables']?.[comp] || 0) as any,
          observaciones: '',
        })),
        usoSistemas: COMPETENCIAS_USO_SISTEMAS.map((comp) => ({
          competencia: comp,
          puntuacion: (secciones['Uso de Sistemas']?.[comp] || 0) as any,
          observaciones: '',
        })),
        conocimientoProducto: COMPETENCIAS_CONOCIMIENTO_PRODUCTO.map((comp) => ({
          competencia: comp,
          puntuacion: (secciones['Conocimiento del Producto']?.[comp] || 0) as any,
          observaciones: '',
        })),
      };
      
      await onSaveDraft({
        fecha: new Date(),
        secciones: seccionesObj,
        observacionesGenerales,
        compromisos,
        proximaRevision: proximaRevision ? new Date(proximaRevision) : undefined,
      });
      setLastSaved(new Date());
      setIsDirty(false);
      toast({
        title: 'Borrador guardado',
        description: 'Los cambios se han guardado correctamente',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el borrador',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      setShowCancelDialog(true);
    } else {
      onCancel();
    }
  };

  const handleCancelConfirm = () => {
    setShowCancelDialog(false);
    onCancel();
  };

  const handleSaveAndCancel = async () => {
    await handleSaveDraftManual();
    setShowCancelDialog(false);
    onCancel();
  };

  const handleFinalize = async () => {
    // Validar que todas las secciones estén completas
    const allComplete = SECCIONES_CONFIG.every((sec) =>
      isSectionComplete(sec.titulo)
    );

    if (!allComplete) {
      toast({
        title: 'Evaluación incompleta',
        description: 'Por favor completa todas las secciones antes de finalizar',
        variant: 'destructive',
      });
      return;
    }

    if (!proximaRevision) {
      toast({
        title: 'Próxima revisión requerida',
        description: 'Por favor establece la fecha de próxima revisión',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Construir secciones como objeto con arrays de ItemEvaluacion
      const seccionesObj = {
        planeacionOrganizacion: COMPETENCIAS_PLANEACION.map((comp) => ({
          competencia: comp,
          puntuacion: (secciones['Planeación y Organización']?.[comp] || 0) as any,
          observaciones: '',
        })),
        noNegociables: COMPETENCIAS_NO_NEGOCIABLES.map((comp) => ({
          competencia: comp,
          puntuacion: (secciones['No Negociables']?.[comp] || 0) as any,
          observaciones: '',
        })),
        usoSistemas: COMPETENCIAS_USO_SISTEMAS.map((comp) => ({
          competencia: comp,
          puntuacion: (secciones['Uso de Sistemas']?.[comp] || 0) as any,
          observaciones: '',
        })),
        conocimientoProducto: COMPETENCIAS_CONOCIMIENTO_PRODUCTO.map((comp) => ({
          competencia: comp,
          puntuacion: (secciones['Conocimiento del Producto']?.[comp] || 0) as any,
          observaciones: '',
        })),
      };
      
      await onSave({
        fecha: new Date(),
        secciones: seccionesObj,
        observacionesGenerales,
        compromisos,
        proximaRevision: new Date(proximaRevision),
      });
      toast({
        title: 'Evaluación finalizada',
        description: 'La evaluación se ha guardado correctamente',
      });
      onCancel(); // Cerrar formulario
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo finalizar la evaluación',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Evaluación - {empleado.nombre}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{empleado.cargo}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Indicador de guardado */}
              <div className="flex items-center gap-2 text-sm">
                {isSaving ? (
                  <>
                    <Cloud className="h-4 w-4 text-blue-600 animate-spin" />
                    <span className="text-muted-foreground">Guardando...</span>
                  </>
                ) : lastSaved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-muted-foreground">
                      Guardado: {formatDistanceToNow(lastSaved, { locale: es, addSuffix: true })}
                    </span>
                  </>
                ) : isDirty ? (
                  <>
                    <CloudOff className="h-4 w-4 text-yellow-600" />
                    <span className="text-muted-foreground">Sin guardar</span>
                  </>
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                disabled={isLoading || isSaving}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Indicador de pasos */}
          <div className="mt-4 flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => {
              const stepNum = i + 1;
              const isActive = currentStep === stepNum;
              const isPassed = currentStep > stepNum;
              const isSection = stepNum < 5;
              const isComplete =
                isSection && isSectionComplete(SECCIONES_CONFIG[stepNum - 1].titulo);

              return (
                <button
                  key={stepNum}
                  onClick={() => {
                    if (isPassed || isActive) setCurrentStep(stepNum);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isPassed
                      ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {isComplete && !isActive ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <span>{stepNum}</span>
                  )}
                  <span className="hidden sm:inline">
                    {stepNum === 5
                      ? 'Resumen'
                      : SECCIONES_CONFIG[stepNum - 1]?.titulo.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </CardHeader>
      </Card>

      {/* Contenido por paso */}
      <div className="space-y-4">
        {currentStep < 5 ? (
          // Steps 1-4: Secciones
          <>
            <SeccionEvaluacion
              titulo={SECCIONES_CONFIG[currentStep - 1].titulo}
              competencias={SECCIONES_CONFIG[currentStep - 1].competencias}
              values={secciones[SECCIONES_CONFIG[currentStep - 1].titulo]}
              onChange={(competencia, value) =>
                handleSeccionChange(
                  SECCIONES_CONFIG[currentStep - 1].titulo,
                  competencia,
                  value
                )
              }
              promedio={seccionesPromedios[SECCIONES_CONFIG[currentStep - 1].titulo]}
            />
          </>
        ) : (
          // Step 5: Resumen
          <div className="space-y-6">
            {/* Resumen de secciones */}
            <Card>
              <CardHeader>
                <CardTitle>Resumen de Secciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {SECCIONES_CONFIG.map((seccion) => (
                  <div
                    key={seccion.titulo}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium">{seccion.titulo}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">
                        {seccionesPromedios[seccion.titulo].toFixed(2)}
                      </span>
                      {isSectionComplete(seccion.titulo) && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                  </div>
                ))}

                {/* Promedios globales */}
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">Promedio General:</span>
                    <Badge variant="outline">{promedioGeneral.toFixed(2)}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Efectividad Estimada:</span>
                    <Badge variant="outline">{efectividad.toFixed(1)}%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Observaciones generales */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Observaciones Generales</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Añade observaciones sobre el desempeño general..."
                  value={observacionesGenerales}
                  onChange={(e) => setObservacionesGenerales(e.target.value)}
                  className="min-h-24"
                />
              </CardContent>
            </Card>

            {/* Compromisos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Compromisos de Mejora</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {compromisos.map((compromiso, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                  >
                    <span>{compromiso}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveCompromiso(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <div className="flex gap-2">
                  <Input
                    placeholder="Nuevo compromiso..."
                    value={nuevoCompromiso}
                    onChange={(e) => setNuevoCompromiso(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCompromiso();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddCompromiso}
                    variant="outline"
                    disabled={!nuevoCompromiso.trim()}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Próxima revisión */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Próxima Revisión</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="date"
                  value={proximaRevision}
                  onChange={(e) => setProximaRevision(e.target.value)}
                  required
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Footer con botones */}
      <Card>
        <CardContent className="pt-6 flex gap-2 justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 1 || isLoading || isSaving}
          >
            Anterior
          </Button>

          <Button
            variant="secondary"
            onClick={handleSaveDraftManual}
            disabled={isLoading || isSaving}
          >
            {isSaving ? 'Guardando...' : 'Guardar Borrador'}
          </Button>

          <Button
            onClick={currentStep === 5 ? handleFinalize : handleNext}
            disabled={isLoading || isSaving}
          >
            {isLoading ? 'Finalizando...' : currentStep === 5 ? 'Finalizar' : 'Siguiente'}
          </Button>
        </CardContent>
      </Card>

      {/* AlertDialog para confirmación de cancelación */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>
              Hay cambios que no han sido guardados. ¿Qué deseas hacer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={handleCancelConfirm}
            >
              Descartar cambios
            </Button>
            <AlertDialogAction onClick={handleSaveAndCancel}>
              Guardar y salir
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
