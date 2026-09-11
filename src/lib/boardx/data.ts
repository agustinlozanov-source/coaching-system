'use client';

import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/teamx/org';
import type { Acuerdo, Asiento, Board, Indicador, Reunion } from '@/types/boardx';

// ── Mapeos ─────────────────────────────────────────────────────────────
const mapBoard = (r: any): Board => ({
  id: r.id, organizacionId: r.organizacion_id, nombre: r.nombre,
  valores: r.valores ?? [], config: r.config ?? {},
});
const mapAsiento = (r: any): Asiento => ({
  id: r.id, boardId: r.board_id, nombre: r.nombre, rol: r.rol, especializacion: r.especializacion,
  nivelTecnico: r.nivel_tecnico, tipo: r.tipo, orden: r.orden, consultora: r.consultora,
  email: r.email, telefono: r.telefono, fotoUrl: r.foto_url, personales: r.personales ?? {},
});
const mapReunion = (r: any): Reunion => ({
  id: r.id, boardId: r.board_id, nombre: r.nombre, round: r.round, tematica: r.tematica,
  kpiPrincipal: r.kpi_principal, fecha: r.fecha, modalidad: r.modalidad, estado: r.estado,
  agenda: r.agenda ?? [], asistencia: r.asistencia ?? {},
});
const mapIndicador = (r: any): Indicador => ({
  id: r.id, boardId: r.board_id, dimension: r.dimension, nombre: r.nombre,
  valorActual: r.valor_actual, meta: r.meta, unidad: r.unidad, direccion: r.direccion,
  responsable: r.responsable, orden: r.orden,
});
const mapAcuerdo = (r: any): Acuerdo => ({
  id: r.id, boardId: r.board_id, reunionId: r.reunion_id, indicadorId: r.indicador_id,
  asientoId: r.asiento_id, texto: r.texto, tipo: r.tipo, prioridad: r.prioridad,
  clasificacion: r.clasificacion, responsable: r.responsable, fechaCompromiso: r.fecha_compromiso,
  estado: r.estado, evidencia: r.evidencia,
});

// ── Board ──────────────────────────────────────────────────────────────
export async function getOrCreateBoard(): Promise<Board | null> {
  const supabase = createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) return null;

  const { data: existing } = await supabase.from('boardx_boards').select('*').eq('organizacion_id', orgId).maybeSingle();
  if (existing) return mapBoard(existing);

  const { data: created, error } = await supabase
    .from('boardx_boards')
    .insert({ organizacion_id: orgId })
    .select('*')
    .single();
  if (error) throw error;
  return mapBoard(created);
}

export async function updateBoard(id: string, patch: Partial<Pick<Board, 'nombre' | 'valores' | 'config'>>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('boardx_boards').update(patch).eq('id', id);
  if (error) throw error;
}

// ── Asientos ───────────────────────────────────────────────────────────
export async function listAsientos(boardId: string): Promise<Asiento[]> {
  const supabase = createClient();
  const { data } = await supabase.from('boardx_asientos').select('*').eq('board_id', boardId).order('orden').order('created_at');
  return (data ?? []).map(mapAsiento);
}
export async function crearAsiento(boardId: string, a: Partial<Asiento>): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.from('boardx_asientos').insert({
    board_id: boardId, nombre: a.nombre, rol: a.rol, especializacion: a.especializacion,
    nivel_tecnico: a.nivelTecnico, tipo: a.tipo ?? 'externo', orden: a.orden ?? 0,
    consultora: a.consultora, email: a.email, telefono: a.telefono, personales: a.personales ?? {},
  }).select('id').single();
  if (error) throw error;
  return data.id;
}
export async function actualizarAsiento(id: string, a: Partial<Asiento>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('boardx_asientos').update({
    nombre: a.nombre, rol: a.rol, especializacion: a.especializacion, nivel_tecnico: a.nivelTecnico,
    tipo: a.tipo, orden: a.orden, consultora: a.consultora, email: a.email, telefono: a.telefono,
    personales: a.personales,
  }).eq('id', id);
  if (error) throw error;
}
export async function eliminarAsiento(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('boardx_asientos').delete().eq('id', id);
}

