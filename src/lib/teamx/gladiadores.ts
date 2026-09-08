'use client';

// Helpers de datos para el Tablero de Gladiadores (vista de eficiencia del equipo).
// Agrega evaluaciones por empleado x semana usando `ev.eficiencia.logro` y aplica el
// semáforo por defecto: verde >95, amarillo 85–95, rojo <85, gris si no hay evaluación.

import type { Empleado } from '@/types/empleado';
import type { Evaluacion } from '@/types/teamx';

export type Semaforo = 'verde' | 'amarillo' | 'rojo' | 'sin-dato';

export function semaforoDeLogro(logro: number | null | undefined): Semaforo {
  if (logro === null || logro === undefined || Number.isNaN(logro)) return 'sin-dato';
  if (logro > 95) return 'verde';
  if (logro >= 85) return 'amarillo';
  return 'rojo';
}

export interface CeldaGladiador {
  semana: number;
  logro: number | null;
  semaforo: Semaforo;
}

export interface FilaGladiador {
  empleadoId: string;
  nombre: string;
  cargo: string;
  photoURL?: string;
  celdas: CeldaGladiador[];
  /** % de eficiencia acumulado = promedio de las semanas con dato. */
  eficienciaAcumulada: number | null;
  /** Racha actual de semanas consecutivas en verde, contada desde la última semana con dato. */
  racha: number;
}

export interface TableroGladiadores {
  semanas: number[]; // [1..N]
  filas: FilaGladiador[];
  /** Promedio del equipo por semana (columna), null si nadie tiene dato esa semana. */
  promediosColumna: (number | null)[];
  /** Promedio general del equipo (de las filas con dato). */
  promedioEquipo: number | null;
}

/** Extrae un número finito de `ev.eficiencia.logro`, o null si no es válido. */
function logroDe(ev: Evaluacion): number | null {
  const raw = (ev.eficiencia as any)?.logro;
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function construirTablero(
  empleados: Empleado[],
  evaluaciones: Evaluacion[],
  numSemanas: number,
): TableroGladiadores {
  const semanas = Array.from({ length: Math.max(numSemanas, 0) }, (_, i) => i + 1);

  // empleadoId -> semana -> { logro, fecha } (si hay más de una evaluación en la misma
  // semana, se queda con la más reciente por fecha).
  const porEmpleado = new Map<string, Map<number, { logro: number | null; fecha: string }>>();
  for (const ev of evaluaciones) {
    const semana = ev.semana;
    if (!semana || semana < 1 || semana > numSemanas) continue;
    const logro = logroDe(ev);
    const map = porEmpleado.get(ev.empleadoId) ?? new Map();
    const prev = map.get(semana);
    if (!prev || (ev.fecha ?? '') >= (prev.fecha ?? '')) {
      map.set(semana, { logro, fecha: ev.fecha ?? '' });
    }
    porEmpleado.set(ev.empleadoId, map);
  }

  const filas: FilaGladiador[] = empleados.map((emp) => {
    const semMap = porEmpleado.get(emp.id);
    const celdas: CeldaGladiador[] = semanas.map((s) => {
      const logro = semMap?.get(s)?.logro ?? null;
      return { semana: s, logro, semaforo: semaforoDeLogro(logro) };
    });

    const conDato = celdas.filter((c) => c.logro !== null);
    const eficienciaAcumulada = conDato.length
      ? Math.round(conDato.reduce((sum, c) => sum + (c.logro as number), 0) / conDato.length)
      : null;

    // Racha actual: desde la última semana con dato hacia atrás, mientras sea verde.
    let ultimaConDato = -1;
    for (let i = celdas.length - 1; i >= 0; i--) {
      if (celdas[i].logro !== null) { ultimaConDato = i; break; }
    }
    let racha = 0;
    for (let i = ultimaConDato; i >= 0; i--) {
      if (celdas[i].semaforo === 'verde') racha++;
      else break;
    }

    return {
      empleadoId: emp.id,
      nombre: emp.nombre,
      cargo: emp.cargo || '—',
      photoURL: emp.photoURL,
      celdas,
      eficienciaAcumulada,
      racha,
    };
  });

  const promediosColumna: (number | null)[] = semanas.map((_, idx) => {
    const vals = filas.map((f) => f.celdas[idx]?.logro).filter((v): v is number => v !== null && v !== undefined);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  });

  const equipoVals = filas.map((f) => f.eficienciaAcumulada).filter((v): v is number => v !== null);
  const promedioEquipo = equipoVals.length
    ? Math.round(equipoVals.reduce((a, b) => a + b, 0) / equipoVals.length)
    : null;

  return { semanas, filas, promediosColumna, promedioEquipo };
}

export const SEMAFORO_COLOR: Record<Semaforo, { text: string; bg: string; border: string; label: string }> = {
  verde: { text: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-300', label: 'Verde' },
  amarillo: { text: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-300', label: 'Amarillo' },
  rojo: { text: 'text-red-600', bg: 'bg-red-100', border: 'border-red-300', label: 'Rojo' },
  'sin-dato': { text: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border', label: 'Sin evaluación' },
};
