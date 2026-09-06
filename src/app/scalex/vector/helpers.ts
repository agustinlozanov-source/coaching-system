import type { Direccion, SemaforoOState, Umbrales } from './types';

export const MESES_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatFechaCorta(d?: string | null): string {
  if (!d) return '—';
  const date = new Date(d + 'T12:00:00');
  return `${date.getDate()} ${MESES_ES[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatFechaMini(d?: string | null): string {
  if (!d) return '';
  const date = new Date(d + 'T12:00:00');
  return `${date.getDate()} ${MESES_ES[date.getMonth()]}`;
}

export function getAnioCalendar(fechaStr?: string | null): number | '' {
  if (!fechaStr) return '';
  return new Date(fechaStr + 'T12:00:00').getFullYear();
}

export function calcularSemanaDelAnio(fechaStr?: string | null): string {
  if (!fechaStr) return '';
  const date = new Date(fechaStr + 'T12:00:00');
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = (date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return 'sem ' + Math.ceil((diff + start.getDay() + 1) / 7);
}

/* Calcula el semáforo en el cliente antes de guardar (espejo de vector-trimestre.js) */
export function calcularSemaforo(valor: number, umbrales: Umbrales, direccion: Direccion): SemaforoOState {
  const v = valor;
  if (Number.isNaN(v)) return 'rojo';
  const { verde_alto: va, verde_bajo: vb, amarillo: am } = umbrales;

  if (direccion === 'mayor_es_mejor') {
    if (v >= va) return 'verde_alto';
    if (v >= vb) return 'verde_bajo';
    if (v >= am) return 'amarillo';
    return 'rojo';
  }
  if (v <= va) return 'verde_alto';
  if (v <= vb) return 'verde_bajo';
  if (v <= am) return 'amarillo';
  return 'rojo';
}

export const SEMAFORO_LABELS: Record<SemaforoOState, string> = {
  verde_alto: 'VERDE ALTO',
  verde_bajo: 'VERDE BAJO',
  amarillo: 'AMARILLO',
  rojo: 'ROJO',
  sin_medir: 'SIN MEDIR',
};

export const SEMAFORO_DOT: Record<SemaforoOState, string> = {
  verde_alto: 'bg-emerald-500',
  verde_bajo: 'bg-lime-500',
  amarillo: 'bg-amber-500',
  rojo: 'bg-red-500',
  sin_medir: 'bg-white/20',
};

export const SEMAFORO_TEXT: Record<SemaforoOState, string> = {
  verde_alto: 'text-emerald-400',
  verde_bajo: 'text-lime-400',
  amarillo: 'text-amber-400',
  rojo: 'text-red-400',
  sin_medir: 'text-white/40',
};

export const SEMAFORO_BORDER: Record<SemaforoOState, string> = {
  verde_alto: 'border-emerald-500',
  verde_bajo: 'border-lime-500',
  amarillo: 'border-amber-500',
  rojo: 'border-red-500',
  sin_medir: 'border-white/10',
};

export const SEMAFORO_BADGE: Record<SemaforoOState, string> = {
  verde_alto: 'bg-emerald-500/15 text-emerald-400',
  verde_bajo: 'bg-lime-500/15 text-lime-400',
  amarillo: 'bg-amber-500/15 text-amber-400',
  rojo: 'bg-red-500/15 text-red-400',
  sin_medir: 'bg-white/[0.06] text-white/40',
};

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}
