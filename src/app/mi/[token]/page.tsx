import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { TareasPortal } from './TareasPortal';

/**
 * Portal de la persona. Sin sesión: el token de la URL es la credencial.
 *
 * Todo lo que se pinta viene de portal_datos(token), una función en Postgres
 * que solo recibe el token. No se le pasa organización ni id de persona, así
 * que un enlace filtrado expone a una persona y a nadie más. Las notas del
 * coach no viajan aquí a propósito.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mi seguimiento',
  robots: { index: false, follow: false },
};

type Datos = {
  persona: { nombre: string; cargo: string | null; foto: string | null };
  organizacion: string | null;
  ciclo: { nombre: string; semana: number; semanas: number } | null;
  evaluacion: {
    fecha: string;
    promedio: number | null;
    promedio_anterior: number | null;
    resumen: Record<string, { pct: number | null; anterior?: number | null; cambio?: string }>;
    dimensiones: { id: string; nombre: string; color: string; naturaleza: string }[];
    seguimiento: { nombre: string; unidad?: string; meta?: number; logro?: number }[];
    eficiencia: { meta?: number; logro?: number; semaforo?: string; acumulado?: number };
  } | null;
  tareas: { id: string; descripcion: string; fecha_limite: string | null; estado: string; vencida: boolean }[];
  sesion: { fecha: string; agenda: { id: string; texto: string }[] } | null;
};

function fecha(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function iniciales(nombre: string) {
  return nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

export default async function PortalPersona({ params }: { params: { token: string } }) {
  const supabase = createClient();
  const { data } = await supabase.rpc('portal_datos', { p_token: params.token });
  const d = data as Datos | null;

  if (!d) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">Este enlace ya no sirve</h1>
          <p className="mt-2 text-sm text-slate-500">
            Puede que lo hayan renovado. Pídele el nuevo a tu coach.
          </p>
        </div>
      </main>
    );
  }

  const ev = d.evaluacion;
  const delta =
    ev?.promedio != null && ev?.promedio_anterior != null
      ? Math.round(ev.promedio - ev.promedio_anterior)
      : null;

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <header className="bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-5 pb-10 pt-8 text-white">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-extrabold">
              {iniciales(d.persona.nombre)}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold">{d.persona.nombre}</h1>
              <p className="truncate text-sm text-white/80">
                {[d.persona.cargo, d.organizacion].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>

          {d.ciclo && (
            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-white/70">
              {d.ciclo.nombre} · Semana {d.ciclo.semana} de {d.ciclo.semanas}
            </p>
          )}

          {ev?.promedio != null && (
            <div className="mt-2 flex items-end gap-3">
              <span className="text-5xl font-extrabold tabular-nums">{Math.round(ev.promedio)}%</span>
              {delta != null && delta !== 0 && (
                <span className="mb-2 text-sm font-bold text-white/90">
                  {delta > 0 ? '↑' : '↓'} {Math.abs(delta)} pts
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-5 px-5 pt-6">
        <TareasPortal token={params.token} tareas={d.tareas} />

        {ev && (ev.seguimiento?.length > 0 || ev.eficiencia?.meta != null) && (
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Mis números</h2>
            <div className="mt-3 space-y-3">
              {ev.eficiencia?.meta != null && (
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">Eficiencia</span>
                  <span className="text-sm font-bold tabular-nums text-slate-900">
                    {ev.eficiencia.logro ?? 0} / {ev.eficiencia.meta}
                  </span>
                </div>
              )}
              {(ev.seguimiento ?? []).map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">{s.nombre}</span>
                  <span className="text-sm font-bold tabular-nums text-slate-900">
                    {s.logro ?? 0}{s.meta != null ? ` / ${s.meta}` : ''} {s.unidad ?? ''}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {ev && ev.dimensiones?.length > 0 && (
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Mi última evaluación</h2>
            <p className="mt-0.5 text-xs text-slate-500">{fecha(ev.fecha)}</p>
            <div className="mt-4 space-y-3.5">
              {ev.dimensiones.map((dim) => {
                const r = ev.resumen?.[dim.id];
                if (!r || r.pct == null) return null;
                return (
                  <div key={dim.id}>
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm text-slate-700">{dim.nombre}</span>
                      <span className="flex-shrink-0 text-sm font-bold tabular-nums text-slate-900">
                        {r.pct}%
                        {r.cambio === 'up' && <span className="ml-1 text-emerald-600">↑</span>}
                        {r.cambio === 'down' && <span className="ml-1 text-red-500">↓</span>}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.max(0, Math.min(100, r.pct))}%`, backgroundColor: dim.color || '#1aab99' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {d.sesion && (
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Mi próxima sesión</h2>
            <p className="mt-0.5 text-sm text-slate-600">{fecha(d.sesion.fecha)}</p>
            {d.sesion.agenda?.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {d.sesion.agenda.map((a) => (
                  <li key={a.id} className="flex gap-2 text-sm text-slate-600">
                    <span className="text-slate-300">—</span>
                    {a.texto}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {!ev && d.tareas.length === 0 && (
          <section className="rounded-2xl border bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              Todavía no hay nada que mostrarte. Aparecerá aquí después de tu primera sesión.
            </p>
          </section>
        )}

        <p className="px-2 pt-2 text-center text-xs text-slate-400">
          Esta página es solo tuya. No la compartas.
        </p>
      </div>
    </main>
  );
}
