'use client';

import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/teamx/org';
import { getUltimaEvaluacion } from '@/lib/teamx/evaluacion';
import { Dimension, pctDimension } from '@/types/teamx';

/* ── Tipos ───────────────────────────────────────────────────────────────── */

export type EstadoSesion = 'programada' | 'en_curso' | 'completada' | 'cancelada';

export type OrigenAgenda = 'aspecto_bajo' | 'dimension_baja' | 'tarea_pendiente' | 'manual';

export interface AgendaItem {
  id: string;
  texto: string;
  origen: OrigenAgenda;
  hecho: boolean;
}

export interface NotasSesion {
  revision: string;
  observaciones: string;
  acuerdos: string;
  proximosPasos: string;
  reflexionCoachee: string;
}

export const NOTAS_VACIAS: NotasSesion = {
  revision: '', observaciones: '', acuerdos: '', proximosPasos: '', reflexionCoachee: '',
};

export type EstadoAcuerdo = 'pendiente' | 'cumplido' | 'no_cumplido';

export interface Acuerdo {
  id: string;
  texto: string;
  estado: EstadoAcuerdo;
  fecha?: string;
}

export interface Sesion {
  id: string;
  organizacionId: string;
  empleadoId: string;
  coachId: string | null;
  evaluacionId: string | null;
  fecha: string; // ISO date
  duracionMin: number | null;
  estado: EstadoSesion;
  agenda: AgendaItem[];
  notas: NotasSesion;
  acuerdos: Acuerdo[];
  createdAt?: string;
  updatedAt?: string;
}

export type EstadoTarea = 'pendiente' | 'en_progreso' | 'completada';

export interface Tarea {
  id: string;
  organizacionId: string;
  empleadoId: string;
  evaluacionId: string | null;
  aspectoId: string | null;
  descripcion: string;
  responsable: string | null;
  fechaLimite: string | null;
  estado: EstadoTarea;
  createdAt?: string;
}

/* ── Mapeo fila → tipo ───────────────────────────────────────────────────── */

function rowToSesion(row: any): Sesion {
  return {
    id: row.id,
    organizacionId: row.organizacion_id,
    empleadoId: row.empleado_id,
    coachId: row.coach_id ?? null,
    evaluacionId: row.evaluacion_id ?? null,
    fecha: row.fecha,
    duracionMin: row.duracion_min ?? null,
    estado: row.estado,
    agenda: Array.isArray(row.agenda) ? row.agenda : [],
    notas: { ...NOTAS_VACIAS, ...(row.notas ?? {}) },
    acuerdos: Array.isArray(row.acuerdos) ? row.acuerdos : [],
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

function rowToTarea(row: any): Tarea {
  return {
    id: row.id,
    organizacionId: row.organizacion_id,
    empleadoId: row.empleado_id,
    evaluacionId: row.evaluacion_id ?? null,
    aspectoId: row.aspecto_id ?? null,
    descripcion: row.descripcion,
    responsable: row.responsable ?? null,
    fechaLimite: row.fecha_limite ?? null,
    estado: row.estado,
    createdAt: row.created_at ?? undefined,
  };
}

/* ── Tareas ──────────────────────────────────────────────────────────────── */

/** Tareas de la organización activa. Filtra por empleado y/o excluye completadas. */
export async function listTareas(opts?: { empleadoId?: string; soloPendientes?: boolean }): Promise<Tarea[]> {
  const supabase = createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) return [];
  let q = supabase.from('teamx_tareas').select('*').eq('organizacion_id', orgId);
  if (opts?.empleadoId) q = q.eq('empleado_id', opts.empleadoId);
  if (opts?.soloPendientes) q = q.neq('estado', 'completada');
  const { data, error } = await q.order('fecha_limite', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
  if (error) { console.error('Error al listar tareas:', error); throw error; }
  return (data ?? []).map(rowToTarea);
}

export async function crearTarea(input: {
  empleadoId: string;
  descripcion: string;
  responsable?: string | null;
  fechaLimite?: string | null;
  evaluacionId?: string | null;
  aspectoId?: string | null;
}): Promise<string> {
  const supabase = createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error('No hay organización activa');
  const { data, error } = await supabase.from('teamx_tareas').insert({
    organizacion_id: orgId,
    empleado_id: input.empleadoId,
    evaluacion_id: input.evaluacionId ?? null,
    aspecto_id: input.aspectoId ?? null,
    descripcion: input.descripcion,
    responsable: input.responsable ?? null,
    fecha_limite: input.fechaLimite ?? null,
    estado: 'pendiente',
  }).select('id').single();
  if (error) { console.error('Error al crear tarea:', error); throw error; }
  return data.id;
}

export async function actualizarTarea(id: string, patch: {
  descripcion?: string;
  responsable?: string | null;
  fechaLimite?: string | null;
  estado?: EstadoTarea;
}): Promise<void> {
  const supabase = createClient();
  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if (patch.descripcion !== undefined) update.descripcion = patch.descripcion;
  if (patch.responsable !== undefined) update.responsable = patch.responsable;
  if (patch.fechaLimite !== undefined) update.fecha_limite = patch.fechaLimite;
  if (patch.estado !== undefined) update.estado = patch.estado;
  const { error } = await supabase.from('teamx_tareas').update(update).eq('id', id);
  if (error) { console.error('Error al actualizar tarea:', error); throw error; }
}

/* ── Agenda auto-generada ────────────────────────────────────────────────── */

/**
 * Agenda sugerida para la próxima sesión de un empleado:
 * dimensiones con menor % en la última evaluación, aspectos que bajaron vs la
 * evaluación anterior a esa, y tareas pendientes (carry-forward).
 */
export async function generarAgendaAuto(empleadoId: string): Promise<AgendaItem[]> {
  const items: AgendaItem[] = [];
  let seq = 0;
  const nextId = () => `auto-${Date.now()}-${seq++}`;

  try {
    const ultima = await getUltimaEvaluacion(empleadoId);
    if (ultima) {
      const dims: Dimension[] = ultima.configSnapshot?.dimensiones ?? [];
      const competencias = dims.filter((d) => d.naturaleza === 'competencia');

      const conPct = competencias
        .map((d) => ({ d, pct: pctDimension(d, ultima.respuestas) }))
        .filter((x): x is { d: Dimension; pct: number } => x.pct !== null)
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 2);
      for (const { d, pct } of conPct) {
        items.push({ id: nextId(), texto: `Reforzar "${d.nombre}" (${pct}% en la última evaluación)`, origen: 'dimension_baja', hecho: false });
      }

      const anterior = await getUltimaEvaluacion(empleadoId, ultima.id);
      if (anterior) {
        const nombreAspecto = new Map<string, string>();
        for (const d of dims) for (const a of d.aspectos) nombreAspecto.set(a.id, a.nombre);
        for (const [aspectoId, resp] of Object.entries(ultima.respuestas ?? {})) {
          const prev = anterior.respuestas?.[aspectoId];
          if (!prev || prev.na || prev.valor === null || prev.valor === undefined) continue;
          if (!resp || resp.na || resp.valor === null || resp.valor === undefined) continue;
          if (resp.valor < prev.valor) {
            const nombre = nombreAspecto.get(aspectoId) ?? 'este aspecto';
            items.push({ id: nextId(), texto: `Retomar "${nombre}": bajó respecto a la evaluación anterior`, origen: 'aspecto_bajo', hecho: false });
          }
        }
      }
    }
  } catch (e) {
    console.error('No se pudo generar la agenda automática desde evaluaciones:', e);
  }

  try {
    const pendientes = await listTareas({ empleadoId, soloPendientes: true });
    for (const t of pendientes) {
      items.push({ id: nextId(), texto: `Tarea pendiente: ${t.descripcion}`, origen: 'tarea_pendiente', hecho: false });
    }
  } catch (e) {
    console.error('No se pudieron cargar las tareas pendientes para la agenda:', e);
  }

  return items;
}

/* ── Sesiones ────────────────────────────────────────────────────────────── */

export async function listSesiones(): Promise<Sesion[]> {
  const supabase = createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) return [];
  const { data, error } = await supabase.from('teamx_sesiones').select('*')
    .eq('organizacion_id', orgId)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) { console.error('Error al listar sesiones:', error); throw error; }
  return (data ?? []).map(rowToSesion);
}

