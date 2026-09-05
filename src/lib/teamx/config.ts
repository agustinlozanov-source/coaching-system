'use client';

import { createClient } from '@/lib/supabase/client';

/** Guarda (upsert) la configuración de TeamX de una organización. */
export async function saveConfiguracion(orgId: string, configuracion: any): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('teamx_config')
    .upsert(
      { organizacion_id: orgId, configuracion, updated_at: new Date().toISOString() },
      { onConflict: 'organizacion_id' },
    );
  if (error) throw error;
}

/** Carga las secciones de competencias (filas crudas) de una organización. */
export async function loadSeccionesRaw(orgId: string): Promise<any[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('teamx_secciones_competencias')
    .select('*')
    .eq('organizacion_id', orgId)
    .order('orden', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Crea o actualiza una sección de competencias. Devuelve el id real. */
export async function saveSeccion(orgId: string, section: any): Promise<string> {
  const supabase = createClient();
  const payload = {
    organizacion_id: orgId,
    nombre: section.nombre,
    descripcion: section.descripcion ?? null,
    orden: section.orden ?? 0,
    activo: section.activo ?? true,
    competencias: section.competencias ?? [],
    updated_at: new Date().toISOString(),
  };
  const esReal = section.id && !String(section.id).startsWith('seccion-');
  if (esReal) {
    const { error } = await supabase
      .from('teamx_secciones_competencias')
      .update(payload)
      .eq('id', section.id);
    if (error) throw error;
    return section.id;
  }
  const { data, error } = await supabase
    .from('teamx_secciones_competencias')
    .insert(payload)
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}
