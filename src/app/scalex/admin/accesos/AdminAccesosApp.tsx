'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, RefreshCw, ShieldX } from 'lucide-react';

type Org = {
  org_id: string;
  nombre: string;
  dueno_nombre: string | null;
  total_miembros: number;
};

const APPS = [
  { slug: 'scalex', nombre: 'SCALEx', color: '#3533cd' },
  { slug: 'teamx', nombre: 'TEAMx', color: '#1aab99' },
] as const;

type Gate = 'checking' | 'denied' | 'allowed';

export function AdminAccesosApp() {
  const supabase = createClient();
  const [gate, setGate] = useState<Gate>('checking');
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [ent, setEnt] = useState<Record<string, Set<string>>>({});
  const [saving, setSaving] = useState<string | null>(null); // `${orgId}:${app}`

  async function cargar() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setGate('denied');
      setLoading(false);
      return;
    }
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol_global')
      .eq('id', user.id)
      .maybeSingle();
    if (perfil?.rol_global !== 'admin') {
      setGate('denied');
      setLoading(false);
      return;
    }
    setGate('allowed');

    const [{ data: orgRows }, { data: entRows }] = await Promise.all([
      supabase.rpc('listar_organizaciones_admin'),
      supabase
        .from('org_herramientas')
        .select('organizacion_id, herramienta, estado')
        .in('estado', ['activa', 'activo']),
    ]);

    setOrgs(((orgRows ?? []) as Org[]).slice().sort((a, b) => a.nombre.localeCompare(b.nombre)));
    const map: Record<string, Set<string>> = {};
    (entRows ?? []).forEach((r: { organizacion_id: string; herramienta: string }) => {
      (map[r.organizacion_id] ??= new Set<string>()).add(r.herramienta);
    });
    setEnt(map);
    setLoading(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flip(orgId: string, app: string, on: boolean) {
    setEnt((prev) => {
      const next = { ...prev };
      const s = new Set(next[orgId] ?? []);
      if (on) s.add(app);
      else s.delete(app);
      next[orgId] = s;
      return next;
    });
  }

  async function toggle(orgId: string, app: string) {
    const key = `${orgId}:${app}`;
    const has = ent[orgId]?.has(app) ?? false;
    setSaving(key);
    flip(orgId, app, !has); // optimista
    try {
      if (has) {
        const { error } = await supabase
          .from('org_herramientas')
          .delete()
          .eq('organizacion_id', orgId)
          .eq('herramienta', app);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('org_herramientas')
          .upsert(
            { organizacion_id: orgId, herramienta: app, estado: 'activa' },
            { onConflict: 'organizacion_id,herramienta' },
          );
        if (error) throw error;
      }
    } catch {
      flip(orgId, app, has); // revertir
    } finally {
      setSaving(null);
    }
  }

  if (gate === 'checking' || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--sx-text-dim)]" />
      </div>
    );
  }

  if (gate === 'denied') {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <ShieldX className="h-10 w-10 text-[var(--sx-text-dim)]" />
        <p className="mt-3 text-[var(--sx-text-muted)]">
          Solo el administrador puede gestionar accesos.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--sx-text)]">Accesos por organización</h1>
          <p className="mt-1 text-sm text-[var(--sx-text-muted)]">
            Define qué app puede abrir cada organización desde el launcher. Como admin, tú siempre
            tienes acceso a todo.
          </p>
        </div>
        <button
          onClick={cargar}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--sx-border)] px-3 py-2 text-sm text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)]"
        >
          <RefreshCw className="h-4 w-4" /> Refrescar
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--sx-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--sx-card-hover)] text-xs uppercase tracking-wide text-[var(--sx-text-dim)]">
            <tr>
              <th className="p-3 text-left font-semibold">Organización</th>
              {APPS.map((a) => (
                <th key={a.slug} className="p-3 text-center font-semibold">
                  {a.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.org_id} className="border-t border-[var(--sx-border)]">
                <td className="p-3">
                  <div className="font-medium text-[var(--sx-text)]">{o.nombre}</div>
                  <div className="text-xs text-[var(--sx-text-dim)]">
                    {o.dueno_nombre || '—'} · {o.total_miembros} miembros
                  </div>
                </td>
                {APPS.map((a) => {
                  const on = ent[o.org_id]?.has(a.slug) ?? false;
                  const key = `${o.org_id}:${a.slug}`;
                  return (
                    <td key={a.slug} className="p-3 text-center">
                      <button
                        onClick={() => toggle(o.org_id, a.slug)}
                        disabled={saving === key}
                        aria-pressed={on}
                        aria-label={`${on ? 'Quitar' : 'Dar'} acceso a ${a.nombre} para ${o.nombre}`}
                        className="relative inline-flex h-6 w-11 items-center rounded-full transition disabled:opacity-50"
                        style={{ backgroundColor: on ? a.color : 'var(--sx-border-strong)' }}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                            on ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-[var(--sx-text-dim)]">
        Al desactivar una app, sus usuarios seguirán viendo la tarjeta en el launcher (marketing)
        pero no podrán entrar.
      </p>
    </div>
  );
}
