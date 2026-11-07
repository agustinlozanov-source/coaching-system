'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, Loader2, Plus, RefreshCw, ShieldX, X } from 'lucide-react';

type Org = {
  org_id: string;
  nombre: string;
  dueno_nombre: string | null;
  total_miembros: number;
};

// SCANx no aparece aquí: es gratis para todos y no se contrata.
const APPS = [
  { slug: 'scalex', nombre: 'SCALEx', color: '#3533cd' },
  { slug: 'teamx', nombre: 'TEAMx', color: '#1aab99' },
  { slug: 'boardx', nombre: 'BOARDx', color: '#6366f1' },
] as const;

type Gate = 'checking' | 'denied' | 'allowed';

export function AdminAccesosApp() {
  const supabase = createClient();
  const [gate, setGate] = useState<Gate>('checking');
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [ent, setEnt] = useState<Record<string, Set<string>>>({});
  const [saving, setSaving] = useState<string | null>(null); // `${orgId}:${app}`

  // Alta de organización
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [appsNuevas, setAppsNuevas] = useState<Set<string>>(new Set(['teamx']));
  const [incluirme, setIncluirme] = useState(true);
  const [creando, setCreando] = useState(false);
  const [errorAlta, setErrorAlta] = useState('');
  const [recienCreada, setRecienCreada] = useState<string | null>(null);

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

  function cerrarAlta() {
    setAbierto(false);
    setErrorAlta('');
    setNombre('');
    setCorreo('');
    setAppsNuevas(new Set(['teamx']));
    setIncluirme(true);
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setCreando(true);
    setErrorAlta('');

    const { data, error } = await supabase.rpc('crear_organizacion_admin', {
      p_nombre: nombre,
      p_email: correo,
      p_apps: Array.from(appsNuevas),
      p_incluirme: incluirme,
    });

    if (error) {
      setErrorAlta(error.message || 'No se pudo crear la organización.');
      setCreando(false);
      return;
    }

    const nueva = Array.isArray(data) ? data[0] : data;
    setRecienCreada(nueva?.org_id ?? null);
    setCreando(false);
    cerrarAlta();
    await cargar();
  }

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
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={cargar}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--sx-border)] px-3 py-2 text-sm text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)]"
          >
            <RefreshCw className="h-4 w-4" /> Refrescar
          </button>
          {!abierto && (
            <button
              onClick={() => setAbierto(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: '#3533cd' }}
            >
              <Plus className="h-4 w-4" /> Nueva organización
            </button>
          )}
        </div>
      </div>

      {abierto && (
        <form
          onSubmit={crear}
          className="mb-6 rounded-xl border border-[var(--sx-border)] bg-[var(--sx-card-hover)] p-5"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-[var(--sx-text)]">Nueva organización</h2>
              <p className="mt-0.5 text-xs text-[var(--sx-text-muted)]">
                Se crea la organización, se le asigna el dueño, se siembran la escala, el ciclo y
                las siete dimensiones, y se prenden las apps. Todo en un solo paso.
              </p>
            </div>
            <button
              type="button"
              onClick={cerrarAlta}
              aria-label="Cancelar"
              className="shrink-0 rounded-lg p-1.5 text-[var(--sx-text-dim)] transition hover:bg-[var(--sx-border)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">
                Nombre de la empresa
              </span>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                autoFocus
                placeholder="Transportes del Norte"
                className="mt-1.5 w-full rounded-lg border border-[var(--sx-border)] bg-[var(--sx-card)] px-3 py-2 text-sm text-[var(--sx-text)] outline-none focus:border-[var(--sx-border-strong)]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">
                Correo del dueño
              </span>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
                placeholder="maria@transportes.com"
                className="mt-1.5 w-full rounded-lg border border-[var(--sx-border)] bg-[var(--sx-card)] px-3 py-2 text-sm text-[var(--sx-text)] outline-none focus:border-[var(--sx-border-strong)]"
              />
              <span className="mt-1 block text-xs text-[var(--sx-text-dim)]">
                Esa persona ya debe tener cuenta.
              </span>
            </label>
          </div>

          <div className="mt-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">
              Apps que puede abrir
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {APPS.map((a) => {
                const on = appsNuevas.has(a.slug);
                return (
                  <button
                    key={a.slug}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setAppsNuevas((prev) => {
                        const s = new Set(prev);
                        if (on) s.delete(a.slug);
                        else s.add(a.slug);
                        return s;
                      })
                    }
                    className="rounded-lg border px-3 py-1.5 text-sm font-medium transition"
                    style={{
                      borderColor: on ? a.color : 'var(--sx-border)',
                      backgroundColor: on ? a.color : 'transparent',
                      color: on ? '#fff' : 'var(--sx-text-muted)',
                    }}
                  >
                    {a.nombre}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="mt-4 flex items-start gap-2.5 text-sm text-[var(--sx-text)]">
            <input
              type="checkbox"
              checked={incluirme}
              onChange={(e) => setIncluirme(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#1aab99]"
            />
            <span>
              Agregarme como consultor
              <span className="mt-0.5 block text-xs text-[var(--sx-text-dim)]">
                Sin esto la organización no te aparece en el selector y no la puedes abrir.
              </span>
            </span>
          </label>

          {errorAlta && (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {errorAlta}
            </p>
          )}

          <div className="mt-5 flex items-center gap-3">
            <button
              type="submit"
              disabled={creando}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#3533cd' }}
            >
              {creando && <Loader2 className="h-4 w-4 animate-spin" />}
              {creando ? 'Creando…' : 'Crear organización'}
            </button>
            <button
              type="button"
              onClick={cerrarAlta}
              className="text-sm text-[var(--sx-text-muted)] transition hover:text-[var(--sx-text)]"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

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
              <tr
                key={o.org_id}
                className="border-t border-[var(--sx-border)]"
                style={
                  o.org_id === recienCreada
                    ? { backgroundColor: 'color-mix(in srgb, #1aab99 12%, transparent)' }
                    : undefined
                }
              >
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
