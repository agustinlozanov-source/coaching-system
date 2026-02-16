'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ESCALA_EVALUACION, ESCALA_COLORES } from '@/lib/constants/competencias';
import { useOrganization } from '@/contexts/OrganizationContext';
import { cn } from '@/lib/utils/cn';

interface CompetenciaRatingProps {
  competencia: string;
  value: number;
  onChange: (value: number) => void;
  observaciones?: string;
  onObservacionesChange?: (observaciones: string) => void;
}

export function CompetenciaRating({
  competencia,
  value,
  onChange,
  observaciones = '',
  onObservacionesChange,
}: CompetenciaRatingProps) {
  const { getEscalaPuntuacion } = useOrganization();
  const escala = getEscalaPuntuacion();
  const escalaKeys = Object.keys(escala).map(Number).sort((a, b) => a - b);

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
      {/* Competencia Label */}
      <div>
        <Label className="text-sm font-medium">{competencia}</Label>
      </div>

      {/* Rating Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {escalaKeys.map((score) => {
          const isSelected = value === score;
          const colorClass = ESCALA_COLORES[score as keyof typeof ESCALA_COLORES] || 'bg-gray-500';
          const label = escala[score as keyof typeof escala];

          return (
            <div key={score} className="flex flex-col items-center gap-1">
              <Button
                type="button"
                onClick={() => onChange(score)}
                className={cn(
                  'h-12 w-12 rounded-full font-semibold text-lg transition-all',
                  isSelected
                    ? `${colorClass} border-2 border-current scale-110`
                    : 'border border-gray-300 hover:scale-105 bg-white text-gray-700'
                )}
                variant={isSelected ? 'default' : 'outline'}
              >
                {score}
              </Button>
              <span className="text-xs text-muted-foreground text-center w-14">
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Observaciones */}
      {onObservacionesChange && (
        <div className="pt-2">
          <Label htmlFor={`obs-${competencia}`} className="text-xs">
            Observaciones (opcional)
          </Label>
          <Textarea
            id={`obs-${competencia}`}
            placeholder="Añade observaciones sobre esta competencia..."
            value={observaciones}
            onChange={(e) => onObservacionesChange(e.target.value)}
            className="mt-1 min-h-20 text-sm resize-none"
          />
        </div>
      )}
    </div>
  );
}
