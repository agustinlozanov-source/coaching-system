import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Map, Repeat, Eye, Compass, Coins, Activity, Dna, KanbanSquare,
  Presentation, ArrowRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getActiveOrgId } from '@/lib/teamx/org';

export const metadata = { title: 'SCALEx · Metodología' };
export const dynamic = 'force-dynamic';

const GRUPOS: { titulo: string; tools: { href: string; icon: any; nombre: string; desc: string; color: string }[] }[] = [
  {
    titulo: 'Metodología',
    tools: [
      { href: '/scalex/opsp', icon: Map, nombre: 'OPSP', desc: 'One Page Strategic Plan', color: '#3533cd' },
      { href: '/scalex/rituales', icon: Repeat, nombre: 'Rituales', desc: 'Contrato del Dueño y Consejo de Escalabilidad', color: '#14806a' },
    ],
  },
  {
    titulo: 'Los 5 pilares',
    tools: [
      { href: '/scalex/reflejo', icon: Eye, nombre: 'Reflejo', desc: 'PRISMA, MAPE y PIE — el espejo del líder', color: '#8b5cf6' },
      { href: '/scalex/adn', icon: Dna, nombre: 'ADN', desc: 'Cultura, personalidad y pirámide invertida', color: '#ec4899' },
      { href: '/scalex/vector', icon: Compass, nombre: 'Vector', desc: 'La estrategia aterrizada: Norte y Trimestre', color: '#3533cd' },
      { href: '/scalex/ritmo', icon: Activity, nombre: 'Ritmo', desc: 'Ritual Semanal y Pulso del equipo', color: '#1aab99' },
      { href: '/scalex/flujo', icon: Coins, nombre: 'Flujo', desc: 'Finanzas, costeo y capital', color: '#f59e0b' },
    ],
  },
  {
    titulo: 'Consultor',
    tools: [
      { href: '/scalex/clientes', icon: KanbanSquare, nombre: 'Mis Clientes', desc: 'Pipeline de prospectos y cuentas', color: '#1aab99' },
      { href: '/scalex/presentacion', icon: Presentation, nombre: 'Presentación', desc: 'Modo presentación de la metodología', color: '#3533cd' },
    ],
  },
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
      <div className="mb-8">
        <p className="text-sm text-white/50">Hola{nombre ? ` ${nombre}` : ''} 👋 · {org?.nombre ?? 'Tu organización'}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Tu proceso de escalabilidad</h1>
        <p className="mt-1 text-white/50">Metodología SCALEx — estrategia, procesos, ritmo y finanzas.</p>
      </div>

      <div className="space-y-8">
        {GRUPOS.map((grupo) => (
          <section key={grupo.titulo}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">{grupo.titulo}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {grupo.tools.map((t) => {
                const Icon = t.icon;
                return (
                  <Link key={t.nombre} href={t.href}
                    className="group flex h-full flex-col rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-6 transition hover:border-white/20 hover:bg-[#242426]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${t.color}22`, color: t.color }}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-lg font-bold">{t.nombre}</h3>
                    <p className="mt-1 flex-1 text-sm text-white/50">{t.desc}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: t.color }}>
                      Abrir <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
