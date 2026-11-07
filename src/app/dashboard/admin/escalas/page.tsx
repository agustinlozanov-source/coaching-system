'use client';

/**
 * Editor de la escala de evaluación (tabla teamx_escala).
 *
 * Antes esta pantalla editaba `configuracion.escalaPuntuacion` — las etiquetas
 * de Puntuación 1 a 5 guardadas en teamx_config. La evaluación nunca leyó eso:
 * el tablero usa teamx_escala, que no tenía pantalla. Se podían cambiar las
 * cinco etiquetas y no pasaba nada. Ahora esto edita la escala de verdad.
 */

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/teamx/org';
import { getEscala } from '@/lib/teamx/evaluacion';
import { ESCALA_DEFAULT, VALOR_MAX, type NivelEscala } from '@/types/teamx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Info, Loader2, RotateCcw } from 'lucide-react';

export default function EscalasPage() {
  const { toast } = useToast();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [niveles, setNiveles] = useState<NivelEscala[]>(ESCALA_DEFAULT.niveles);
  const [permiteNa, setPermiteNa] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const id = await getActiveOrgId();
    setOrgId(id);
    if (id) {
      const e = await getEscala(id);
      setNiveles(e.niveles);
      setPermiteNa(e.permiteNa);
    }
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function editar(i: number, patch: Partial<NivelEscala>) {
    setNiveles((prev) => prev.map((n, j) => (j === i ? { ...n, ...patch } : n)));
  }

  async function guardar() {
    if (!orgId) return;
    // El valor manda sobre el orden: el tablero pinta los niveles como vengan,
    // y el promedio se saca sobre `valor`. Se ordena de mayor a menor para que
    // la fila de botones salga siempre de lo mejor a lo peor.
    const limpios = niveles
      .map((n) => ({ ...n, label: n.label.trim(), valor: Number(n.valor) || 0 }))
      .sort((a, b) => b.valor - a.valor);

    if (limpios.some((n) => !n.label)) {
      toast({ title: 'Falta un nombre', description: 'Ningún nivel puede quedarse sin nombre.', variant: 'destructive' });
      return;
    }

    setGuardando(true);
    const supabase = createClient();
    const { error } = await supabase.from('teamx_escala').upsert(
      { organizacion_id: orgId, niveles: limpios, permite_na: permiteNa, updated_at: new Date().toISOString() },
      { onConflict: 'organizacion_id' },
    );
    setGuardando(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setNiveles(limpios);
    toast({ title: 'Escala guardada', description: 'Aplica a las evaluaciones que crees de aquí en adelante.' });
  }

  function restablecer() {
    setNiveles(ESCALA_DEFAULT.niveles);
    setPermiteNa(true);
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          No hay una organización activa. Elige una en el selector de arriba.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Ésta es la escala que usan las evaluaciones</p>
              <p className="text-sm text-muted-foreground">
                Cada nivel tiene un nombre, un color y un valor. El porcentaje de cada dimensión
                es el promedio de los valores sobre {VALOR_MAX}.
              </p>
              <p className="text-sm text-muted-foreground">
                Cada evaluación congela la escala al crearse: lo que cambies aquí aplica a las
                nuevas, y las anteriores conservan la suya.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Niveles</CardTitle>
          <CardDescription>Nombre, color y valor de cada botón del tablero</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {niveles.map((n, i) => (
            <div key={n.key} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_120px_110px]">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Nombre
                </Label>
                <Input value={n.label} onChange={(e) => editar(i, { label: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Valor
                </Label>
                <Input
                  type="number" step="0.01" min="0" max={VALOR_MAX}
                  value={n.valor}
                  onChange={(e) => editar(i, { valor: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Color
                </Label>
                <input
                  type="color" value={n.color}
                  onChange={(e) => editar(i, { color: e.target.value })}
                  className="h-10 w-full cursor-pointer rounded-md border bg-background"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">No aplica</CardTitle>
          <CardDescription>
            El tablero es el mismo para todo el equipo, y hay cosas que no aplican a ciertos puestos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4">
            <input
              type="checkbox"
              checked={permiteNa}
              onChange={(e) => setPermiteNa(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-emerald-600"
            />
            <span className="text-sm">
              <span className="font-medium">Permitir marcar «No aplica»</span>
              <span className="mt-1 block text-muted-foreground">
                Aparece como un botón más junto a los niveles. Lo que se marque así no entra al
                promedio: si diez aspectos tienen tres en «No aplica», la calificación se saca
                sobre siete. Cuenta como contestado, así que la evaluación se puede cerrar completa.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Así se va a ver</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[...niveles].sort((a, b) => b.valor - a.valor).map((n) => (
              <span
                key={n.key}
                className="rounded-full border px-3 py-1 text-xs font-semibold"
                style={{ color: n.color, borderColor: n.color + '55' }}
              >
                {n.label || '—'}
              </span>
            ))}
            {permiteNa && (
              <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-500">
                No aplica
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3 border-t pt-6">
        <Button onClick={guardar} disabled={guardando}>
          {guardando
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando…</>
            : <><CheckCircle2 className="mr-2 h-4 w-4" />Guardar escala</>}
        </Button>
        <Button variant="outline" onClick={restablecer} disabled={guardando}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Restablecer los de fábrica
        </Button>
      </div>
    </div>
  );
}
