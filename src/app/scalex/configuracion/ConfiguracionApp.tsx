'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Building2, Users, User as UserIcon, Plus, UserPlus, UserMinus, X, Loader2,
  ChevronRight, UserCircle, Lock, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/* ── Tipos (espejo del portal: perfiles, organizaciones, RPCs) ──────────── */
type Perfil = { id: string; nombre: string | null; apellido: string | null; email: string | null; rol_global: string | null };
type OrgAdminRow = {
  id: string; nombre: string | null; dueno_nombre: string | null; dueno_email: string | null;
  ciudad: string | null; sector: string | null; created_at: string | null;
};
type EquipoMiembro = {
  user_id: string; nombre: string | null; apellido: string | null; email: string | null;
  cargo: string | null; rol_en_org: string | null;
};

type Tab = 'orgs' | 'equipo' | 'cuenta';
type ToastMsg = { id: number; text: string; type: 'success' | 'error' };

/* ── Helpers (espejo de configuracion.js) ───────────────────────────────── */
function getIniciales(nombre?: string | null, apellido?: string | null) {
  const n = (nombre || '').trim();
  const a = (apellido || '').trim();
  if (n && a) return (n[0] + a[0]).toUpperCase();
  if (n) return n.slice(0, 2).toUpperCase();
  return '?';
}
function formatFecha(str?: string | null) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}
async function readFunctionError(error: any): Promise<string> {
  let msg = error?.message || 'Error desconocido';
  if (error?.context) {
    try {
      const body = await error.context.json();
      msg = body?.error || body?.message || JSON.stringify(body);
    } catch {
      /* noop */
    }
  }
  return msg;
}

/* ── UI helpers (dark-glow) ─────────────────────────────────────────────── */
const inputCls =
  'w-full rounded-lg border border-[var(--sx-border)] bg-[var(--sx-input)] px-3 py-2 text-sm text-[var(--sx-text)] outline-none transition placeholder:text-[var(--sx-text-faint)] focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25';
function Field({ label, children, hint, className }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <div className={className}>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">{label}</div>
      {children}
      {hint && <div className="mt-1 text-[11px] text-[var(--sx-text-faint)]">{hint}</div>}
    </div>
  );
}
function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />;
}

