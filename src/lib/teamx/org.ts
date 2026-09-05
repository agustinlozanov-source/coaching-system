'use client';

import { createClient } from '@/lib/supabase/client';

/**
 * Resuelve la organización activa del usuario para TeamX.
 * Por ahora: primera membresía (prefiere rol "dueno"). Más adelante:
 * selector de organización que guarde la preferencia.
 */
let cachedOrgId: string | null = null;

export async function getActiveOrgId(): Promise<string | null> {
  if (cachedOrgId) return cachedOrgId;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('miembros_organizacion')
    .select('organizacion_id, rol_en_org, estado')
    .eq('user_id', user.id);

  if (error || !data || data.length === 0) return null;

  const activos = data.filter((m) => m.estado === 'activo' || m.estado === 'activa');
  const pool = activos.length ? activos : data;
  const dueno = pool.find((m) => m.rol_en_org === 'dueno');
  cachedOrgId = (dueno ?? pool[0]).organizacion_id as string;
  return cachedOrgId;
}

export function setActiveOrgId(orgId: string) {
  cachedOrgId = orgId;
}

export function clearActiveOrgId() {
  cachedOrgId = null;
}
