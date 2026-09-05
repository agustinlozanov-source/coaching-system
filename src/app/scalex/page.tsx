import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Map, Repeat, Eye, Compass, Coins, Activity, Dna, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getActiveOrgId } from '@/lib/teamx/org';

export const metadata = { title: 'SCALEx · Metodología' };
export const dynamic = 'force-dynamic';

const TOOLS = [
  { href: '/scalex/opsp', icon: Map, nombre: 'OPSP', desc: 'One Page Strategic Plan', color: '#3533cd', ready: true },
  { href: '/scalex/rituales', icon: Repeat, nombre: 'Rituales', desc: 'Ritmo de ejecución', color: '#14806a', ready: false },
  { href: '/scalex/reflejo', icon: Eye, nombre: 'Reflejo', desc: 'El espejo del líder', color: '#8b5cf6', ready: false },
  { href: '/scalex/vector', icon: Compass, nombre: 'Vector', desc: 'Estrategia aterrizada', color: '#3533cd', ready: false },
  { href: '/scalex/flujo', icon: Coins, nombre: 'Flujo', desc: 'Finanzas y capital', color: '#f59e0b', ready: false },
  { href: '/scalex/ritmo', icon: Activity, nombre: 'Ritmo', desc: 'El pulso de la ejecución', color: '#1aab99', ready: false },
  { href: '/scalex/adn', icon: Dna, nombre: 'ADN', desc: 'Cultura y pirámide invertida', color: '#ec4899', ready: false },
];

export default async function ScalexDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const orgId = await getActiveOrgId();
  const [{ data: perfil }, { data: org }] = await Promise.all([
    supabase.from('perfiles').select('nombre').eq('id', user.id).maybeSingle(),
    orgId ? supabase.from('organizaciones').select('nombre').eq('id', orgId).maybeSingle() : Promise.resolve({ data: null } as any),
  ]);
  const nombre = perfil?.nombre?.split(' ')[0] ?? '';

  return (
    <div className="px-8 py-8">
      {/* Topbar */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm text-white/50">Hola{nombre ? ` ${nombre}` : ''} 👋 · {org?.nombre ?? 'Tu organización'}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Tu proceso de escalabilidad</h1>
          <p className="mt-1 text-white/50">Metodología SCALEx — estrategia, procesos, ritmo y finanzas.</p>
        </div>
      </div>

      {/* Herramientas internas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const inner = (
            <>
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${t.color}22`, color: t.color }}>
                  <Icon className="h-6 w-6" />
                </div>
                {!t.ready && (
                  <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                    Próximamente
                  </span>
                )}
              </div>
              <h3 className="mt-4 text-lg font-bold">{t.nombre}</h3>
              <p className="mt-1 flex-1 text-sm text-white/50">{t.desc}</p>
              {t.ready && (
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: t.color }}>
                  Abrir <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </>
          );
          const cls = 'group flex h-full flex-col rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-6';
          return t.ready ? (
            <Link key={t.nombre} href={t.href} className={`${cls} transition hover:border-white/20 hover:bg-[#242426]`}>
              {inner}
            </Link>
          ) : (
            <div key={t.nombre} className={`${cls} opacity-70`}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}