export async function getSesion(id: string): Promise<Sesion | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from('teamx_sesiones').select('*').eq('id', id).maybeSingle();
  if (error) { console.error('Error al obtener sesión:', error); throw error; }
  return data ? rowToSesion(data) : null;
}

/** Crea una sesión con agenda auto-generada a partir de la última evaluación y tareas pendientes. */
export async function crearSesion(input: { empleadoId: string; fecha: string }): Promise<string> {
  const supabase = createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error('No hay organización activa');
  const { data: { user } } = await supabase.auth.getUser();

  const [ultima, agenda] = await Promise.all([
    getUltimaEvaluacion(input.empleadoId).catch(() => null),
    generarAgendaAuto(input.empleadoId),
  ]);

  const { data, error } = await supabase.from('teamx_sesiones').insert({
    organizacion_id: orgId,
    empleado_id: input.empleadoId,
    coach_id: user?.id ?? null,
    evaluacion_id: ultima?.id ?? null,
    fecha: input.fecha,
    estado: 'programada',
    agenda,
    notas: NOTAS_VACIAS,
    acuerdos: [],
  }).select('id').single();

  if (error) { console.error('Error al crear sesión:', error); throw error; }
  return data.id;
}

/** Autosave del editor de sesión. */
export async function guardarSesion(id: string, patch: {
  fecha?: string;
  estado?: EstadoSesion;
  duracionMin?: number | null;
  agenda?: AgendaItem[];
  notas?: NotasSesion;
  acuerdos?: Acuerdo[];
}): Promise<void> {
  const supabase = createClient();
  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if (patch.fecha !== undefined) update.fecha = patch.fecha;
  if (patch.estado !== undefined) update.estado = patch.estado;
  if (patch.duracionMin !== undefined) update.duracion_min = patch.duracionMin;
  if (patch.agenda !== undefined) update.agenda = patch.agenda;
  if (patch.notas !== undefined) update.notas = patch.notas;
  if (patch.acuerdos !== undefined) update.acuerdos = patch.acuerdos;
  const { error } = await supabase.from('teamx_sesiones').update(update).eq('id', id);
  if (error) { console.error('Error al guardar sesión:', error); throw error; }
}

export async function eliminarSesion(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('teamx_sesiones').delete().eq('id', id);
  if (error) { console.error('Error al eliminar sesión:', error); throw error; }
}
