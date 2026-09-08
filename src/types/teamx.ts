// Modelo del nuevo motor de evaluación TEAMx (tablero de coaching).

export type Naturaleza = 'competencia' | 'kpi';

export interface NivelEscala {
  key: string;
  label: string;
  valor: number; // 4.00 | 2.67 | 1.33 | 0.00
  color: string;
}

export interface Escala {
  id?: string;
  niveles: NivelEscala[];
  permiteNa: boolean;
}

export const ESCALA_DEFAULT: Escala = {
  niveles: [
    { key: 'evidente', label: 'Evidente', valor: 4.0, color: '#16a34a' },
    { key: 'en_desarrollo', label: 'En desarrollo', valor: 2.67, color: '#f59e0b' },
    { key: 'por_desarrollar', label: 'Por desarrollar', valor: 1.33, color: '#f97316' },
    { key: 'sin_evidencia', label: 'Sin evidencia', valor: 0.0, color: '#ef4444' },
  ],
  permiteNa: true,
};

export const VALOR_MAX = 4.0;

export interface Aspecto {
  id: string;
  nombre: string;
  descripcion?: string;
  evidencia?: Record<string, string>;
  orden: number;
}

export interface Dimension {
  id: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  color: string;
  peso: number;
  orden: number;
  naturaleza: Naturaleza;
  activo: boolean;
  aspectos: Aspecto[];
}

export interface Ciclo {
  id: string;
  nombre: string;
  fechaInicio: string; // ISO date
  semanas: number;
  estado: string;
}

/** Respuesta a un aspecto: valor de la escala, o N/A, con nota opcional. */
export interface RespuestaAspecto {
  valor: number | null;
  na?: boolean;
  nota?: string;
}
export type Respuestas = Record<string, RespuestaAspecto>; // aspectoId -> respuesta

export type EstadoEvaluacion =
  | 'borrador'
  | 'revision'
  | 'firmada'
  | 'cofirmada'
  | 'bloqueada';

export interface ConfigSnapshot {
  dimensiones: Dimension[];
  escala: Escala;
}

export interface ResumenDimension {
  pct: number;
  anterior?: number | null;
  cambio?: number | null;
}

export interface Evaluacion {
  id: string;
  organizacionId: string;
  empleadoId: string;
  empleadoNombre?: string;
  coachId?: string | null;
  coachNombre?: string;
  cicloId?: string | null;
  semana?: number | null;
  fecha: string; // ISO date
  estado: EstadoEvaluacion;
  configSnapshot: ConfigSnapshot;
  respuestas: Respuestas;
  seguimiento: any[];
  eficiencia: Record<string, any>;
  resumen: Record<string, ResumenDimension>;
  promedioGeneral: number | null;
  firmas: Record<string, any>;
  evalAnteriorId?: string | null;
}

/* ── Cálculos ────────────────────────────────────────────────────────────── */

/** % de una dimensión = promedio de aspectos respondidos (no N/A) sobre el máximo. */
export function pctDimension(dim: Dimension, respuestas: Respuestas): number | null {
  const vals: number[] = [];
  for (const a of dim.aspectos) {
    const r = respuestas[a.id];
    if (!r || r.na || r.valor === null || r.valor === undefined) continue;
    vals.push(r.valor);
  }
  if (vals.length === 0) return null;
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  return Math.round((avg / VALOR_MAX) * 100);
}

/** Cuántos aspectos respondidos (incluye N/A) de cuántos. */
export function progresoDimension(dim: Dimension, respuestas: Respuestas): { done: number; total: number } {
  const total = dim.aspectos.length;
  let done = 0;
  for (const a of dim.aspectos) {
    const r = respuestas[a.id];
    if (r && (r.na || (r.valor !== null && r.valor !== undefined))) done++;
  }
  return { done, total };
}

/** Promedio general ponderado por peso, solo dimensiones de competencia con datos. */
export function promedioGeneral(dims: Dimension[], respuestas: Respuestas): number | null {
  let sum = 0;
  let pesoTotal = 0;
  for (const d of dims) {
    if (d.naturaleza !== 'competencia') continue;
    const p = pctDimension(d, respuestas);
    if (p === null) continue;
    sum += p * (d.peso || 1);
    pesoTotal += d.peso || 1;
  }
  if (pesoTotal === 0) return null;
  return Math.round(sum / pesoTotal);
}
