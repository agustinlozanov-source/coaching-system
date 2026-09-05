'use client';

import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/teamx/org';
import { Timestamp } from '@/lib/firestore-compat';
import { Evaluacion, EvaluacionFormData } from '@/types/evaluacion';
import {
  calcularPromedioSeccion,
  calcularEfectividad,
  identificarAreasOportunidad,
  identificarFortalezas,
} from '@/lib/utils/calculations';

const TABLE = 'teamx_evaluaciones';

function rowToEvaluacion(row: any): Evaluacion {
  return {
    id: row.id,
    organizationId: row.organizacion_id,
    empleadoId: row.empleado_id,
    empleadoNombre: row.empleado_nombre ?? '',
    coachId: row.coach_id ?? '',
    coachNombre: row.coach_nombre ?? '',
    fecha: Timestamp.fromISO(row.fecha) ?? Timestamp.now(),
    status: row.status,
    secciones: row.secciones,
    promedioGeneral: Number(row.promedio_general ?? 0),
    efectividad: Number(row.efectividad ?? 0),
    areasOportunidad: row.areas_oportunidad ?? [],
    fortalezas: row.fortalezas ?? [],
    observacionesGenerales: row.observaciones_generales ?? undefined,
    compromisos: row.compromisos ?? [],
    proximaRevision: Timestamp.fromISO(row.proxima_revision),
    createdAt: Timestamp.fromISO(row.created_at) ?? Timestamp.now(),
    updatedAt: Timestamp.fromISO(row.updated_at) ?? Timestamp.now(),
  } as Evaluacion;
}

export async function getEvaluaciones(): Promise<Evaluacion[]> {
  const supabase = createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organizacion_id', orgId)
    .order('fecha', { ascending: false });
  if (error) {
    console.error('Error al obtener evaluaciones:', error);
    throw error;
  }
  return (data ?? []).map(rowToEvaluacion);
}

export async function getEvaluacionesByEmpleado(empleadoId: string): Promise<Evaluacion[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('empleado_id', empleadoId)
    .order('fecha', { ascending: false });
  if (error) {
    console.error('Error al obtener evaluaciones del empleado:', error);
    throw error;
  }
  return (data ?? []).map(rowToEvaluacion);
}

export async function getEvaluacionById(id: string): Promise<Evaluacion | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) {
    console.error('Error al obtener evaluación:', error);
    throw error;
  }
  return data ? rowToEvaluacion(data) : null;
}

/** Calcula promedios y métricas (lógica de negocio, sin cambios). */
function calcularMetricasEvaluacion(data: EvaluacionFormData) {
  const seccionesConPromedio = {
    planeacionOrganizacion: {
      items: data.secciones.planeacionOrganizacion,
      promedio: calcularPromedioSeccion(data.secciones.planeacionOrganizacion.map((i) => i.puntuacion)),
    },
    noNegociables: {
      items: data.secciones.noNegociables,
      promedio: calcularPromedioSeccion(data.secciones.noNegociables.map((i) => i.puntuacion)),
    },
    usoSistemas: {
      items: data.secciones.usoSistemas,
      promedio: calcularPromedioSeccion(data.secciones.usoSistemas.map((i) => i.puntuacion)),
    },
    conocimientoProducto: {
      items: data.secciones.conocimientoProducto,
      promedio: calcularPromedioSeccion(data.secciones.conocimientoProducto.map((i) => i.puntuacion)),
    },
  };

  const promedios = Object.values(seccionesConPromedio).map((s) => s.promedio);
  const promedioGeneral = promedios.reduce((a, b) => a + b, 0) / promedios.length;
  const efectividad = calcularEfectividad(promedioGeneral);
  const areasOportunidad = identificarAreasOportunidad(seccionesConPromedio);
  const fortalezas = identificarFortalezas(seccionesConPromedio);

  return {
    secciones: seccionesConPromedio,
    promedioGeneral: Math.round(promedioGeneral * 100) / 100,
    efectividad,
    areasOportunidad,
    fortalezas,
  };
}

