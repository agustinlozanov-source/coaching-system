'use client';

import { useMemo } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CompetenciaRating } from './CompetenciaRating';
import { calcularPromedioSeccion } from '@/lib/utils/calculations';
import { ESCALA_COLORES } from '@/lib/constants/competencias';

interface SeccionEvaluacionProps {
  titulo: string;
  competencias: string[];
  values: Record<string, number>;
  onChange: (competencia: string, value: number) => void;
  promedio?: number;
}

export function SeccionEvaluacion({
  titulo,
  competencias,
  values,
  onChange,
  promedio,
}: SeccionEvaluacionProps) {
  // Calcular competencias evaluadas
  const evaluadas = useMemo(() => {
    return competencias.filter((c) => values[c] && values[c] !== 0).length;
  }, [competencias, values]);

  const total = competencias.length;
  const porcentajeProgreso = (evaluadas / total) * 100;

  // Calcular promedio de la sección
  const promedioCalculado = useMemo(() => {
    const puntuaciones = competencias
      .map((c) => values[c])
      .filter((v) => v && v !== 0);
    return calcularPromedioSeccion(puntuaciones);
  }, [competencias, values]);

  // Determiniar color del promedio
  const getPromedioColor = () => {
    if (promedioCalculado === 0) return 'bg-gray-50 text-gray-700';
    if (promedioCalculado <= 1.5) return ESCALA_COLORES[1];
    if (promedioCalculado <= 2.5) return ESCALA_COLORES[2];
    if (promedioCalculado <= 3.5) return ESCALA_COLORES[3];
    return ESCALA_COLORES[4];
  };

  const todasEvaluadas = evaluadas === total && evaluadas > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{titulo}</CardTitle>
            {todasEvaluadas && (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            )}
            {!todasEvaluadas && evaluadas > 0 && (
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            )}
            {evaluadas === 0 && (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
          </div>
          {promedioCalculado > 0 && (
            <Badge className={getPromedioColor()}>
              Promedio: {promedioCalculado.toFixed(2)}
            </Badge>
          )}
        </div>

        {/* Progreso */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {evaluadas} de {total} competencias evaluadas
            </span>
            <span>{Math.round(porcentajeProgreso)}%</span>
          </div>
          <Progress value={porcentajeProgreso} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {competencias.map((competencia, index) => (
          <div key={competencia}>
            <CompetenciaRating
              competencia={competencia}
              value={values[competencia] || 0}
              onChange={(value) => onChange(competencia, value)}
            />
            {index < competencias.length - 1 && (
              <div className="my-3 border-t" />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
