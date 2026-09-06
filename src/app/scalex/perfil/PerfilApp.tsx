'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  User as UserIcon, Camera, Upload, BadgeCheck, Loader2, KeyRound,
} from 'lucide-react';

/* ── Tipos (espejo de la tabla `perfiles` del portal) ───────────────────── */
type Perfil = {
  id: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  cargo: string | null;
  bio: string | null;
  ciudad: string | null;
  pais: string | null;
  telefono: string | null;
  anios_experiencia: number | null;
  avatar_url: string | null;
  nivel_consultor: 'junior' | 'senior' | 'master' | 'master_certificador' | null;
  cert_numero: string | null;
  cert_emitida_en: string | null;
  cert_vigente: boolean | null;
};

type FieldStatus = 'idle' | 'saving' | 'saved' | 'error';

const NIVEL_LABEL: Record<string, string> = {
  junior: 'Consultor Junior',
  senior: 'Consultor Senior',
  master: 'Consultor Master',
  master_certificador: 'Master Certificador',
};
const NIVEL_BADGE_CLS: Record<string, string> = {
  junior: 'bg-[#1aab99]/15 text-[#1aab99] border border-[#1aab99]/40',
  senior: 'bg-[#3533cd]/15 text-[#8b8af8] border border-[#3533cd]/40',
  master: 'bg-purple-500/15 text-purple-300 border border-purple-500/40',
  master_certificador: 'bg-gradient-to-br from-[#d4a256]/15 to-[#1aab99]/10 text-[#d4a256] border border-[#d4a256]/40',
};

function getIniciales(nombre?: string | null, apellido?: string | null) {
  const n = (nombre || '').trim();
  const a = (apellido || '').trim();
  if (n && a) return (n[0] + a[0]).toUpperCase();
  if (n) return n.slice(0, 2).toUpperCase();
  return '?';
}

function fmtFecha(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
}

