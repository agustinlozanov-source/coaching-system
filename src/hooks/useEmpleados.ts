'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/teamx/org';
import { Timestamp } from '@/lib/firestore-compat';
import { Empleado, EmpleadoFormData } from '@/types/empleado';

const TABLE = 'teamx_empleados';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** coach_asignado es uuid (FK a perfiles): solo acepta un uuid válido, si no → null. */
function asUuidOrNull(v: unknown): string | null {
  return typeof v === 'string' && UUID_RE.test(v) ? v : null;
}

/** Miembros de la organización activa, para elegir coach. */
export async function getCoaches(): Promise<{ id: string; nombre: string }[]> {
  const supabase = createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) return [];
  const { data, error } = await supabase
    .from('miembros_organizacion')
    .select('user_id, perfiles(nombre, apellido)')
    .eq('organizacion_id', orgId);
  if (error) {
    console.error('Error al obtener coaches:', error);
    return [];
  }
  return (data ?? []).map((m: any) => ({
    id: m.user_id as string,
    nombre: [m.perfiles?.nombre, m.perfiles?.apellido].filter(Boolean).join(' ') || 'Sin nombre',
  }));
}

function rowToEmpleado(row: any): Empleado {
  return {
    id: row.id,
    organizationId: row.organizacion_id,
    consecutivo: row.consecutivo,
    nombre: row.nombre,
    cargo: row.cargo ?? '',
    categorias: row.categorias ?? {},
    departamentoId: row.departamento_id ?? undefined,
    coachAsignado: row.coach_asignado ?? undefined,
    email: row.email ?? undefined,
    telefono: row.telefono ?? undefined,
    photoURL: row.photo_url ?? undefined,
    fechaIngreso: Timestamp.fromISO(row.fecha_ingreso) ?? Timestamp.now(),
    activo: row.activo,
    customFields: row.custom_fields ?? {},
    createdAt: Timestamp.fromISO(row.created_at) ?? Timestamp.now(),
    updatedAt: Timestamp.fromISO(row.updated_at) ?? Timestamp.now(),
  };
}

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getEmpleados(): Promise<Empleado[]> {
  const supabase = createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organizacion_id', orgId)
    .eq('activo', true)
    .order('nombre', { ascending: true });
  if (error) {
    console.error('Error al obtener empleados:', error);
    throw error;
  }
  return (data ?? []).map(rowToEmpleado);
}

export async function getEmpleadoById(id: string): Promise<Empleado | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) {
    console.error('Error al obtener empleado:', error);
    throw error;
  }
  return data ? rowToEmpleado(data) : null;
}

export async function createEmpleado(data: EmpleadoFormData): Promise<string> {
  const supabase = createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error('No hay organización activa');

  // Consecutivo = max + 1 dentro de la organización
  const { data: maxRow } = await supabase
    .from(TABLE)
    .select('consecutivo')
    .eq('organizacion_id', orgId)
    .order('consecutivo', { ascending: false })
    .limit(1)
    .maybeSingle();
  const consecutivo = (maxRow?.consecutivo ?? 0) + 1;

  const { data: inserted, error } = await supabase
    .from(TABLE)
    .insert({
      organizacion_id: orgId,
      consecutivo,
      nombre: data.nombre,
      cargo: data.cargo,
      categorias: data.categorias ?? {},
      departamento_id: data.departamentoId ?? null,
      fecha_ingreso: dateOnly(data.fechaIngreso),
      activo: data.activo,
      coach_asignado: asUuidOrNull(data.coachAsignado),
      email: data.email ?? null,
      telefono: data.telefono ?? null,
      custom_fields: data.customFields ?? {},
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error al crear empleado:', error);
    throw error;
  }
  return inserted.id;
}

export async function updateEmpleado(id: string, data: Partial<EmpleadoFormData>): Promise<void> {
  const supabase = createClient();
  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if (data.nombre !== undefined) update.nombre = data.nombre;
  if (data.cargo !== undefined) update.cargo = data.cargo;
  if (data.categorias !== undefined) update.categorias = data.categorias;
  if (data.departamentoId !== undefined) update.departamento_id = data.departamentoId ?? null;
  if (data.activo !== undefined) update.activo = data.activo;
  if (data.coachAsignado !== undefined) update.coach_asignado = asUuidOrNull(data.coachAsignado);
  if (data.email !== undefined) update.email = data.email ?? null;
  if (data.telefono !== undefined) update.telefono = data.telefono ?? null;
  if (data.customFields !== undefined) update.custom_fields = data.customFields;
  if (data.fechaIngreso) update.fecha_ingreso = dateOnly(data.fechaIngreso);

  const { error } = await supabase.from(TABLE).update(update).eq('id', id);
  if (error) {
    console.error('Error al actualizar empleado:', error);
    throw error;
  }
}

export async function deleteEmpleado(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    console.error('Error al eliminar empleado:', error);
    throw error;
  }
}

/** Lista de empleados en tiempo real (Supabase Realtime). */
export function useEmpleadosRealtime(): Empleado[] {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    const load = async () => {
      try {
        const data = await getEmpleados();
        if (active) setEmpleados(data);
      } catch {
        if (active) setEmpleados([]);
      }
    };
    load();

    const channel = supabase
      .channel('teamx_empleados_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, () => load())
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return empleados;
}

export function useEmpleados() {
  return {
    getEmpleados,
    getEmpleadoById,
    createEmpleado,
    updateEmpleado,
    deleteEmpleado,
  };
}
