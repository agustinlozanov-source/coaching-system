'use client';

// Helpers de cálculo para el módulo de Reportes de TEAMx (reporte individual y de equipo).
// No pega a Supabase: trabaja siempre sobre `Evaluacion[]` ya cargadas por
// `listEvaluaciones()` / `getEmpleados()`.

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Evaluacion, pctDimension } from '@/types/teamx';

/* ── Punto por evaluación (una fila del historial de un empleado) ──────────── */

export interface DimVal {
  id: string;
  nombre: string;
  color: string;
  pct: number | null;
}

export interface EvalPoint {
  id: string;
  fecha: string;
  semana: number | null;
  estado: string;
  promedioGeneral: number | null;
  eficiencia: number | null;
  dims: DimVal[];
}

export function toEvalPoint(ev: Evaluacion): EvalPoint {
  const dims = (ev.configSnapshot?.dimensiones ?? []).filter((d) => d.naturaleza === 'competencia');
  return {
    id: ev.id,
    fecha: ev.fecha,
    semana: ev.semana ?? null,
    estado: ev.estado,
    promedioGeneral: ev.promedioGeneral ?? null,
    eficiencia: typeof ev.eficiencia?.logro === 'number' ? ev.eficiencia.logro : null,
    dims: dims.map((d) => ({ id: d.id, nombre: d.nombre, color: d.color || '#1aab99', pct: pctDimension(d, ev.respuestas) })),
  };
}

/** Etiqueta corta para eje X: "Sem N" si hay semana de ciclo, si no la fecha dd/MM. */
export function labelEval(p: Pick<EvalPoint, 'fecha' | 'semana'>): string {
  if (p.semana != null) return `Sem ${p.semana}`;
  try {
    return format(new Date(p.fecha + 'T00:00:00'), 'dd/MM', { locale: es });
  } catch {
    return p.fecha;
  }
}

/* ── Tendencias (dirección de una serie de %) ───────────────────────────────── */

export type Direccion = 'sube' | 'baja' | 'estable' | 'sin-datos';

export interface Tendencia {
  delta: number | null;
  direccion: Direccion;
}

export function tendenciaSerie(vals: (number | null)[]): Tendencia {
  const conValor = vals.filter((v): v is number => v != null);
  if (conValor.length < 2) return { delta: null, direccion: 'sin-datos' };
  const delta = Math.round(conValor[conValor.length - 1] - conValor[0]);
  const direccion: Direccion = delta > 2 ? 'sube' : delta < -2 ? 'baja' : 'estable';
  return { delta, direccion };
}

/* ── Top / bottom aspectos de una evaluación puntual ────────────────────────── */

export interface AspectoValor {
  aspectoId: string;
  aspectoNombre: string;
  dimNombre: string;
  dimColor: string;
  valor: number;
}

function aspectosConValor(ev: Evaluacion): AspectoValor[] {
  const dims = (ev.configSnapshot?.dimensiones ?? []).filter((d) => d.naturaleza === 'competencia');
  const out: AspectoValor[] = [];
  for (const d of dims) {
    for (const a of d.aspectos) {
      const r = ev.respuestas?.[a.id];
      if (!r || r.na || r.valor === null || r.valor === undefined) continue;
      out.push({ aspectoId: a.id, aspectoNombre: a.nombre, dimNombre: d.nombre, dimColor: d.color || '#1aab99', valor: r.valor });
    }
  }
  return out;
}

export function topAspectos(ev: Evaluacion, n = 3): AspectoValor[] {
  return aspectosConValor(ev).sort((a, b) => b.valor - a.valor).slice(0, n);
}

export function bottomAspectos(ev: Evaluacion, n = 3): AspectoValor[] {
  return aspectosConValor(ev).sort((a, b) => a.valor - b.valor).slice(0, n);
}

/* ── Correlación (Pearson) competencias vs eficiencia ───────────────────────── */

export function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 2 || ys.length !== n) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
  }
  if (dx2 === 0 || dy2 === 0) return null;
  return num / Math.sqrt(dx2 * dy2);
}

/* ── Última evaluación por empleado (equipo) ─────────────────────────────────── */

/** Asume `evaluaciones` ordenadas por fecha desc (como devuelve listEvaluaciones()). */
export function ultimasPorEmpleado(evaluaciones: Evaluacion[]): Map<string, Evaluacion> {
  const map = new Map<string, Evaluacion>();
  for (const ev of evaluaciones) {
    if (!map.has(ev.empleadoId)) map.set(ev.empleadoId, ev);
  }
  return map;
}

export interface DimPromedio {
  id: string;
  nombre: string;
  color: string;
  pct: number;
}

export function promedioPorDimension(evaluaciones: Evaluacion[]): Record<string, DimPromedio> {
  const acc = new Map<string, { nombre: string; color: string; sum: number; n: number }>();
  for (const ev of evaluaciones) {
    const dims = (ev.configSnapshot?.dimensiones ?? []).filter((d) => d.naturaleza === 'competencia');
    for (const d of dims) {
      const pct = pctDimension(d, ev.respuestas);
      if (pct === null) continue;
      const cur = acc.get(d.id) ?? { nombre: d.nombre, color: d.color || '#1aab99', sum: 0, n: 0 };
      cur.sum += pct; cur.n += 1;
      acc.set(d.id, cur);
    }
  }
  const out: Record<string, DimPromedio> = {};
  acc.forEach((v, k) => { out[k] = { id: k, nombre: v.nombre, color: v.color, pct: Math.round(v.sum / v.n) }; });
  return out;
}

