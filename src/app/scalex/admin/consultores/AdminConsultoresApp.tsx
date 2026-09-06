'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  ShieldX, Pencil, BadgeCheck, X, Loader2, RefreshCw,
} from 'lucide-react';

/* ── Tipos (espejo de la tabla perfiles del portal) ─────────────────────── */
type NivelConsultor = 'junior' | 'senior' | 'master' | 'master_certificador' | null;

type Perfil = {
  id: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  avatar_url: string | null;
  rol_global: string | null;
  nivel_consultor: NivelConsultor;
  cert_numero: string | null;
  cert_emitida_en: string | null;
  cert_vigente: boolean | null;
};

const NIVEL_TXT: Record<string, string> = {
  junior: 'Junior',
  senior: 'Senior',
  master: 'Master',
  master_certificador: 'Master Cert.',
};

const NIVEL_BADGE_CLS: Record<string, string> = {
  junior: 'bg-[#1aab99]/15 text-[#1aab99]',
  senior: 'bg-[#3533cd]/15 text-[#8c8aff]',
  master: 'bg-purple-500/15 text-purple-400',
  master_certificador: 'bg-amber-500/15 text-amber-400',
  ninguno: 'bg-white/[0.06] text-white/40',
};

function hoy() {
  return new Date().toISOString().split('T')[0];
}
function getIniciales(nombre?: string | null, apellido?: string | null) {
  const n = (nombre || '').trim();
  const a = (apellido || '').trim();
  if (n && a) return (n[0] + a[0]).toUpperCase();
  if (n) return n.slice(0, 2).toUpperCase();
  return '?';
}

/* ── Gating ─────────────────────────────────────────────────────────────── */
type Gate = 'checking' | 'denied' | 'allowed';

