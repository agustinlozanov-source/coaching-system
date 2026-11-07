import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Control de acceso por App (entitlements).
 * El launcher muestra las cuatro tarjetas siempre (marketing), pero solo deja
 * ENTRAR a las apps que la organización activa tenga contratadas. El admin
 * global omite el gating.
 *
 * La organización se da de alta una sola vez en /scalex/admin/accesos y de ahí
 * en adelante lo único que cambia es qué apps tiene prendidas. No existe "la
 * organización de TEAMx" aparte de "la de SCALEx": es la misma, con distintas
 * casillas encendidas.
 */
export const APPS = ['scalex', 'teamx', 'boardx'] as const;
export type AppSlug = (typeof APPS)[number];

/** App requerida para una ruta protegida, o null si la ruta no exige entitlement. */
export function appDeRuta(pathname: string): AppSlug | null {
  if (pathname.startsWith('/scalex')) return 'scalex';
  if (pathname.startsWith('/dashboard')) return 'teamx';
  if (pathname.startsWith('/boardx')) return 'boardx';
  // SCANx no lleva entitlement a propósito: es la puerta de entrada gratuita.
  return null;
}

/** Apps activas (contratadas) de una organización. */
export async function appsActivasDeOrg(
  supabase: SupabaseClient,
  orgId: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from('org_herramientas')
    .select('herramienta, estado')
    .eq('organizacion_id', orgId)
    .in('estado', ['activa', 'activo']);
  return new Set((data ?? []).map((r) => r.herramienta as string));
}

/**
 * Resuelve la organización activa en el servidor (misma lógica que el cliente
 * getActiveOrgId): cookie sx_active_org si sigue siendo una membresía válida; si
 * no, la primera membresía (prefiere rol 'dueno').
 */
export async function resolveActiveOrgServer(
  supabase: SupabaseClient,
  userId: string,
  cookieOrgId: string | null,
): Promise<string | null> {
  const { data } = await supabase
    .from('miembros_organizacion')
    .select('organizacion_id, rol_en_org, estado')
    .eq('user_id', userId);
  if (!data || data.length === 0) return null;
  const activos = data.filter((m) => m.estado === 'activo' || m.estado === 'activa');
  const pool = activos.length ? activos : data;
  const ids = pool.map((m) => m.organizacion_id as string);
  if (cookieOrgId && ids.includes(cookieOrgId)) return cookieOrgId;
  const dueno = pool.find((m) => m.rol_en_org === 'dueno');
  return (dueno ?? pool[0]).organizacion_id as string;
}