// ── Reuniones ──────────────────────────────────────────────────────────
export async function listReuniones(boardId: string): Promise<Reunion[]> {
  const supabase = createClient();
  const { data } = await supabase.from('boardx_reuniones').select('*').eq('board_id', boardId).order('fecha', { ascending: false }).order('created_at', { ascending: false });
  return (data ?? []).map(mapReunion);
}
export async function getReunion(id: string): Promise<Reunion | null> {
  const supabase = createClient();
  const { data } = await supabase.from('boardx_reuniones').select('*').eq('id', id).maybeSingle();
  return data ? mapReunion(data) : null;
}
export async function crearReunion(boardId: string, r: Partial<Reunion>): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.from('boardx_reuniones').insert({
    board_id: boardId, nombre: r.nombre, round: r.round, tematica: r.tematica,
    kpi_principal: r.kpiPrincipal, fecha: r.fecha, modalidad: r.modalidad ?? 'presencial',
    agenda: r.agenda ?? [],
  }).select('id').single();
  if (error) throw error;
  return data.id;
}
export async function actualizarReunion(id: string, r: Partial<Reunion>): Promise<void> {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (r.nombre !== undefined) patch.nombre = r.nombre;
  if (r.round !== undefined) patch.round = r.round;
  if (r.tematica !== undefined) patch.tematica = r.tematica;
  if (r.kpiPrincipal !== undefined) patch.kpi_principal = r.kpiPrincipal;
  if (r.fecha !== undefined) patch.fecha = r.fecha;
  if (r.modalidad !== undefined) patch.modalidad = r.modalidad;
  if (r.estado !== undefined) patch.estado = r.estado;
  if (r.agenda !== undefined) patch.agenda = r.agenda;
  if (r.asistencia !== undefined) patch.asistencia = r.asistencia;
  const { error } = await supabase.from('boardx_reuniones').update(patch).eq('id', id);
  if (error) throw error;
}

// ── Indicadores (scorecard) ────────────────────────────────────────────
export async function listIndicadores(boardId: string): Promise<Indicador[]> {
  const supabase = createClient();
  const { data } = await supabase.from('boardx_indicadores').select('*').eq('board_id', boardId).order('orden').order('created_at');
  return (data ?? []).map(mapIndicador);
}
export async function crearIndicador(boardId: string, i: Partial<Indicador>): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.from('boardx_indicadores').insert({
    board_id: boardId, dimension: i.dimension, nombre: i.nombre, valor_actual: i.valorActual ?? null,
    meta: i.meta ?? null, unidad: i.unidad, direccion: i.direccion ?? 'mayor', responsable: i.responsable, orden: i.orden ?? 0,
  }).select('id').single();
  if (error) throw error;
  return data.id;
}
export async function actualizarIndicador(id: string, i: Partial<Indicador>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('boardx_indicadores').update({
    dimension: i.dimension, nombre: i.nombre, valor_actual: i.valorActual, meta: i.meta,
    unidad: i.unidad, direccion: i.direccion, responsable: i.responsable, orden: i.orden,
  }).eq('id', id);
  if (error) throw error;
}
export async function eliminarIndicador(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('boardx_indicadores').delete().eq('id', id);
}

// ── Acuerdos ───────────────────────────────────────────────────────────
export async function listAcuerdos(boardId: string): Promise<Acuerdo[]> {
  const supabase = createClient();
  const { data } = await supabase.from('boardx_acuerdos').select('*').eq('board_id', boardId).order('created_at', { ascending: false });
  return (data ?? []).map(mapAcuerdo);
}
export async function crearAcuerdo(boardId: string, a: Partial<Acuerdo>): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.from('boardx_acuerdos').insert({
    board_id: boardId, reunion_id: a.reunionId ?? null, indicador_id: a.indicadorId ?? null,
    asiento_id: a.asientoId ?? null, texto: a.texto, tipo: a.tipo ?? 'reunion',
    prioridad: a.prioridad ?? 'media', clasificacion: a.clasificacion, responsable: a.responsable,
    fecha_compromiso: a.fechaCompromiso ?? null, estado: a.estado ?? 'pendiente', evidencia: a.evidencia,
  }).select('id').single();
  if (error) throw error;
  return data.id;
}
export async function actualizarAcuerdo(id: string, a: Partial<Acuerdo>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('boardx_acuerdos').update({
    reunion_id: a.reunionId, indicador_id: a.indicadorId, asiento_id: a.asientoId, texto: a.texto,
    tipo: a.tipo, prioridad: a.prioridad, clasificacion: a.clasificacion, responsable: a.responsable,
    fecha_compromiso: a.fechaCompromiso, estado: a.estado, evidencia: a.evidencia,
  }).eq('id', id);
  if (error) throw error;
}
export async function eliminarAcuerdo(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('boardx_acuerdos').delete().eq('id', id);
}