/* ══════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════════════════════════════════════ */
export function ConfiguracionApp() {
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [esAdmin, setEsAdmin] = useState(false);
  const [esDueno, setEsDueno] = useState(false);
  const [miOrgId, setMiOrgId] = useState<string | null>(null);
  const [miOrgNombre, setMiOrgNombre] = useState<string>('');
  const [tab, setTab] = useState<Tab>('cuenta');

  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const toastId = useRef(0);
  const toast = useCallback((text: string, type: 'success' | 'error' = 'success', duration = 4000) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
  }, []);

  const [nuevaOrgOpen, setNuevaOrgOpen] = useState(false);
  const [nuevoColabOpen, setNuevoColabOpen] = useState(false);

  /* ── Carga inicial (espejo de DOMContentLoaded en configuracion.js) ── */
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: perfilData } = await supabase.from('perfiles').select('*').eq('id', user.id).single();
      const prof: Perfil = perfilData ?? { id: user.id, nombre: '', apellido: '', email: user.email ?? '', rol_global: null };
      setPerfil(prof);
      const admin = prof.rol_global === 'admin';
      setEsAdmin(admin);

      const { data: orgDueno } = await supabase.rpc('mi_organizacion_como_dueno');
      let orgId: string | null = null;
      if (orgDueno) {
        orgId = typeof orgDueno === 'string' ? orgDueno : (orgDueno?.id ?? orgDueno?.org_id ?? null);
      }
      if (orgId) {
        setEsDueno(true);
        setMiOrgId(orgId);
        const { data: orgData } = await supabase.from('organizaciones').select('nombre').eq('id', orgId).maybeSingle();
        setMiOrgNombre(orgData?.nombre ?? '');
      }

      // Tab por defecto: primer tab visible según rol (igual que renderTabs del portal)
      setTab(admin ? 'orgs' : orgId ? 'equipo' : 'cuenta');

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--sx-text-dim)]" />
      </div>
    );
  }

  const nombreUsuario = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ') || perfil?.email || '';

  const tabs: { id: Tab; icon: any; label: string }[] = [
    ...(esAdmin ? [{ id: 'orgs' as Tab, icon: Building2, label: 'Organizaciones' }] : []),
    ...(esDueno ? [{ id: 'equipo' as Tab, icon: Users, label: 'Mi Equipo' }] : []),
    { id: 'cuenta', icon: UserIcon, label: 'Mi cuenta' },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">Ajustes</p>
          <h1 className="text-2xl font-bold text-[var(--sx-text)]">Configuración</h1>
        </div>
        <div className="text-sm text-[var(--sx-text-dim)]">{nombreUsuario}</div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-[var(--sx-border)]">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                active ? 'border-[#1aab99] text-[var(--sx-text)]' : 'border-transparent text-[var(--sx-text-dim)] hover:text-[var(--sx-text-muted)]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'orgs' && esAdmin && (
        <OrgsTab onNuevaOrg={() => setNuevaOrgOpen(true)} />
      )}
      {tab === 'equipo' && esDueno && (
        <EquipoTab orgId={miOrgId} orgNombre={miOrgNombre} onNuevoColab={() => setNuevoColabOpen(true)} toast={toast} />
      )}
      {tab === 'cuenta' && <CuentaTab />}

      {nuevaOrgOpen && (
        <NuevaOrgModal onClose={() => setNuevaOrgOpen(false)} onCreated={(email, password, nombre) => {
          setNuevaOrgOpen(false);
          toast(`Organización "${nombre}" creada. Credenciales: ${email} / ${password}`, 'success', 7000);
        }} />
      )}
      {nuevoColabOpen && miOrgId && (
        <NuevoColabModal orgId={miOrgId} onClose={() => setNuevoColabOpen(false)} onCreated={(email, password, nombre) => {
          setNuevoColabOpen(false);
          toast(`Colaborador ${nombre} agregado. Credenciales: ${email} / ${password}`, 'success', 7000);
        }} />
      )}

      {/* Toasts */}
      <div className="fixed bottom-7 right-7 z-[2000] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex max-w-[340px] items-center gap-2.5 rounded-xl border bg-[var(--sx-card-hover)] px-4 py-3 text-sm font-medium text-[var(--sx-text)] shadow-2xl ${
              t.type === 'success' ? 'border-[#1aab99]' : 'border-red-500/60'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#1aab99]" />
            ) : (
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
            )}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB A — ORGANIZACIONES (Admin)  · tabla listar_organizaciones_admin
   ══════════════════════════════════════════════════════════════════════════ */
