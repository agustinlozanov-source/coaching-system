import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { appDeRuta, appsActivasDeOrg, resolveActiveOrgServer } from '@/lib/entitlements';

/** Refresca la sesión de Supabase y protege las rutas de plataforma. */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rutas de plataforma protegidas (por ahora solo el launcher; /dashboard
  // sigue con Firebase hasta portar sus datos).
  const protegidas = ['/launcher', '/dashboard', '/scalex', '/scanx', '/boardx'];
  const esProtegida = protegidas.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!user && esProtegida) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Enforcement de entitlements por App: el usuario debe tener contratada la app
  // de la ruta (/scalex → 'scalex', /dashboard → 'teamx'). El admin global omite
  // el gating (superadmin). Si no la tiene, se le manda al launcher.
  if (user) {
    const app = appDeRuta(request.nextUrl.pathname);
    if (app) {
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol_global')
        .eq('id', user.id)
        .maybeSingle();
      if (perfil?.rol_global !== 'admin') {
        const cookieOrg = request.cookies.get('sx_active_org')?.value ?? null;
        const orgId = await resolveActiveOrgServer(supabase, user.id, cookieOrg);
        const apps = orgId ? await appsActivasDeOrg(supabase, orgId) : new Set<string>();
        if (!apps.has(app)) {
          const url = request.nextUrl.clone();
          url.pathname = '/launcher';
          url.search = `?bloqueada=${app}`;
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return supabaseResponse;
}
