'use client';

import { createClient } from '@/lib/supabase/client';

/**
 * Resuelve la organización activa del usuario.
 * Preferencia: cookie `sx_active_org` (si sigue siendo una membresía válida),
 * si no, primera membresía (prefiere rol "dueno"). La cookie la lee también el
 * servidor (dashboard) para mantener la selección consistente en toda la app.
 */
const COOKIE = 'sx_active_org';
let cachedOrgId: string | null = null;

function readOrgCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)sx_active_org=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function writeOrgCookie(orgId: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE}=${encodeURIComponent(orgId)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export async function getActiveOrgId(): Promise<string | null> {
  if (cachedOrgId) return cachedOrgId;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('miembros_organizacion')
    .select('organizacion_id, rol_en_org, estado')
    .eq('user_id', user.id);
  if (error || !data || data.length === 0) return null;

  const activos = data.filter((m) => m.estado === 'activo' || m.estado === 'activa');
  const pool = activos.length ? activos : data;
  const ids = pool.map((m) => m.organizacion_id as string);

  const cookieId = readOrgCookie();
  const dueno = pool.find((m) => m.rol_en_org === 'dueno');
  const chosen = (cookieId && ids.includes(cookieId))
    ? cookieId
    : ((dueno ?? pool[0]).organizacion_id as string);

  cachedOrgId = chosen;
  writeOrgCookie(chosen);
  return chosen;
}

export function setActiveOrgId(orgId: string) {
  cachedOrgId = orgId;
  writeOrgCookie(orgId);
}

export function clearActiveOrgId() {
  cachedOrgId = null;
}
