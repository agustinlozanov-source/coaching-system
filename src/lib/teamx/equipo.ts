// Helpers del módulo TEAMx · Equipo (roster, madurez, curva de aprendizaje, capacitación).

import { updateEmpleado } from '@/hooks/useEmpleados';
import type { Empleado } from '@/types/empleado';
import type { Evaluacion } from '@/types/teamx';

const MS_SEMANA = 7 * 24 * 3600 * 1000;

/** Semanas completas transcurridas entre `desde` y `hasta` (o ahora). Nunca negativo. */
export function semanasEntre(desde: Date, hasta: Date = new Date()): number {
  return Math.max(0, Math.floor((hasta.getTime() - desde.getTime()) / MS_SEMANA));
}

export interface MadurezInfo {
  key: string;
  label: string;
  badgeClass: string;
}

/** Parámetro de madurez por antigüedad en semanas (brief maestro §6.15). */
export function getMadurez(semanas: number): MadurezInfo {
  if (semanas <= 4) return { key: 'onboarding', label: 'Onboarding', badgeClass: 'border-transparent bg-blue-100 text-blue-800 hover:bg-blue-100' };
  if (semanas <= 12) return { key: 'en_desarrollo', label: 'En desarrollo', badgeClass: 'border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100' };
  if (semanas <= 26) return { key: 'competente', label: 'Competente', badgeClass: 'border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100' };
  if (semanas <= 52) return { key: 'experto', label: 'Experto', badgeClass: 'border-transparent bg-teal-100 text-teal-800 hover:bg-teal-100' };
  return { key: 'mentor', label: 'Mentor', badgeClass: 'border-transparent bg-purple-100 text-purple-800 hover:bg-purple-100' };
}

export type Semaforo = 'verde' | 'amarillo' | 'rojo' | 'na';

/** Semáforo de eficiencia (umbrales por defecto del brief): verde >95, amarillo 85–95, rojo <85. */
export function semaforoEficiencia(logro: number | null | undefined): Semaforo {
  if (logro === null || logro === undefined || Number.isNaN(logro)) return 'na';
  if (logro > 95) return 'verde';
  if (logro >= 85) return 'amarillo';
  return 'rojo';
}

export const SEMAFORO_TEXT_CLASS: Record<Semaforo, string> = {
  verde: 'text-emerald-600',
  amarillo: 'text-amber-600',
  rojo: 'text-red-600',
  na: 'text-muted-foreground',
};

export const SEMAFORO_BAR_CLASS: Record<Semaforo, string> = {
  verde: '[&>div]:bg-emerald-500',
  amarillo: '[&>div]:bg-amber-500',
  rojo: '[&>div]:bg-red-500',
  na: '[&>div]:bg-muted-foreground/40',
};

export function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export interface EmpleadoStats {
  empleado: Empleado;
  antiguedadSemanas: number;
  madurez: MadurezInfo;
  evaluacionesAsc: Evaluacion[]; // ordenadas por fecha ascendente
  ultimaEvaluacion: Evaluacion | null;
  pctCompetencias: number | null;
  pctEficiencia: number | null;
  semanasSinEvaluar: number | null;
  alerta: boolean; // sin evaluación en 2+ semanas
}

/** Arma las estadísticas de roster para un empleado a partir de todas las evaluaciones de la org. */
export function buildEmpleadoStats(empleado: Empleado, todasLasEvaluaciones: Evaluacion[]): EmpleadoStats {
  const fechaIngreso = empleado.fechaIngreso.toDate();
  const antiguedadSemanas = semanasEntre(fechaIngreso);
  const madurez = getMadurez(antiguedadSemanas);

  const evaluacionesAsc = todasLasEvaluaciones
    .filter((e) => e.empleadoId === empleado.id)
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const ultimaEvaluacion = evaluacionesAsc.length ? evaluacionesAsc[evaluacionesAsc.length - 1] : null;
  const pctCompetencias = ultimaEvaluacion?.promedioGeneral ?? null;
  const logro = ultimaEvaluacion?.eficiencia?.logro;
  const pctEficiencia = typeof logro === 'number' ? logro : null;

  const semanasSinEvaluar = ultimaEvaluacion
    ? semanasEntre(new Date(ultimaEvaluacion.fecha + 'T00:00:00'))
    : antiguedadSemanas;
  const alerta = semanasSinEvaluar >= 2;

  return {
    empleado,
    antiguedadSemanas,
    madurez,
    evaluacionesAsc,
    ultimaEvaluacion,
    pctCompetencias,
    pctEficiencia,
    semanasSinEvaluar,
    alerta,
  };
}

export interface PuntoCurva {
  semana: number;
  pct: number;
  fecha: string;
}

/** Curva de aprendizaje: % de competencias vs. semanas de antigüedad, una por evaluación. */
export function curvaAprendizaje(empleado: Empleado, evaluacionesAsc: Evaluacion[]): PuntoCurva[] {
  const fechaIngreso = empleado.fechaIngreso.toDate();
  return evaluacionesAsc
    .filter((e) => typeof e.promedioGeneral === 'number')
    .map((e) => ({
      semana: semanasEntre(fechaIngreso, new Date(e.fecha + 'T00:00:00')),
      pct: e.promedioGeneral as number,
      fecha: e.fecha,
    }));
}

/* ── Matriz de capacitación (temas de ejemplo del brief §3.4; configurable a futuro) ── */
export interface CategoriaCapacitacion {
  categoria: string;
  temas: string[];
}

export const CAPACITACION_CATEGORIAS: CategoriaCapacitacion[] = [
  {
    categoria: 'Coaching / Herramientas',
    temas: ['CRM', 'Guion de venta', 'Manejo de objeciones', 'Escucha activa'],
  },
  {
    categoria: 'Institucionales',
    temas: ['Código de conducta', 'Políticas de la empresa', 'Seguridad de la información'],
  },
  {
    categoria: 'Técnicos',
    temas: ['Producto / catálogo', 'Sistema interno', 'Reportes y KPIs'],
  },
];

/** Checks de capacitación guardados en `custom_fields.capacitacion` del empleado. */
export function getCapacitacion(empleado: Empleado): Record<string, boolean> {
  return (empleado.customFields?.capacitacion as Record<string, boolean>) ?? {};
}

/** Persiste (o quita) un check de capacitación para un empleado en `custom_fields`. */
export async function setCapacitacion(empleado: Empleado, tema: string, checked: boolean): Promise<void> {
  const capacitacion = { ...getCapacitacion(empleado), [tema]: checked };
  await updateEmpleado(empleado.id, {
    customFields: { ...(empleado.customFields ?? {}), capacitacion },
  });
}
