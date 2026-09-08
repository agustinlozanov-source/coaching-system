'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_MIN = 45;
/** Segundos restantes en los que se dispara una alerta: 10 min, 5 min y 0 (tiempo cumplido). */
const ALERT_THRESHOLDS_SEC = [600, 300, 0];
/** Cada cuántos segundos de avance se persiste la duración real como heartbeat. */
const PERSIST_EVERY_SEC = 15;

/**
 * Cronómetro de sesión: cuenta regresiva visible desde `targetMin` (45 por defecto),
 * alerta a 10/5/0 minutos restantes, y reporta la duración real transcurrida (segundos)
 * a través de `onPersist` — al iniciar/pausar/reiniciar y como heartbeat mientras corre.
 */
export function SesionTimer({
  initialElapsedSec = 0,
  disabled = false,
  onPersist,
}: {
  initialElapsedSec?: number;
  disabled?: boolean;
  onPersist: (elapsedSec: number) => void;
}) {
  const { toast } = useToast();
  const [targetMin, setTargetMin] = useState(DEFAULT_MIN);
  const [elapsedSec, setElapsedSec] = useState(initialElapsedSec);
  const [running, setRunning] = useState(false);

  const elapsedRef = useRef(initialElapsedSec);
  const lastPersistRef = useRef(initialElapsedSec);
  const alertedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setElapsedSec((prev) => {
        const next = prev + 1;
        elapsedRef.current = next;

        const remaining = targetMin * 60 - next;
        if (ALERT_THRESHOLDS_SEC.includes(remaining) && !alertedRef.current.has(remaining)) {
          alertedRef.current.add(remaining);
          toast({
            title: remaining === 0 ? 'Tiempo de sesión cumplido' : `Quedan ${remaining / 60} minutos`,
            description: remaining === 0
              ? `Se alcanzó el objetivo de ${targetMin} min. Puedes cerrar cuando estés listo.`
              : 'Considera ir cerrando los puntos de la agenda.',
          });
        }

        if (next - lastPersistRef.current >= PERSIST_EVERY_SEC) {
          lastPersistRef.current = next;
          onPersist(next);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, targetMin]);

  // Persiste el último valor conocido al desmontar (p. ej. si el usuario navega fuera).
  useEffect(() => () => { onPersist(elapsedRef.current); }, [onPersist]);

  function toggle() {
    if (disabled) return;
    if (running) {
      lastPersistRef.current = elapsedRef.current;
      onPersist(elapsedRef.current);
    }
    setRunning((r) => !r);
  }

  function reset() {
    if (disabled) return;
    setRunning(false);
    setElapsedSec(0);
    elapsedRef.current = 0;
    lastPersistRef.current = 0;
    alertedRef.current.clear();
    onPersist(0);
  }

  const remaining = Math.max(targetMin * 60 - elapsedSec, 0);
  const over = elapsedSec > targetMin * 60;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const critico = !over && remaining <= 300;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div
        className={`font-mono text-4xl font-extrabold tabular-nums ${
          over ? 'text-red-600' : critico ? 'text-amber-600' : 'text-foreground'
        }`}
      >
        {over ? '+' : ''}{mm}:{ss}
      </div>

      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>Transcurrido: {Math.floor(elapsedSec / 60)} min · Objetivo</span>
        <Input
          type="number" min={5} max={180} value={targetMin} disabled={disabled}
          onChange={(e) => setTargetMin(Math.max(5, Number(e.target.value) || DEFAULT_MIN))}
          className="h-6 w-16 px-1 py-0 text-xs"
        />
        <span>min</span>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant={running ? 'secondary' : 'default'} disabled={disabled} onClick={toggle}>
          {running ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
          {running ? 'Pausar' : elapsedSec > 0 ? 'Reanudar' : 'Iniciar'}
        </Button>
        <Button size="sm" variant="outline" disabled={disabled} onClick={reset}>
          <RotateCcw className="mr-1 h-4 w-4" /> Reiniciar
        </Button>
      </div>
    </div>
  );
}
