'use client';

import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/teamx/org';
import {
  Aspecto, Ciclo, Dimension, Escala, ESCALA_DEFAULT, Evaluacion, Respuestas,
} from '@/types/teamx';

/* ── Escala ──────────────────────────────────────────────────────────────── */
export async function getEscala(orgId: string): Promise<Escala> {
  const supabase = createClient();
  const { data } = await supabase.from('teamx_escala').select('*').eq('organizacion_id', orgId).maybeSingle();
  if (!data) return ESCALA_DEFAULT;
  return { id: data.id, niveles: data.niveles ?? ESCALA_DEFAULT.niveles, permiteNa: data.permite_na ?? true };
}

/* ── Dimensiones + aspectos ──────────────────────────────────────────────── */
export async function getDimensiones(orgId: string, soloActivas = true): Promise<Dimension[]> {
  const supabase = createClient();
  let dq = supabase.from('teamx_dimensiones').select('*').eq('organizacion_id', orgId).order('orden');
  if (soloActivas) dq = dq.eq('activo', true);
  const { data: dims } = await dq;
  if (!dims?.length) return [];

  const ids = dims.map((d: any) => d.id);
  const { data: asp } = await supabase
    .from('teamx_aspectos').select('*').in('dimension_id', ids).eq('activo', true).order('orden');

  const porDim = new Map<string, Aspecto[]>();
  (asp ?? []).forEach((a: any) => {
    const arr = porDim.get(a.dimension_id) ?? [];
    arr.push({ id: a.id, nombre: a.nombre, descripcion: a.descripcion ?? undefined, evidencia: a.evidencia ?? undefined, orden: a.orden });
    porDim.set(a.dimension_id, arr);
  });

  return dims.map((d: any) => ({
    id: d.id, nombre: d.nombre, descripcion: d.descripcion ?? undefined,
    icono: d.icono ?? undefined, color: d.color ?? '#1aab99', peso: Number(d.peso ?? 1),
    orden: d.orden, naturaleza: d.naturaleza, activo: d.activo,
    aspectos: porDim.get(d.id) ?? [],
  }));
}

/* ── Ciclo activo ────────────────────────────────────────────────────────── */
export async function getCicloActivo(orgId: string): Promise<Ciclo | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('teamx_ciclos').select('*').eq('organizacion_id', orgId).eq('estado', 'activo')
    .order('fecha_inicio', { ascending: false }).limit(1).maybeSingle();
  if (!data) return null;
  return { id: data.id, nombre: data.nombre, fechaInicio: data.fecha_inicio, semanas: data.semanas, estado: data.estado };
}

/** Semana actual del ciclo (1..semanas) según la fecha. */
export function semanaDeCiclo(ciclo: Ciclo | null): number {
  if (!ciclo) return 1;
  const inicio = new Date(ciclo.fechaInicio + 'T00:00:00');
  const diff = Math.floor((Date.now() - inicio.getTime()) / (7 * 24 * 3600 * 1000));
  return Math.min(Math.max(diff + 1, 1), ciclo.semanas);
}

/* ── Mapear fila → Evaluacion ────────────────────────────────────────────── */
function rowToEval(row: any): Evaluacion {
  return {
    id: row.id, organizacionId: row.organizacion_id, empleadoId: row.empleado_id,
    coachId: row.coach_id ?? null, cicloId: row.ciclo_id ?? null, semana: row.semana ?? null,
    fecha: row.fecha, estado: row.estado, configSnapshot: row.config_snapshot ?? { dimensiones: [], escala: ESCALA_DEFAULT },
    respuestas: row.respuestas ?? {}, seguimiento: row.seguimiento ?? [], eficiencia: row.eficiencia ?? {},
    resumen: row.resumen ?? {}, promedioGeneral: row.promedio_general ?? null, firmas: row.firmas ?? {},
    evalAnteriorId: row.eval_anterior_id ?? null,
  };
}

/* ── Última evaluación de un empleado (para comparación) ─────────────────── */
export async function getUltimaEvaluacion(empleadoId: string, exceptId?: string): Promise<Evaluacion | null> {
  const supabase = createClient();
  let q = supabase.from('teamx_evaluaciones').select('*').eq('empleado_id', empleadoId)
    .order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(1);
  if (exceptId) q = q.neq('id', exceptId);
  const { data } = await q.maybeSingle();
  return data ? rowToEval(data) : null;
}

/* ── Crear evaluación (borrador con snapshot) ────────────────────────────── */
export async function crearEvaluacion(input: { empleadoId: string; semana: number; fecha: string }): Promise<string> {
  const supabase = createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error('No hay organización activa');
  const { data: { user } } = await supabase.auth.getUser();

  // Auto-configura la org con dimensiones/escala/ciclo por defecto si no las tiene.
  await supabase.rpc('teamx_seed_defaults', { p_org: orgId });

  const [dimensiones, escala, ciclo, anterior] = await Promise.all([
    getDimensiones(orgId),
    getEscala(orgId),
    getCicloActivo(orgId),
    getUltimaEvaluacion(input.empleadoId),
  ]);

  const { data, error } = await supabase.from('teamx_evaluaciones').insert({
    organizacion_id: orgId,
    empleado_id: input.empleadoId,
    coach_id: user?.id ?? null,
    ciclo_id: ciclo?.id ?? null,
    semana: input.semana,
    fecha: input.fecha,
    estado: 'borrador',
    config_snapshot: { dimensiones, escala },
    respuestas: {},
    eval_anterior_id: anterior?.id ?? null,
  }).select('id').single();

  if (error) { console.error('Error al crear evaluación:', error); throw error; }
  return data.id;
}

export async function getEvaluacion(id: string): Promise<Evaluacion | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from('teamx_evaluaciones').select('*').eq('id', id).maybeSingle();
  if (error) { console.error('Error al obtener evaluación:', error); throw error; }
  return data ? rowToEval(data) : null;
}

/* ── Guardar (autosave del borrador) ─────────────────────────────────────── */
export async function guardarEvaluacion(id: string, patch: {
  respuestas?: Respuestas;
  resumen?: Record<string, any>;
  promedioGeneral?: number | null;
  estado?: string;
  seguimiento?: any[];
  eficiencia?: Record<string, any>;
  firmas?: Record<string, any>;
}): Promise<void> {
  const supabase = createClient();
  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if (patch.respuestas !== undefined) update.respuestas = patch.respuestas;
  if (patch.resumen !== undefined) update.resumen = patch.resumen;
  if (patch.promedioGeneral !== undefined) update.promedio_general = patch.promedioGeneral;
  if (patch.estado !== undefined) update.estado = patch.estado;
  if (patch.seguimiento !== undefined) update.seguimiento = patch.seguimiento;
  if (patch.eficiencia !== undefined) update.eficiencia = patch.eficiencia;
  if (patch.firmas !== undefined) update.firmas = patch.firmas;
  const { error } = await supabase.from('teamx_evaluaciones').update(update).eq('id', id);
  if (error) { console.error('Error al guardar evaluación:', error); throw error; }
}

/* ── Listado ─────────────────────────────────────────────────────────────── */
export async function listEvaluaciones(): Promise<Evaluacion[]> {
  const supabase = createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) return [];
  const { data } = await supabase.from('teamx_evaluaciones').select('*')
    .eq('organizacion_id', orgId).order('fecha', { ascending: false });
  return (data ?? []).map(rowToEval);
}

export async function eliminarEvaluacion(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('teamx_evaluaciones').delete().eq('id', id);
  if (error) { console.error('Error al eliminar evaluación:', error); throw error; }
}
