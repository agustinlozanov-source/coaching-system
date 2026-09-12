'use client';

import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/teamx/org';
import type { Diagnostico, PerfilContextual, Respuesta, Resultado, TipoEmpresa } from '@/types/scanx';
import { BANCO_VERSION } from './preguntas';
import { getContextoMercado } from './mercado';

function mapDiag(row: any): Diagnostico {
  return {
    id: row.id,
    organizacionId: row.organizacion_id,
    userId: row.user_id,
    nivel: row.nivel,
    estado: row.estado,
    perfil: (row.perfil ?? {}) as PerfilContextual,
    resultado: (row.resultado ?? null) as Resultado | null,
    tipoEmpresa: (row.tipo_empresa ?? null) as TipoEmpresa | null,
    financials: (row.financials ?? null) as Diagnostico['financials'],
    mercado: (row.mercado ?? null) as Diagnostico['mercado'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? null,
  };
}

/** Crea un diagnóstico N1 en la organización activa con el perfil contextual. */
export async function crearDiagnostico(perfil: PerfilContextual): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const orgId = await getActiveOrgId();
  if (!user || !orgId) throw new Error('Sin sesión u organización activa');

  const { data, error } = await supabase
    .from('scanx_diagnosticos')
    .insert({ organizacion_id: orgId, user_id: user.id, nivel: 1, perfil, banco_version: BANCO_VERSION, mercado: getContextoMercado(perfil) })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function getDiagnostico(id: string): Promise<Diagnostico | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from('scanx_diagnosticos').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapDiag(data);
}

export async function listDiagnosticos(): Promise<Diagnostico[]> {
  const supabase = createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) return [];
  const { data, error } = await supabase
    .from('scanx_diagnosticos')
    .select('*')
    .eq('organizacion_id', orgId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapDiag);
}

export async function actualizarPerfil(id: string, perfil: PerfilContextual): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('scanx_diagnosticos').update({ perfil }).eq('id', id);
  if (error) throw error;
}

export async function guardarFinancials(id: string, financials: unknown): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('scanx_diagnosticos').update({ financials }).eq('id', id);
  if (error) throw error;
}

export async function guardarMercado(id: string, mercado: unknown): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('scanx_diagnosticos').update({ mercado }).eq('id', id);
  if (error) throw error;
}

/** Guarda (o actualiza) la respuesta de una pregunta. Upsert por (diagnostico, pregunta). */
export async function guardarRespuesta(
  diagnosticoId: string,
  preguntaId: string,
  opcionId: string,
  pesos: Record<string, number>,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('scanx_respuestas')
    .upsert(
      { diagnostico_id: diagnosticoId, pregunta_id: preguntaId, opcion_id: opcionId, pesos },
      { onConflict: 'diagnostico_id,pregunta_id' },
    );
  if (error) throw error;
}

export async function guardarCerteza(diagnosticoId: string, preguntaId: string, certeza: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('scanx_respuestas').update({ certeza }).eq('diagnostico_id', diagnosticoId).eq('pregunta_id', preguntaId);
}

export async function getRespuestas(diagnosticoId: string): Promise<Respuesta[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('scanx_respuestas')
    .select('pregunta_id, opcion_id')
    .eq('diagnostico_id', diagnosticoId);
  if (error || !data) return [];
  return data.map((r) => ({ preguntaId: r.pregunta_id as string, opcionId: r.opcion_id as string }));
}

/** Marca el diagnóstico como completado y guarda el snapshot del resultado. */
export async function finalizarDiagnostico(id: string, resultado: Resultado): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('scanx_diagnosticos')
    .update({
      estado: 'completado',
      resultado,
      tipo_empresa: resultado.tipoEmpresa,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}