/* ── UI helpers (dark-glow) ─────────────────────────────────────────────── */
function Card({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
      <div className="mb-5 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#1aab99]" />
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">{children}</div>;
}
const inputCls =
  'w-full rounded-lg border border-white/10 bg-[#141416] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25 disabled:cursor-not-allowed disabled:opacity-50';

function StatusHint({ status }: { status: FieldStatus }) {
  if (status === 'idle') return <div className="mt-1 h-4" />;
  const map: Record<Exclude<FieldStatus, 'idle'>, { text: string; cls: string }> = {
    saving: { text: 'Guardando…', cls: 'text-white/40' },
    saved: { text: '✓ Guardado', cls: 'text-emerald-400' },
    error: { text: '✗ Error al guardar', cls: 'text-red-400' },
  };
  const s = map[status];
  return <div className={`mt-1 h-4 text-[11px] font-semibold ${s.cls}`}>{s.text}</div>;
}

/* ── App ────────────────────────────────────────────────────────────────── */
export function PerfilApp() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [fieldStatus, setFieldStatus] = useState<Record<string, FieldStatus>>({});
  const [avatarStatus, setAvatarStatus] = useState<FieldStatus>('idle');
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const { data } = await supabase.from('perfiles').select('*').eq('id', user.id).maybeSingle();
      const prof: Perfil = {
        id: user.id,
        nombre: data?.nombre ?? '',
        apellido: data?.apellido ?? '',
        email: data?.email ?? user.email ?? '',
        cargo: data?.cargo ?? '',
        bio: data?.bio ?? '',
        ciudad: data?.ciudad ?? '',
        pais: data?.pais ?? 'MX',
        telefono: data?.telefono ?? '',
        anios_experiencia: data?.anios_experiencia ?? 0,
        avatar_url: data?.avatar_url ?? null,
        nivel_consultor: data?.nivel_consultor ?? null,
        cert_numero: data?.cert_numero ?? null,
        cert_emitida_en: data?.cert_emitida_en ?? null,
        cert_vigente: data?.cert_vigente ?? null,
      };
      setPerfil(prof);
      setLoading(false);
    })();
  }, []);

  function updateField<K extends keyof Perfil>(column: K, value: Perfil[K], indicatorKey: string, isNumber = false) {
    if (!perfil || !userId) return;
    setPerfil({ ...perfil, [column]: value });
    setFieldStatus((s) => ({ ...s, [indicatorKey]: 'saving' }));

    if (timers.current[indicatorKey]) clearTimeout(timers.current[indicatorKey]);
    timers.current[indicatorKey] = setTimeout(async () => {
      const supabase = createClient();
      const payload = isNumber ? { [column]: Number(value) } : { [column]: value };
      const { error } = await supabase.from('perfiles').update(payload).eq('id', userId);
      setFieldStatus((s) => ({ ...s, [indicatorKey]: error ? 'error' : 'saved' }));
      if (!error) {
        setTimeout(() => setFieldStatus((s) => ({ ...s, [indicatorKey]: 'idle' })), 2500);
      }
    }, 900);
  }

  async function handleAvatarUpload(file: File | undefined) {
    if (!file || !userId) return;
    setAvatarError(null);
    if (file.size > 2 * 1024 * 1024) {
      setAvatarStatus('error');
      setAvatarError('Máximo 2 MB');
      return;
    }
    setAvatarStatus('saving');
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatares')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatares').getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase.from('perfiles').update({ avatar_url: publicUrl }).eq('id', userId);
      if (updateError) throw updateError;

      setPerfil((p) => (p ? { ...p, avatar_url: publicUrl } : p));
      setAvatarStatus('saved');
      setTimeout(() => setAvatarStatus('idle'), 2500);
    } catch (err: any) {
      setAvatarStatus('error');
      setAvatarError(err?.message ?? 'Error al subir');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-16 text-center">
        <h2 className="text-xl font-bold text-white">No se pudo cargar tu perfil</h2>
        <p className="mt-2 text-white/50">Intenta recargar la página.</p>
      </div>
    );
  }

  const iniciales = getIniciales(perfil.nombre, perfil.apellido);

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">Cuenta</p>
        <h1 className="text-2xl font-bold text-white">Mi Perfil</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Columna izquierda: foto + certificación + contraseña */}
        <div className="flex flex-col gap-4">
          <Card icon={Camera} title="Foto de perfil">
            <div className="flex flex-col items-center gap-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex h-28 w-28 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-3xl font-extrabold text-white"
              >
                {perfil.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={perfil.avatar_url} alt={iniciales} className="h-full w-full object-cover" />
                ) : (
                  <span>{iniciales}</span>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleAvatarUpload(e.target.files?.[0])}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/[0.08] hover:text-white"
              >
                <Upload className="h-3.5 w-3.5" /> Subir foto
              </button>
              <p className="text-center text-[11px] leading-relaxed text-white/40">
                JPG o PNG · Máx 2 MB
                <br />
                Se guarda automáticamente
              </p>
              <div className="h-4 text-[11px] font-semibold">
                {avatarStatus === 'saving' && <span className="text-white/40">Subiendo foto…</span>}
                {avatarStatus === 'saved' && <span className="text-emerald-400">✓ Foto actualizada</span>}
                {avatarStatus === 'error' && <span className="text-red-400">✗ {avatarError || 'Error al subir'}</span>}
              </div>
            </div>
          </Card>

          <Card icon={BadgeCheck} title="Certificación">
            {!perfil.nivel_consultor ? (
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3.5 text-sm italic leading-relaxed text-white/40">
                Aún no tienes asignación de certificación.
                <br />
                Contacta al Owner para que te asigne nivel y número.
              </div>
            ) : (
              <div className="space-y-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold ${NIVEL_BADGE_CLS[perfil.nivel_consultor] ?? 'bg-white/[0.06] text-white/60'}`}>
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {NIVEL_LABEL[perfil.nivel_consultor] ?? perfil.nivel_consultor}
                </span>
                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-white/40">Número</span>
                    <span className="font-semibold text-white">#{perfil.cert_numero || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Emitida</span>
                    <span className="font-semibold text-white">{fmtFecha(perfil.cert_emitida_en)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/40">Estado</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${perfil.cert_vigente ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/[0.06] text-white/40'}`}>
                      {perfil.cert_vigente ? '● Vigente' : '● No vigente'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card icon={KeyRound} title="Contraseña">
            <p className="mb-3 text-sm leading-relaxed text-white/50">
              Gestiona tu contraseña desde el enlace de recuperación en la pantalla de inicio de sesión.
            </p>
            <button disabled className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/40">
              <KeyRound className="h-4 w-4" /> Cambiar contraseña
            </button>
          </Card>
        </div>

        {/* Columna derecha: datos editables */}
        <Card icon={UserIcon} title="Información personal">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nombre</Label>
              <input
                className={inputCls} placeholder="Roman" value={perfil.nombre ?? ''}
                onChange={(e) => updateField('nombre', e.target.value, 'nombre')}
              />
              <StatusHint status={fieldStatus.nombre ?? 'idle'} />
            </div>
            <div>
              <Label>Apellido</Label>
              <input
                className={inputCls} placeholder="Cantú" value={perfil.apellido ?? ''}
                onChange={(e) => updateField('apellido', e.target.value, 'apellido')}
              />
              <StatusHint status={fieldStatus.apellido ?? 'idle'} />
            </div>

            <div className="sm:col-span-2">
              <Label>Email</Label>
              <input className={inputCls} value={perfil.email ?? ''} disabled />
              <div className="mt-1 h-4" />
            </div>

            <div className="sm:col-span-2">
              <Label>Cargo</Label>
              <input
                className={inputCls} placeholder="Consultor Junior, Director, CEO…" value={perfil.cargo ?? ''}
                onChange={(e) => updateField('cargo', e.target.value, 'cargo')}
              />
              <StatusHint status={fieldStatus.cargo ?? 'idle'} />
            </div>

            <div className="sm:col-span-2">
              <Label>Bio breve</Label>
              <textarea
                className={`${inputCls} min-h-[80px] resize-y`} placeholder="Describe brevemente tu experiencia y enfoque…"
                value={perfil.bio ?? ''}
                onChange={(e) => updateField('bio', e.target.value, 'bio')}
              />
              <StatusHint status={fieldStatus.bio ?? 'idle'} />
            </div>

            <div>
              <Label>Ciudad</Label>
              <input
                className={inputCls} placeholder="Monterrey" value={perfil.ciudad ?? ''}
                onChange={(e) => updateField('ciudad', e.target.value, 'ciudad')}
              />
              <StatusHint status={fieldStatus.ciudad ?? 'idle'} />
            </div>
            <div>
              <Label>País</Label>
              <input
                className={inputCls} placeholder="MX" value={perfil.pais ?? ''}
                onChange={(e) => updateField('pais', e.target.value, 'pais')}
              />
              <StatusHint status={fieldStatus.pais ?? 'idle'} />
            </div>

            <div>
              <Label>Teléfono</Label>
              <input
                type="tel" className={inputCls} placeholder="+52 81 0000 0000" value={perfil.telefono ?? ''}
                onChange={(e) => updateField('telefono', e.target.value, 'telefono')}
              />
              <StatusHint status={fieldStatus.telefono ?? 'idle'} />
            </div>
            <div>
              <Label>Años de experiencia</Label>
              <select
                className={inputCls} value={perfil.anios_experiencia ?? 0}
                onChange={(e) => updateField('anios_experiencia', Number(e.target.value), 'anios_experiencia', true)}
              >
                <option value={0}>Sin experiencia</option>
                <option value={1}>1 año</option>
                <option value={2}>2 años</option>
                <option value={3}>3 años</option>
                <option value={5}>5 años</option>
                <option value={10}>10+ años</option>
              </select>
              <StatusHint status={fieldStatus.anios_experiencia ?? 'idle'} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