function OrgsTab({ onNuevaOrg }: { onNuevaOrg: () => void }) {
  const [orgs, setOrgs] = useState<OrgAdminRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [equipos, setEquipos] = useState<Record<string, EquipoMiembro[] | 'loading'>>({});

  const cargarOrgs = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('listar_organizaciones_admin');
    if (error) { setError(error.message); return; }
    setOrgs((data ?? []) as OrgAdminRow[]);
  }, []);

  useEffect(() => { cargarOrgs(); }, [cargarOrgs]);

  async function toggleEquipo(orgId: string) {
    if (expanded === orgId) { setExpanded(null); return; }
    setExpanded(orgId);
    if (!equipos[orgId]) {
      setEquipos((e) => ({ ...e, [orgId]: 'loading' }));
      const supabase = createClient();
      const { data } = await supabase.rpc('listar_equipo_org', { p_org_id: orgId });
      setEquipos((e) => ({ ...e, [orgId]: (data ?? []) as EquipoMiembro[] }));
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-[var(--sx-text)]">Organizaciones</h2>
        <button
          onClick={onNuevaOrg}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-3.5 py-2 text-xs font-bold text-white transition hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> Nueva organización con dueño
        </button>
      </div>

      <div className="overflow-auto rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--sx-border)] bg-[var(--sx-card-hover)]">
              {['Empresa', 'Dueño', 'Email', 'Ciudad', 'Sector', 'Creada', ''].map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-[var(--sx-text-dim)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr><td colSpan={7} className="p-8 text-center text-sm text-red-400">Error: {error}</td></tr>
            )}
            {!error && orgs === null && (
              <tr><td colSpan={7} className="p-8 text-center text-sm text-[var(--sx-text-dim)]">Cargando organizaciones…</td></tr>
            )}
            {!error && orgs !== null && orgs.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-sm text-[var(--sx-text-dim)]">Sin organizaciones registradas</td></tr>
            )}
            {orgs?.map((org) => (
              <Fragment key={org.id}>
                <tr className="border-b border-[var(--sx-border)] transition hover:bg-[var(--sx-card-hover)]">
                  <td className="px-4 py-3 text-sm font-semibold text-[var(--sx-text)]">{org.nombre || '—'}</td>
                  <td className="px-4 py-3 text-sm text-[var(--sx-text-muted)]">{org.dueno_nombre || '—'}</td>
                  <td className="px-4 py-3 text-xs text-[var(--sx-text-muted)]">{org.dueno_email || '—'}</td>
                  <td className="px-4 py-3 text-sm text-[var(--sx-text-muted)]">{org.ciudad || '—'}</td>
                  <td className="px-4 py-3 text-sm text-[var(--sx-text-muted)]">{org.sector || '—'}</td>
                  <td className="px-4 py-3 text-[11px] text-[var(--sx-text-dim)]">{formatFecha(org.created_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleEquipo(org.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--sx-border)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)]"
                    >
                      <Users className="h-3.5 w-3.5" /> Equipo
                    </button>
                  </td>
                </tr>
                {expanded === org.id && (
                  <tr className="border-b border-[var(--sx-border)] bg-[var(--sx-card-hover)]">
                    <td colSpan={7} className="px-5 py-4">
                      <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-[var(--sx-text-dim)]">Equipo de {org.nombre}</div>
                      <div className="flex flex-wrap gap-2">
                        {equipos[org.id] === 'loading' && <span className="text-xs text-[var(--sx-text-dim)]">Cargando…</span>}
                        {Array.isArray(equipos[org.id]) && (equipos[org.id] as EquipoMiembro[]).length === 0 && (
                          <span className="text-xs text-[var(--sx-text-dim)]">Sin miembros registrados</span>
                        )}
                        {Array.isArray(equipos[org.id]) && (equipos[org.id] as EquipoMiembro[]).map((m) => (
                          <div key={m.user_id} className="flex items-center gap-2 rounded-lg border border-[var(--sx-border)] bg-[var(--sx-input)] px-3 py-1.5">
                            <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-[9px] font-extrabold text-white">
                              {getIniciales(m.nombre, m.apellido)}
                            </span>
                            <div>
                              <div className="text-xs font-semibold text-[var(--sx-text)]">{[m.nombre, m.apellido].filter(Boolean).join(' ') || m.email}</div>
                              <div className="text-[11px] text-[var(--sx-text-dim)]">{m.cargo || m.rol_en_org || ''}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB B — MI EQUIPO (Dueño) · miembros_organizacion via listar_equipo_org
   ══════════════════════════════════════════════════════════════════════════ */
function EquipoTab({
  orgId, orgNombre, onNuevoColab, toast,
}: {
  orgId: string | null; orgNombre: string; onNuevoColab: () => void; toast: (t: string, type?: 'success' | 'error') => void;
}) {
  const [equipo, setEquipo] = useState<EquipoMiembro[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargarEquipo = useCallback(async () => {
    if (!orgId) return;
    const supabase = createClient();
    const { data, error } = await supabase.rpc('listar_equipo_org', { p_org_id: orgId });
    if (error) { setError(error.message); return; }
    setEquipo((data ?? []) as EquipoMiembro[]);
  }, [orgId]);

  useEffect(() => { cargarEquipo(); }, [cargarEquipo]);

  async function quitarMiembro(userId: string, nombre: string) {
    if (!orgId) return;
    if (!confirm(`¿Quitar a ${nombre} del equipo? Seguirá existiendo su cuenta pero perderá acceso a esta organización.`)) return;
    const supabase = createClient();
    const { error } = await supabase.rpc('quitar_usuario_de_org', { p_user_id: userId, p_org_id: orgId });
    if (error) { toast('Error al quitar miembro: ' + error.message, 'error'); return; }
    toast(`${nombre} removido del equipo`);
    cargarEquipo();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[var(--sx-text)]">Mi Equipo</h2>
          <p className="mt-0.5 text-xs text-[var(--sx-text-dim)]">{orgNombre}</p>
        </div>
        <button
          onClick={onNuevoColab}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-3.5 py-2 text-xs font-bold text-white transition hover:opacity-90"
        >
          <UserPlus className="h-3.5 w-3.5" /> Agregar colaborador
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">Error: {error}</div>}
      {!error && equipo === null && <div className="p-8 text-center text-sm text-[var(--sx-text-dim)]">Cargando equipo…</div>}
      {!error && equipo !== null && equipo.length === 0 && (
        <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-8 text-center text-sm text-[var(--sx-text-dim)]">Sin miembros en el equipo</div>
      )}

      {equipo && equipo.length > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {equipo.map((m) => {
            const nombre = [m.nombre, m.apellido].filter(Boolean).join(' ') || m.email || '—';
            const esDuenoCard = m.rol_en_org === 'dueno' || m.rol_en_org === 'owner';
            return (
              <div key={m.user_id} className="flex items-center gap-3.5 rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-4 transition hover:border-[var(--sx-border-strong)] hover:bg-[var(--sx-card-hover)]">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-xs font-extrabold text-white">
                  {getIniciales(m.nombre, m.apellido)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-[var(--sx-text)]">{nombre}</div>
                  <div className="truncate text-xs text-[var(--sx-text-dim)]">{m.cargo || m.email || ''}</div>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${esDuenoCard ? 'bg-[#1aab99]/15 text-[#1aab99]' : 'bg-[var(--sx-card-hover)] text-[var(--sx-text-dim)]'}`}>
                    {esDuenoCard ? 'Dueño' : 'Colaborador'}
                  </span>
                </div>
                {!esDuenoCard && (
                  <button
                    title="Quitar del equipo"
                    onClick={() => quitarMiembro(m.user_id, nombre)}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[var(--sx-text-faint)] transition hover:bg-red-500/15 hover:text-red-400"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB C — MI CUENTA (Todos)
   ══════════════════════════════════════════════════════════════════════════ */
function CuentaTab() {
  return (
    <div>
      <h2 className="mb-4 text-sm font-bold text-[var(--sx-text)]">Mi cuenta</h2>
      <div className="max-w-[480px] rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-6">
        <div className="mb-4 text-sm font-bold text-[var(--sx-text)]">Perfil y acceso</div>
        <Link
          href="/scalex/perfil"
          className="mb-2.5 flex items-center gap-3 rounded-lg border border-[var(--sx-border)] bg-[var(--sx-card-hover)] px-4 py-3 text-sm text-[var(--sx-text-muted)] transition hover:border-[var(--sx-border-strong)] hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)]"
        >
          <UserCircle className="h-4 w-4 flex-shrink-0 text-[#1aab99]" />
          <div>
            <div>Editar mi perfil</div>
            <div className="mt-0.5 text-[11px] text-[var(--sx-text-dim)]">Nombre, foto, información de contacto</div>
          </div>
          <ChevronRight className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-[var(--sx-text-faint)]" />
        </Link>
        <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-[var(--sx-border)] bg-[var(--sx-card-hover)] px-4 py-3 text-xs text-[var(--sx-text-faint)]">
          <Lock className="h-3.5 w-3.5 flex-shrink-0" />
          <div>
            <div className="font-semibold text-[var(--sx-text-dim)]">Cambiar contraseña</div>
            <div>Disponible próximamente</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MODAL — Nueva organización con dueño (Edge Function crear-usuario, modo cliente)
   ══════════════════════════════════════════════════════════════════════════ */
function NuevaOrgModal({ onClose, onCreated }: { onClose: () => void; onCreated: (email: string, password: string, orgNombre: string) => void }) {
  const [orgNombre, setOrgNombre] = useState('');
  const [orgSector, setOrgSector] = useState('');
  const [orgCiudad, setOrgCiudad] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function crear() {
    setError(null);
    if (!orgNombre.trim()) return setError('El nombre de la empresa es obligatorio');
    if (!nombre.trim()) return setError('El nombre del dueño es obligatorio');
    if (!email.trim() || !email.includes('@')) return setError('Email inválido');
    if (password.trim().length < 6) return setError('La contraseña debe tener al menos 6 caracteres');

    setSubmitting(true);
    const supabase = createClient();
    const { data, error: fnError } = await supabase.functions.invoke('crear-usuario', {
      body: {
        modo: 'cliente', email: email.trim(), password: password.trim(), nombre: nombre.trim(),
        apellido: apellido.trim(), org_nombre: orgNombre.trim(), org_sector: orgSector.trim(), org_ciudad: orgCiudad.trim(),
      },
    });
    setSubmitting(false);

    if (fnError || data?.error) {
      const msg = data?.error || (await readFunctionError(fnError));
      setError(msg);
      return;
    }
    onCreated(email.trim(), password.trim(), orgNombre.trim());
  }

  return (
    <ModalShell title="Nueva organización con dueño" onClose={onClose}>
      <div>
        <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-[var(--sx-text-dim)]">Empresa</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre de la empresa *" className="sm:col-span-2">
            <TextInput value={orgNombre} onChange={(e) => setOrgNombre(e.target.value)} placeholder="Empresa Ejemplo SA de CV" />
          </Field>
          <Field label="Sector"><TextInput value={orgSector} onChange={(e) => setOrgSector(e.target.value)} placeholder="Manufactura" /></Field>
          <Field label="Ciudad"><TextInput value={orgCiudad} onChange={(e) => setOrgCiudad(e.target.value)} placeholder="Monterrey" /></Field>
        </div>
      </div>
      <div>
        <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-[var(--sx-text-dim)]">Dueño / Director</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre *"><TextInput value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Carlos" /></Field>
          <Field label="Apellido"><TextInput value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="López" /></Field>
          <Field label="Email *" className="sm:col-span-2"><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="carlos@empresa.com" /></Field>
          <Field label="Contraseña temporal *" className="sm:col-span-2" hint="El usuario deberá cambiarla en su primer acceso.">
            <TextInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mín. 6 caracteres" />
          </Field>
        </div>
      </div>
      {error && <div className="rounded-lg bg-red-500/10 px-3.5 py-2.5 text-xs text-red-400">{error}</div>}
      <ModalFooter onClose={onClose} onSubmit={crear} submitting={submitting} icon={Plus} label="Crear organización" />
    </ModalShell>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MODAL — Nuevo colaborador (Edge Function crear-usuario, modo miembro)
   ══════════════════════════════════════════════════════════════════════════ */
function NuevoColabModal({ orgId, onClose, onCreated }: { orgId: string; onClose: () => void; onCreated: (email: string, password: string, nombre: string) => void }) {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargo, setCargo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function crear() {
    setError(null);
    if (!nombre.trim()) return setError('El nombre es obligatorio');
    if (!email.trim() || !email.includes('@')) return setError('Email inválido');
    if (password.trim().length < 6) return setError('La contraseña debe tener al menos 6 caracteres');

    setSubmitting(true);
    const supabase = createClient();
    const { data, error: fnError } = await supabase.functions.invoke('crear-usuario', {
      body: {
        modo: 'miembro', email: email.trim(), password: password.trim(), nombre: nombre.trim(),
        apellido: apellido.trim(), org_id: orgId, cargo: cargo.trim(),
      },
    });
    setSubmitting(false);

    if (fnError || data?.error) {
      const msg = data?.error || (await readFunctionError(fnError));
      setError(msg);
      return;
    }
    onCreated(email.trim(), password.trim(), nombre.trim());
  }

  return (
    <ModalShell title="Agregar colaborador" onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre *"><TextInput value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ana" /></Field>
        <Field label="Apellido"><TextInput value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="García" /></Field>
        <Field label="Email *" className="sm:col-span-2"><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ana@empresa.com" /></Field>
        <Field label="Contraseña temporal *" className="sm:col-span-2" hint="El usuario deberá cambiarla en su primer acceso.">
          <TextInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mín. 6 caracteres" />
        </Field>
        <Field label="Cargo / Puesto" className="sm:col-span-2"><TextInput value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Gerente de Operaciones" /></Field>
      </div>
      {error && <div className="rounded-lg bg-red-500/10 px-3.5 py-2.5 text-xs text-red-400">{error}</div>}
      <ModalFooter onClose={onClose} onSubmit={crear} submitting={submitting} icon={UserPlus} label="Agregar colaborador" />
    </ModalShell>
  );
}

/* ── Modal shell compartido ──────────────────────────────────────────────── */
function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-[var(--sx-border-strong)] bg-[var(--sx-card)] shadow-2xl">
        <div className="flex flex-shrink-0 items-center gap-3.5 border-b border-[var(--sx-border)] px-6 py-5">
          <div className="flex-1 text-base font-extrabold text-[var(--sx-text)]">{title}</div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--sx-border)] bg-[var(--sx-card-hover)] text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>
  );
}
function ModalFooter({ onClose, onSubmit, submitting, icon: Icon, label }: { onClose: () => void; onSubmit: () => void; submitting: boolean; icon: any; label: string }) {
  return (
    <div className="-mx-6 -mb-6 flex flex-shrink-0 justify-end gap-2.5 border-t border-[var(--sx-border)] px-6 py-4">
      <button onClick={onClose} className="rounded-lg border border-[var(--sx-border)] bg-[var(--sx-card-hover)] px-4 py-2 text-sm font-medium text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)]">
        Cancelar
      </button>
      <button
        onClick={onSubmit} disabled={submitting}
        className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        {submitting ? 'Creando…' : label}
      </button>
    </div>
  );
}
