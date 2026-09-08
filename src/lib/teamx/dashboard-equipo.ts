// Helpers puros para el Dashboard de Equipo de TEAMx (src/app/dashboard/page.tsx).
// No hacen fetch: reciben datos ya cargados (listEvaluaciones/getEmpleados/getDimensiones)
// y derivan las métricas del panel.

import { Dimension, Evaluacion, pctDimension } from '@/types/teamx';

/** Última evaluación de cada empleado. Asume `evals` ordenado por fecha desc (listEvaluaciones lo hace). */
export function dashLatestByEmpleado(evals: Evaluacion[]): Map<string, Evaluacion> {
  const out = new Map<string, Evaluacion>();
  for (const e of evals) {
    if (!out.has(e.empleadoId)) out.set(e.empleadoId, e);
  }
  return out;
}

/** Evaluación anterior a la última, por empleado (para medir tendencia/mejora). */
export function dashPreviousByEmpleado(evals: Evaluacion[]): Map<string, Evaluacion> {
  const seen = new Set<string>();
  const out = new Map<string, Evaluacion>();
  for (const e of evals) {
    if (!seen.has(e.empleadoId)) {
      seen.add(e.empleadoId);
      continue;
    }
    if (!out.has(e.empleadoId)) out.set(e.empleadoId, e);
  }
  return out;
}

/** % de una dimensión (por id) calculado sobre el propio snapshot de esa evaluación. */
export function dashPctDimForEval(ev: Evaluacion, dimId: string): number | null {
  const dim = ev.configSnapshot?.dimensiones?.find((d) => d.id === dimId);
  if (!dim) return null;
  return pctDimension(dim, ev.respuestas);
}

export type Semaforo = 'verde' | 'amarillo' | 'rojo' | 'gris';

/** Semáforo por % de dimensión/competencia (heat map). Umbrales: ≥80 verde, ≥60 amarillo, si no rojo. */
export function dashSemaforoPct(pct: number | null | undefined): Semaforo {
  if (pct === null || pct === undefined) return 'gris';
  if (pct >= 80) return 'verde';
  if (pct >= 60) return 'amarillo';
  return 'rojo';
}

/** Semáforo de eficiencia (logro %). Umbrales por defecto del brief: >95 verde, 85–95 amarillo, <85 rojo. */
export function dashSemaforoEficiencia(logro: number | null | undefined): Semaforo {
  if (logro === null || logro === undefined || Number.isNaN(logro)) return 'gris';
  if (logro > 95) return 'verde';
  if (logro >= 85) return 'amarillo';
  return 'rojo';
}

export const DASH_SEMAFORO_COLOR: Record<Semaforo, string> = {
  verde: '#16a34a',
  amarillo: '#f59e0b',
  rojo: '#ef4444',
  gris: '#d1d5db',
};

export const DASH_SEMAFORO_BG: Record<Semaforo, string> = {
  verde: 'bg-emerald-100 text-emerald-800',
  amarillo: 'bg-amber-100 text-amber-800',
  rojo: 'bg-red-100 text-red-800',
  gris: 'bg-muted text-muted-foreground',
};

function avg(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

export interface DimAvg {
  dim: Dimension;
  pct: number | null;
  cambioPromedio: number | null;
}

/** Promedio del equipo por dimensión, usando la última evaluación de cada empleado. */
export function dashPromedioPorDimension(
  dims: Dimension[],
  latest: Map<string, Evaluacion>
): DimAvg[] {
  return dims.map((dim) => {
    const pcts: number[] = [];
    const cambios: number[] = [];
    latest.forEach((ev) => {
      const p = dashPctDimForEval(ev, dim.id);
      if (p !== null) pcts.push(p);
      const c = ev.resumen?.[dim.id]?.cambio;
      if (typeof c === 'number') cambios.push(c);
    });
    return { dim, pct: avg(pcts), cambioPromedio: avg(cambios) };
  });
}

export interface AttentionEntry {
  empleadoId: string;
  reasons: ('score_bajo' | 'tendencia_negativa' | 'sin_reciente')[];
  pct: number | null;
  diasSinEvaluar: number | null;
}

const UMBRAL_SCORE_BAJO = 70;
const DIAS_SIN_RECIENTE = 14;

/** Miembros que requieren atención: score bajo, tendencia negativa o sin evaluación reciente. */
export function dashRequierenAtencion(
  empleadoIds: string[],
  latest: Map<string, Evaluacion>,
  previous: Map<string, Evaluacion>,
  hoy: Date = new Date()
): AttentionEntry[] {
  const out: AttentionEntry[] = [];
  for (const id of empleadoIds) {
    const ult = latest.get(id) ?? null;
    const reasons: AttentionEntry['reasons'] = [];
    let diasSinEvaluar: number | null = null;

    if (!ult) {
      reasons.push('sin_reciente');
    } else {
      const fecha = new Date(ult.fecha + 'T00:00:00');
      diasSinEvaluar = Math.floor((hoy.getTime() - fecha.getTime()) / (24 * 3600 * 1000));
      if (diasSinEvaluar > DIAS_SIN_RECIENTE) reasons.push('sin_reciente');

      if (ult.promedioGeneral !== null && ult.promedioGeneral < UMBRAL_SCORE_BAJO) {
        reasons.push('score_bajo');
      }

      const prev = previous.get(id);
      if (prev && ult.promedioGeneral !== null && prev.promedioGeneral !== null && ult.promedioGeneral < prev.promedioGeneral) {
        reasons.push('tendencia_negativa');
      }
    }

    if (reasons.length > 0) {
      out.push({ empleadoId: id, reasons, pct: ult?.promedioGeneral ?? null, diasSinEvaluar });
    }
  }

  // Prioriza: sin evaluación primero, luego score más bajo.
  return out.sort((a, b) => {
    const aNoEval = a.reasons.includes('sin_reciente') && a.pct === null ? 0 : 1;
    const bNoEval = b.reasons.includes('sin_reciente') && b.pct === null ? 0 : 1;
    if (aNoEval !== bNoEval) return aNoEval - bNoEval;
    return (a.pct ?? -1) - (b.pct ?? -1);
  });
}

export interface ImprovementEntry {
  empleadoId: string;
  delta: number;
  actual: number;
  anterior: number;
}

/** Empleados que más avanzaron: última evaluación vs. la anterior. */
export function dashTopMejoras(
  empleadoIds: string[],
  latest: Map<string, Evaluacion>,
  previous: Map<string, Evaluacion>,
  top = 5
): ImprovementEntry[] {
  const out: ImprovementEntry[] = [];
  for (const id of empleadoIds) {
    const ult = latest.get(id);
    const prev = previous.get(id);
    if (!ult || !prev || ult.promedioGeneral === null || prev.promedioGeneral === null) continue;
    const delta = ult.promedioGeneral - prev.promedioGeneral;
    if (delta > 0) out.push({ empleadoId: id, delta, actual: ult.promedioGeneral, anterior: prev.promedioGeneral });
  }
  return out.sort((a, b) => b.delta - a.delta).slice(0, top);
}

export function dashIniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}