async function getCoach(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay usuario autenticado');
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre')
    .eq('id', user.id)
    .maybeSingle();
  return { id: user.id, nombre: perfil?.nombre ?? user.email ?? '' };
}

export async function createEvaluacion(
  empleadoId: string,
  empleadoNombre: string,
  data: EvaluacionFormData,
): Promise<string> {
  const supabase = createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error('No hay organización activa');
  const coach = await getCoach(supabase);
  const metricas = calcularMetricasEvaluacion(data);

  const { data: inserted, error } = await supabase
    .from(TABLE)
    .insert({
      organizacion_id: orgId,
      empleado_id: empleadoId,
      empleado_nombre: empleadoNombre,
      coach_id: coach.id,
      coach_nombre: coach.nombre,
      fecha: data.fecha.toISOString(),
      status: 'finalizada',
      secciones: metricas.secciones,
      promedio_general: metricas.promedioGeneral,
      efectividad: metricas.efectividad,
      areas_oportunidad: metricas.areasOportunidad,
      fortalezas: metricas.fortalezas,
      observaciones_generales: data.observacionesGenerales ?? null,
      compromisos: data.compromisos ?? [],
      proxima_revision: data.proximaRevision ? data.proximaRevision.toISOString() : null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error al crear evaluación:', error);
    throw error;
  }
  return inserted.id;
}

export async function updateEvaluacion(id: string, data: Partial<EvaluacionFormData>): Promise<void> {
  const supabase = createClient();
  const update: Record<string, any> = { updated_at: new Date().toISOString() };

  if (data.secciones) {
    const metricas = calcularMetricasEvaluacion(data as EvaluacionFormData);
    update.secciones = metricas.secciones;
    update.promedio_general = metricas.promedioGeneral;
    update.efectividad = metricas.efectividad;
    update.areas_oportunidad = metricas.areasOportunidad;
    update.fortalezas = metricas.fortalezas;
  }
  if (data.fecha) update.fecha = data.fecha.toISOString();
  if (data.proximaRevision) update.proxima_revision = data.proximaRevision.toISOString();
  if (data.observacionesGenerales !== undefined)
    update.observaciones_generales = data.observacionesGenerales ?? null;
  if (data.compromisos !== undefined) update.compromisos = data.compromisos ?? [];

  const { error } = await supabase.from(TABLE).update(update).eq('id', id);
  if (error) {
    console.error('Error al actualizar evaluación:', error);
    throw error;
  }
}

export async function saveDraft(
  empleadoId: string,
  empleadoNombre: string,
  data: Partial<EvaluacionFormData>,
): Promise<string> {
  const supabase = createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error('No hay organización activa');
  const coach = await getCoach(supabase);

  const secciones = {
    planeacionOrganizacion: { items: data.secciones?.planeacionOrganizacion ?? [], promedio: 0 },
    noNegociables: { items: data.secciones?.noNegociables ?? [], promedio: 0 },
    usoSistemas: { items: data.secciones?.usoSistemas ?? [], promedio: 0 },
    conocimientoProducto: { items: data.secciones?.conocimientoProducto ?? [], promedio: 0 },
  };

  const { data: inserted, error } = await supabase
    .from(TABLE)
    .insert({
      organizacion_id: orgId,
      empleado_id: empleadoId,
      empleado_nombre: empleadoNombre,
      coach_id: coach.id,
      coach_nombre: coach.nombre,
      fecha: data.fecha ? data.fecha.toISOString() : new Date().toISOString(),
      status: 'borrador',
      secciones,
      promedio_general: 0,
      efectividad: 0,
      areas_oportunidad: [],
      fortalezas: [],
      observaciones_generales: data.observacionesGenerales ?? null,
      compromisos: data.compromisos ?? [],
      proxima_revision: data.proximaRevision ? data.proximaRevision.toISOString() : null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error al guardar borrador:', error);
    throw error;
  }
  return inserted.id;
}

export function useEvaluaciones() {
  return {
    getEvaluaciones,
    getEvaluacionesByEmpleado,
    getEvaluacionById,
    createEvaluacion,
    updateEvaluacion,
    saveDraft,
  };
}
