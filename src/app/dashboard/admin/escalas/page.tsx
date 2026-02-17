'use client';

import { useEffect, useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { EscalaPuntuacion } from '@/types/organization';

export default function EscalasPage() {
  const { organization, refreshOrganization } = useOrganization();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [escala, setEscala] = useState<EscalaPuntuacion>({} as EscalaPuntuacion);

  useEffect(() => {
    if (organization) {
      setEscala(organization.configuracion.escalaPuntuacion);
    }
  }, [organization]);

  const handleSaveEscala = async () => {
    if (!organization) return;

    try {
      setIsSaving(true);
      const orgRef = doc(db, 'organizations', organization.id);
      await updateDoc(orgRef, {
        'configuracion.escalaPuntuacion': escala,
        updatedAt: new Date(),
      });

      await refreshOrganization();
      toast({
        title: 'Éxito',
        description: 'Escala de puntuación actualizada correctamente',
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar los cambios',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLabelChange = (score: number, newLabel: string) => {
    setEscala({
      ...escala,
      [score]: newLabel,
    });
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const scores = Object.keys(escala)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {/* Info */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">¿Qué es la escala de puntuación?</p>
              <p className="text-sm text-muted-foreground">
                Define los valores numéricos y sus significados en las evaluaciones. Por ejemplo: 1=Deficiente, 5=Excelente
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Escala Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Escala de Puntuación</CardTitle>
          <CardDescription>Edita los labels para cada puntuación</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {scores.map((score) => (
              <div key={score} className="space-y-2">
                <Label className="text-base font-semibold">Puntuación {score}</Label>
                <Input
                  value={escala[score as keyof typeof escala]}
                  onChange={(e) => handleLabelChange(score, e.target.value)}
                  placeholder={`Label para puntuación ${score}`}
                  className="text-base"
                />
                <p className="text-xs text-muted-foreground">
                  Cómo aparecerá este nivel en evaluaciones
                </p>
              </div>
            ))}
          </div>

          <div className="border-t pt-6">
            <Button 
              onClick={handleSaveEscala}
              disabled={isSaving}
              className="w-full md:w-auto"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Guardar Escala
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vista Previa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {scores.map((score) => (
              <div
                key={score}
                className="flex items-center gap-4 p-3 border rounded-lg"
              >
                <div
                  className={`h-12 w-12 rounded-full font-bold text-white flex items-center justify-center ${
                    score === 1
                      ? 'bg-red-500'
                      : score === 2
                      ? 'bg-orange-500'
                      : score === 3
                      ? 'bg-yellow-500'
                      : score === 4
                      ? 'bg-green-400'
                      : 'bg-green-600'
                  }`}
                >
                  {score}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{escala[score as keyof typeof escala]}</p>
                  <p className="text-sm text-muted-foreground">Puntuación {score}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
