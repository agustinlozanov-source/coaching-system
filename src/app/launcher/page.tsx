import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { HERRAMIENTAS, type Herramienta } from '@/lib/tools';
import { AccountButton } from '@/components/launcher/AccountButton';

export const metadata = {
  title: 'Tus herramientas · SCALEx',
};

export const dynamic = 'force-dynamic';

function ToolCard({ h, contratada }: { h: Herramienta; contratada: boolean }) {
  const Icon = h.icon;
  const abrible = contratada && h.disponible;

  const inner = (
    <>
      <div className="flex items-start justify-between">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${h.color}1a`, color: h.color }}
        >
          <Icon className="h-6 w-6" />
        </div>
        {!contratada && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <Lock className="h-3 w-3" /> No incluida
          </span>
        )}
        {contratada && !h.disponible && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Próximamente
          </span>
        )}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{h.nombre}</h3>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-500">{h.descripcion}</p>
      {abrible ? (
        <span
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: h.color }}
        >
          Abrir
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      ) : (
        <span className="mt-4 text-sm font-medium text-slate-400">
          {contratada ? 'En construcción' : 'Contáctanos para incluirla'}
        </span>
      )}
    </>
  );

  const base = 'group relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6';

  if (abrible) {
    return (
      <Link
        href={h.ruta}
        className={`${base} transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg`}
      >
        {inner}
      </Link>
    );
  }
  return <div className={`${base} ${contratada ? '' : 'opacity-70'}`}>{inner}</div>;
}

export default async function LauncherPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Perfil (para el saludo)
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre')
    .eq('id', user.id)
    .maybeSingle();

  // Herramientas contratadas por la(s) organización(es) del usuario (RLS filtra)
  const { data: ents } = await supabase
    .from('org_herramientas')
    .select('herramienta')
    .eq('estado', 'activa');
  const contratadas = new Set((ents ?? []).map((e) => e.herramienta as string));

  const nombre = perfil?.nombre?.split(' ')[0] ?? '';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-[#0e6b5c] via-[#1aab99] to-[#3533cd]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="text-xl font-extrabold tracking-tight text-white">
            SCALE<span className="text-white/70">x</span>
          </div>
          <AccountButton email={user.email ?? ''} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-sm font-medium text-slate-500">
          Hola{nombre ? ` ${nombre}` : ''} 👋
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Tus herramientas</h1>
        <p className="mt-2 max-w-xl text-slate-500">
          Elige la herramienta con la que quieres trabajar. Cada una abre su propio espacio.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HERRAMIENTAS.map((h) => (
            <ToolCard key={h.slug} h={h} contratada={contratadas.has(h.slug)} />
          ))}
        </div>
      </main>
    </div>
  );
}
