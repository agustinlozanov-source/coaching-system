import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { HERRAMIENTAS } from '@/lib/tools';
import { appsActivasDeOrg, resolveActiveOrgServer } from '@/lib/entitlements';
import { LauncherClient, type ToolItem } from '@/components/launcher/LauncherClient';

export const metadata = {
  title: 'Tus herramientas · SCALEx',
};

export const dynamic = 'force-dynamic';

export default async function LauncherPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Perfil (para el saludo + rol de admin)
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, rol_global')
    .eq('id', user.id)
    .maybeSingle();

  const nombre = perfil?.nombre?.split(' ')[0] ?? '';
  const esAdmin = perfil?.rol_global === 'admin';

  // Apps contratadas por la organización activa. El admin global las ve todas.
  let apps: Set<string>;
  let sinOrg = false;
  if (esAdmin) {
    apps = new Set(HERRAMIENTAS.map((h) => h.slug));
  } else {
    const cookieOrg = cookies().get('sx_active_org')?.value ?? null;
    const orgId = await resolveActiveOrgServer(supabase, user.id, cookieOrg);
    sinOrg = !orgId;
    apps = orgId ? await appsActivasDeOrg(supabase, orgId) : new Set<string>();
  }

  const tools: ToolItem[] = HERRAMIENTAS.map((h) => ({
    slug: h.slug,
    nombre: h.nombre,
    descripcion: h.descripcion,
    ruta: h.ruta,
    color: h.color,
    disponible: h.disponible,
    // SCANx es la puerta de entrada gratuita: siempre disponible.
    contratada: h.slug === 'scanx' ? true : apps.has(h.slug),
  }));

  return (
    <LauncherClient nombre={nombre} email={user.email ?? ''} sinOrg={sinOrg} tools={tools} />
  );
}