export function AdminConsultoresApp() {
  const [gate, setGate] = useState<Gate>('checking');
  const [loading, setLoading] = useState(true);
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [modalUser, setModalUser] = useState<Perfil | null>(null);

  async function cargarConsultores() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('perfiles')
      .select('id, nombre, apellido, email, avatar_url, rol_global, nivel_consultor, cert_numero, cert_emitida_en, cert_vigente')
      .order('created_at', { ascending: false });
    setPerfiles((data ?? []) as Perfil[]);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) { setGate('denied'); return; }

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol_global')
        .eq('id', user.id)
        .maybeSingle();

      if (!perfil || perfil.rol_global !== 'admin') {
        setGate('denied');
        return;
      }
      setGate('allowed');
      await cargarConsultores();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (gate === 'checking') {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  if (gate === 'denied') {
    return (
      <div>
        <Header onReload={undefined} />
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/[0.08] bg-[#1c1c1e] px-8 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 text-red-400">
            <ShieldX className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Acceso restringido — solo administradores</h2>
          <p className="max-w-md text-sm text-white/50">
            Solo los administradores globales pueden asignar certificaciones de consultores. Contacta a Agustín si necesitas acceso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header onReload={cargarConsultores} />

      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-bold text-white">Usuarios del sistema</div>
        <div className="text-xs text-white/40">
          {loading ? 'Cargando…' : `${perfiles.length} usuario${perfiles.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-white/40" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#1c1c1e]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {['Usuario', 'Rol', 'Nivel', '# Cert', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="border-b border-white/[0.08] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-white/40">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perfiles.map((p) => {
                const nombre = [p.nombre, p.apellido].filter(Boolean).join(' ') || '(sin nombre)';
                const nivel = p.nivel_consultor;
                const nivelLabel = nivel ? (NIVEL_TXT[nivel] ?? nivel) : '—';
                const badgeCls = NIVEL_BADGE_CLS[nivel ?? 'ninguno'] ?? NIVEL_BADGE_CLS.ninguno;
                const vigente = p.cert_vigente === true;
                return (
                  <tr key={p.id} className="transition hover:bg-white/[0.03]">
                    <td className="border-b border-white/[0.06] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-xs font-extrabold text-white">
                          {p.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.avatar_url} alt={getIniciales(p.nombre, p.apellido)} className="h-full w-full object-cover" />
                          ) : (
                            getIniciales(p.nombre, p.apellido)
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[13.5px] font-semibold text-white">{nombre}</div>
                          <div className="truncate text-[11.5px] text-white/40">{p.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-white/[0.06] px-4 py-3 text-xs text-white/50">{p.rol_global || 'cliente'}</td>
                    <td className="border-b border-white/[0.06] px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${badgeCls}`}>
                        {nivelLabel}
                      </span>
                    </td>
                    <td className="border-b border-white/[0.06] px-4 py-3 font-semibold text-white">
                      {nivel ? `#${p.cert_numero || '—'}` : '—'}
                    </td>
                    <td className="border-b border-white/[0.06] px-4 py-3">
                      <span className={`flex items-center gap-1.5 text-xs font-semibold ${vigente ? 'text-emerald-400' : 'text-white/40'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${vigente ? 'bg-emerald-400' : 'bg-white/30'}`} />
                        {vigente ? 'Vigente' : 'No vigente'}
                      </span>
                    </td>
                    <td className="border-b border-white/[0.06] px-4 py-3">
                      <button
                        onClick={() => setModalUser(p)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-85"
                      >
                        <Pencil className="h-3 w-3" />
                        {nivel ? 'Editar' : 'Certificar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {perfiles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-white/40">
                    Sin usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalUser && (
        <CertModal
          perfil={modalUser}
          onClose={() => setModalUser(null)}
          onSaved={async () => {
            setModalUser(null);
            await cargarConsultores();
          }}
        />
      )}
    </div>
  );
}

/* ── Header ─────────────────────────────────────────────────────────────── */
function Header({ onReload }: { onReload?: () => void }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">Admin</p>
        <h1 className="text-2xl font-bold text-white">Consultores</h1>
      </div>
      {onReload && (
        <button
          onClick={onReload}
          title="Recargar"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition hover:bg-white/[0.06] hover:text-white"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ── Modal: asignar / revocar certificación ────────────────────────────── */
function CertModal({
  perfil, onClose, onSaved,
}: {
  perfil: Perfil; onClose: () => void; onSaved: () => void;
}) {
  const [nivel, setNivel] = useState<string>(perfil.nivel_consultor || 'junior');
  const [certNumero, setCertNumero] = useState(perfil.cert_numero || '');
  const [certFecha, setCertFecha] = useState(perfil.cert_emitida_en || hoy());
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err' | null; text: string }>({ type: null, text: '' });

  const nombre = [perfil.nombre, perfil.apellido].filter(Boolean).join(' ') || '(sin nombre)';

  async function asignar() {
    if (!nivel || !certNumero.trim() || !certFecha) {
      setFeedback({ type: 'err', text: 'Completa todos los campos' });
      return;
    }
    setBusy(true);
    setFeedback({ type: null, text: 'Asignando…' });
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('asignar_certificacion', {
        p_usuario_id: perfil.id,
        p_nivel: nivel,
        p_cert_numero: certNumero.trim(),
        p_cert_emitida_en: certFecha,
      });
      if (error) throw error;
      setFeedback({ type: 'ok', text: '✓ Certificación asignada' });
      setTimeout(onSaved, 800);
    } catch (err: any) {
      setFeedback({ type: 'err', text: '✗ Error: ' + (err?.message ?? 'desconocido') });
    } finally {
      setBusy(false);
    }
  }

  async function revocar() {
    if (!confirm('¿Confirmas que deseas revocar la certificación?')) return;
    setBusy(true);
    setFeedback({ type: null, text: 'Revocando…' });
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('revocar_certificacion', {
        p_usuario_id: perfil.id,
      });
      if (error) throw error;
      setFeedback({ type: 'ok', text: '✓ Certificación revocada' });
      setTimeout(onSaved, 800);
    } catch (err: any) {
      setFeedback({ type: 'err', text: '✗ Error: ' + (err?.message ?? 'desconocido') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/[0.13] bg-[#1c1c1e] p-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="text-[17px] font-extrabold text-white">
            {perfil.nivel_consultor ? 'Editar certificación' : 'Asignar certificación'}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/50 transition hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-5">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-xs font-extrabold text-white">
            {perfil.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={perfil.avatar_url} alt={getIniciales(perfil.nombre, perfil.apellido)} className="h-full w-full object-cover" />
            ) : (
              getIniciales(perfil.nombre, perfil.apellido)
            )}
          </div>
          <div>
            <div className="text-[15px] font-bold text-white">{nombre}</div>
            <div className="text-xs text-white/40">{perfil.email || '—'}</div>
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">Nivel de consultor</div>
          <select
            value={nivel}
            onChange={(e) => setNivel(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#141416] px-3 py-2 text-sm text-white outline-none transition focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25"
          >
            <option value="junior">Junior</option>
            <option value="senior">Senior</option>
            <option value="master">Master</option>
            <option value="master_certificador">Master Certificador</option>
          </select>
        </div>

        <div className="mb-4">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">Número de certificación</div>
          <input
            value={certNumero}
            onChange={(e) => setCertNumero(e.target.value)}
            placeholder="JR-017"
            className="w-full rounded-lg border border-white/10 bg-[#141416] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25"
          />
        </div>

        <div className="mb-2">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">Fecha de certificación</div>
          <input
            type="date"
            value={certFecha}
            onChange={(e) => setCertFecha(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#141416] px-3 py-2 text-sm text-white outline-none transition focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25"
          />
        </div>

        <div className="mt-6 flex gap-2.5">
          <button
            onClick={asignar}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
            Asignar certificación
          </button>
          {perfil.nivel_consultor && (
            <button
              onClick={revocar}
              disabled={busy}
              className="rounded-lg border border-red-500/60 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-400 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Revocar
            </button>
          )}
        </div>

        {feedback.text && (
          <div className={`mt-3.5 text-center text-xs ${feedback.type === 'ok' ? 'text-emerald-400' : feedback.type === 'err' ? 'text-red-400' : 'text-white/40'}`}>
            {feedback.text}
          </div>
        )}
      </div>
    </div>
  );
}