/* ── Evolución semanal del promedio de equipo ────────────────────────────────── */

export interface PuntoSemana {
  label: string;
  promedio: number;
  n: number;
}

export function evolucionSemanal(evaluaciones: Evaluacion[]): PuntoSemana[] {
  const grupos = new Map<string, { label: string; sum: number; n: number; minFecha: string }>();
  for (const ev of evaluaciones) {
    if (ev.promedioGeneral === null || ev.promedioGeneral === undefined) continue;
    const label = ev.semana != null ? `Sem ${ev.semana}` : ev.fecha;
    const cur = grupos.get(label) ?? { label, sum: 0, n: 0, minFecha: ev.fecha };
    cur.sum += ev.promedioGeneral; cur.n += 1;
    if (ev.fecha < cur.minFecha) cur.minFecha = ev.fecha;
    grupos.set(label, cur);
  }
  return Array.from(grupos.values())
    .sort((a, b) => a.minFecha.localeCompare(b.minFecha))
    .map((g) => ({ label: g.label, promedio: Math.round(g.sum / g.n), n: g.n }));
}

/* ── Tendencia por dimensión a nivel equipo (primera mitad vs segunda mitad) ── */

export interface TendenciaDimEquipo {
  id: string;
  nombre: string;
  color: string;
  early: number | null;
  late: number | null;
  delta: number | null;
  direccion: Direccion;
}

export function tendenciasEquipoPorDimension(evaluaciones: Evaluacion[]): TendenciaDimEquipo[] {
  const ordenadas = evaluaciones.slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (ordenadas.length < 2) return [];
  const mid = Math.ceil(ordenadas.length / 2);
  const earlyMap = promedioPorDimension(ordenadas.slice(0, mid));
  const lateMap = promedioPorDimension(ordenadas.slice(mid));

  const ids = new Set([...Object.keys(earlyMap), ...Object.keys(lateMap)]);
  const out: TendenciaDimEquipo[] = [];
  ids.forEach((id) => {
    const e = earlyMap[id];
    const l = lateMap[id];
    const nombre = (l ?? e)?.nombre ?? id;
    const color = (l ?? e)?.color ?? '#1aab99';
    const early = e?.pct ?? null;
    const late = l?.pct ?? null;
    const delta = early !== null && late !== null ? late - early : null;
    const direccion: Direccion = delta === null ? 'sin-datos' : delta > 2 ? 'sube' : delta < -2 ? 'baja' : 'estable';
    out.push({ id, nombre, color, early, late, delta, direccion });
  });
  return out.sort((a, b) => (b.delta ?? -999) - (a.delta ?? -999));
}

/* ── Semáforo de eficiencia (umbrales por defecto del brief maestro) ────────── */

export type Semaforo = 'verde' | 'amarillo' | 'rojo' | 'sin-datos';

export function semaforoEficiencia(logro: number | null | undefined): Semaforo {
  if (logro === null || logro === undefined) return 'sin-datos';
  if (logro > 95) return 'verde';
  if (logro >= 85) return 'amarillo';
  return 'rojo';
}

export const SEMAFORO_HEX: Record<Semaforo, string> = {
  verde: '#16a34a', amarillo: '#f59e0b', rojo: '#ef4444', 'sin-datos': '#9ca3af',
};

export const SEMAFORO_BADGE: Record<Semaforo, 'success' | 'warning' | 'destructive' | 'muted'> = {
  verde: 'success', amarillo: 'warning', rojo: 'destructive', 'sin-datos': 'muted',
};

export const SEMAFORO_LABEL: Record<Semaforo, string> = {
  verde: 'En meta', amarillo: 'Atención', rojo: 'Riesgo', 'sin-datos': 'Sin datos',
};

/* ── CSV (exportación de datos crudos) ───────────────────────────────────────── */

function toCsv(rows: (string | number | null)[][]): string {
  return rows
    .map((r) => r.map((c) => {
      const s = c === null || c === undefined ? '' : String(c);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','))
    .join('\n');
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function csvIndividual(empleadoNombre: string, points: EvalPoint[]): string {
  const dimNombres = Array.from(new Set(points.flatMap((p) => p.dims.map((d) => d.nombre))));
  const header = ['Empleado', 'Fecha', 'Semana', 'Estado', 'Promedio general %', 'Eficiencia %', ...dimNombres];
  const rows = points.map((p) => [
    empleadoNombre, p.fecha, p.semana, p.estado, p.promedioGeneral, p.eficiencia,
    ...dimNombres.map((nombre) => p.dims.find((d) => d.nombre === nombre)?.pct ?? ''),
  ]);
  return toCsv([header, ...rows]);
}

export interface FilaEquipoCsv {
  empleado: string;
  fecha: string;
  semana: number | null;
  estado: string;
  general: number | null;
  eficiencia: number | null;
}

export function csvEquipo(filas: FilaEquipoCsv[]): string {
  const header = ['Empleado', 'Fecha', 'Semana', 'Estado', 'Promedio general %', 'Eficiencia %'];
  const rows = filas.map((f) => [f.empleado, f.fecha, f.semana, f.estado, f.general, f.eficiencia]);
  return toCsv([header, ...rows]);
}
