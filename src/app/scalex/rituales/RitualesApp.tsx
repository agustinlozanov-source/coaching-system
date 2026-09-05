'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileSignature, Users, Rocket, ArrowRight, ArrowLeft, FileText, User as UserIcon,
  Calendar, Clock, Lock, PenTool, Check, CheckCircle2, Info, Eraser, Type,
  UserPlus, AlertCircle, CreditCard, Lightbulb, Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/teamx/org';

/* ── Tipos ──────────────────────────────────────────────────────────────── */
type Contrato = {
  id: string; organizacion_id: string; tipo: string; estado: 'borrador' | 'firmado';
  version: string | null; empresa_nombre: string | null; firmante_nombre: string | null;
  firmante_cargo: string | null; lugar: string | null; vigencia_meses: number | null;
  signed_at: string | null; expires_at: string | null;
};
type Firma = { id: string; contrato_id: string; signature_data: string; signed_at: string };
type Consejo = { id: string; organizacion_id: string; cuota_trimestral: number | null; cuota_moneda: string | null };
type Miembro = { id: string; nombre: string; apellido: string | null; area: string | null };
type Sesion = { id: string; titulo: string; fecha_programada: string; estado: string; duracion_min: number | null };
type Pago = { id: string; monto: number | null; moneda: string | null; trimestre: string; ano: number; estado: string; fecha_vencimiento: string | null };
type Perfil = { id: string; nombre: string | null; apellido: string | null; email: string | null };

type View = 'lista' | 'contrato' | 'consejo';

/* ── Helpers ────────────────────────────────────────────────────────────── */
const MESES_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_CAL = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const initials = (name: string) => {
  if (!name.trim()) return '··';
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? p[0]?.[1] ?? '')).toUpperCase();
};
const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()} ${MESES_SHORT[d.getMonth()]}`;
};
const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const fmtMoney = (amount?: number | null, currency = 'MXN') => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
};
const fmtFullDate = () => {
  const n = new Date();
  return `${n.getDate()} de ${MESES_LONG[n.getMonth()]} de ${n.getFullYear()}`;
};

async function sha256(text: string) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ══════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════════════════════════════════════ */
export function RitualesApp() {
  const [view, setView] = useState<View>('lista');
  const [loading, setLoading] = useState(true);

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [orgNombre, setOrgNombre] = useState<string>('');
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [firmaGuardada, setFirmaGuardada] = useState<Firma | null>(null);
  const [consejo, setConsejo] = useState<Consejo | null>(null);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);

  /* ── Carga inicial ── */
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const orgId = await getActiveOrgId();
      const { data: { user } } = await supabase.auth.getUser();
      if (!orgId || !user) { setLoading(false); return; }

      const [{ data: perfilData }, { data: org }] = await Promise.all([
        supabase.from('perfiles').select('id, nombre, apellido, email').eq('id', user.id).maybeSingle(),
        supabase.from('organizaciones').select('nombre').eq('id', orgId).maybeSingle(),
      ]);
      const prof: Perfil = perfilData ?? { id: user.id, nombre: '', apellido: '', email: user.email ?? '' };
      if (!prof.email) prof.email = user.email ?? '';
      setPerfil(prof);
      setOrgNombre(org?.nombre ?? '');

      // Contrato (crear borrador si no existe)
      let { data: c } = await supabase
        .from('contratos').select('*')
        .eq('organizacion_id', orgId).eq('tipo', 'dueno')
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!c) {
        const ins = await supabase.from('contratos').insert({
          organizacion_id: orgId, tipo: 'dueno', estado: 'borrador', version: 'v1.0',
          empresa_nombre: org?.nombre ?? '',
          firmante_nombre: `${prof.nombre ?? ''} ${prof.apellido ?? ''}`.trim(),
          firmante_cargo: 'Director General · Dueño',
          lugar: 'Monterrey, Nuevo León, México', vigencia_meses: 12, created_by: prof.id,
        }).select('*').single();
        c = ins.data;
      }
      setContrato(c as Contrato | null);
      if (c?.estado === 'firmado') {
        const { data: firmas } = await supabase
          .from('contrato_firmas').select('*').eq('contrato_id', c.id)
          .order('signed_at', { ascending: true });
        if (firmas?.length) setFirmaGuardada(firmas[firmas.length - 1] as Firma);
      }

      // Consejo
      const { data: cons } = await supabase
        .from('consejos').select('*').eq('organizacion_id', orgId).maybeSingle();
      if (cons) {
        setConsejo(cons as Consejo);
        const [{ data: m }, { data: s }, { data: p }] = await Promise.all([
          supabase.from('consejo_miembros').select('*').eq('consejo_id', cons.id).eq('estado', 'activo').order('created_at'),
          supabase.from('consejo_sesiones').select('*').eq('consejo_id', cons.id).order('fecha_programada', { ascending: false }),
          supabase.from('consejo_pagos').select('*').eq('consejo_id', cons.id).order('ano', { ascending: false }).order('trimestre', { ascending: false }),
        ]);
        setMiembros((m ?? []) as Miembro[]);
        setSesiones((s ?? []) as Sesion[]);
        setPagos((p ?? []) as Pago[]);
      }

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  const eyebrow = view === 'lista' ? 'Pilar 4 · Ritmo' : view === 'contrato' ? 'Ritual #1 · Compromiso' : 'Ritual #2 · Rendición';
  const title = view === 'lista' ? 'Rituales de Efectividad' : view === 'contrato' ? 'Contrato del Dueño' : 'Consejo de Escalabilidad';

  return (
    <div>
      {/* Topbar */}
      <div className="mb-6 flex items-center gap-3">
        {view !== 'lista' && (
          <button onClick={() => setView('lista')}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition hover:bg-white/[0.06] hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">{eyebrow}</p>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
        </div>
      </div>

      {view === 'lista' && (
        <ListaView contrato={contrato} consejo={consejo} miembros={miembros} sesiones={sesiones} onOpen={setView} />
      )}
      {view === 'contrato' && contrato && (
        <ContratoView
          contrato={contrato} perfil={perfil} firmaGuardada={firmaGuardada}
          onContratoChange={setContrato} onFirmada={(f) => setFirmaGuardada(f)}
        />
      )}
      {view === 'consejo' && (
        <ConsejoView consejo={consejo} miembros={miembros} sesiones={sesiones} pagos={pagos} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   VISTA 1 — LISTA
   ══════════════════════════════════════════════════════════════════════════ */
function ListaView({
  contrato, consejo, miembros, sesiones, onOpen,
}: {
  contrato: Contrato | null; consejo: Consejo | null; miembros: Miembro[]; sesiones: Sesion[];
  onOpen: (v: View) => void;
}) {
  const firmado = contrato?.estado === 'firmado';
  const proxSesion = sesiones.find((s) => s.estado === 'programada');

  return (
    <>
      <p className="-mt-3 mb-6 text-white/50">Disciplinas que sostienen la escalabilidad de tu empresa.</p>
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Contrato */}
        <RitualCard
          icon={FileSignature} nombre="Contrato del Dueño" pilar="Compromiso fundacional"
          status={firmado ? 'active' : 'pending'} statusText={firmado ? 'Firmado' : 'Por firmar'}
          desc="Tu manifiesto personal con la escalabilidad. Antes de pedir compromiso al equipo, el líder se compromete consigo mismo."
          meta={[{ icon: FileText, text: '6 cláusulas' }, { icon: UserIcon, text: 'Solo dueño' }]}
          cta={firmado ? 'Ver contrato' : 'Firmar ahora'} onClick={() => onOpen('contrato')}
        />
        {/* Consejo */}
        <RitualCard
          icon={Users} nombre="Consejo de Escalabilidad" pilar="Rendición trimestral"
          status={consejo ? 'active' : 'pending'} statusText={consejo ? 'Activo' : 'Sin configurar'}
          desc="2-3 personas con expertise multidisciplinario que están «arriba» del dueño. Rendición de cuentas trimestral y valor estratégico."
          meta={[
            { icon: Users, text: `${miembros.length}/3 miembros` },
            { icon: Calendar, text: `Próx. ${fmtDate(proxSesion?.fecha_programada)}` },
          ]}
          cta="Ver detalles" onClick={() => onOpen('consejo')}
        />
        {/* Kick-off (bloqueado) */}
        <RitualCard
          icon={Rocket} nombre="Kick-off de Trimestre" pilar="Patada de salida"
          status="inactive" statusText="Próximamente"
          desc="La patada de salida del trimestre. Disponible al firmar el Contrato del Dueño."
          meta={[{ icon: Lock, text: 'Bloqueado' }]} locked
        />
      </div>
    </>
  );
}

function RitualCard({
  icon: Icon, nombre, pilar, status, statusText, desc, meta, cta, onClick, locked,
}: {
  icon: any; nombre: string; pilar: string;
  status: 'active' | 'pending' | 'inactive'; statusText: string; desc: string;
  meta: { icon: any; text: string }[]; cta?: string; onClick?: () => void; locked?: boolean;
}) {
  const statusCls =
    status === 'active' ? 'bg-emerald-500/15 text-emerald-400'
      : status === 'pending' ? 'bg-amber-500/15 text-amber-400'
        : 'bg-white/[0.06] text-white/40';
  return (
    <div
      onClick={locked ? undefined : onClick}
      className={`flex flex-col rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5 ${
        locked ? 'opacity-60' : 'cursor-pointer transition hover:border-white/20 hover:bg-[#242426]'
      }`}
    >
      <div className="mb-3 flex items-start gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${locked ? 'bg-white/[0.06] text-white/40' : 'bg-gradient-to-br from-[#1aab99]/20 to-[#3533cd]/20 text-[#1aab99]'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-white">{nombre}</div>
          <div className="text-xs text-white/40">{pilar}</div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusCls}`}>{statusText}</span>
      </div>
      <p className="mb-4 flex-1 text-sm leading-relaxed text-white/50">{desc}</p>
      <div className="flex flex-wrap items-center gap-4 border-t border-white/[0.06] pt-3">
        {meta.map((m, i) => {
          const M = m.icon;
          return (
            <span key={i} className="flex items-center gap-1.5 text-xs text-white/50">
              <M className="h-3.5 w-3.5" /> {m.text}
            </span>
          );
        })}
        {cta && (
          <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-[#1aab99]">
            {cta} <ArrowRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   VISTA 2 — CONTRATO DEL DUEÑO
   ══════════════════════════════════════════════════════════════════════════ */
function ContratoView({
  contrato, perfil, firmaGuardada, onContratoChange, onFirmada,
}: {
  contrato: Contrato; perfil: Perfil | null; firmaGuardada: Firma | null;
  onContratoChange: (c: Contrato) => void; onFirmada: (f: Firma) => void;
}) {
  const firmado = contrato.estado === 'firmado';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const drawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signing, setSigning] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    canvas.width = wrap.clientWidth;
    canvas.height = wrap.clientHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Si ya está firmado, pintar la firma guardada
    if (firmado && firmaGuardada) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = firmaGuardada.signature_data;
      setShowPlaceholder(false);
      setHasSignature(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmado, firmaGuardada]);

  const pos = (e: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const start = (x: number, y: number) => {
    if (firmado) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    drawing.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setShowPlaceholder(false);
  };
  const move = (x: number, y: number) => {
    if (!drawing.current || firmado) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };
  const end = () => { drawing.current = false; };

  const onMouseDown = (e: React.MouseEvent) => { const p = pos(e.nativeEvent); start(p.x, p.y); };
  const onMouseMove = (e: React.MouseEvent) => { const p = pos(e.nativeEvent); move(p.x, p.y); };
  const onTouchStart = (e: React.TouchEvent) => { e.preventDefault(); const p = pos(e.touches[0]); start(p.x, p.y); };
  const onTouchMove = (e: React.TouchEvent) => { e.preventDefault(); const p = pos(e.touches[0]); move(p.x, p.y); };

  const clearSig = () => {
    const canvas = canvasRef.current!;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setShowPlaceholder(true);
  };
  const typedSig = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = "italic 38px 'Caveat', cursive";
    const nombre = perfil ? `${perfil.nombre ?? ''} ${perfil.apellido ?? ''}`.trim() : 'Firma';
    ctx.fillText(nombre || 'Firma', 24, 88);
    setHasSignature(true);
    setShowPlaceholder(false);
  };

  // Autosave de nombre/empresa
  const scheduleFieldSave = useCallback((updates: Partial<Contrato>) => {
    if (firmado) return;
    const next = { ...contrato, ...updates };
    onContratoChange(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const supabase = createClient();
      await supabase.from('contratos').update({
        firmante_nombre: next.firmante_nombre, empresa_nombre: next.empresa_nombre,
      }).eq('id', contrato.id);
    }, 800);
  }, [contrato, firmado, onContratoChange]);

  async function signContract() {
    if (!canvasRef.current || !hasSignature || !perfil) return;
    setSigning(true);
    try {
      const supabase = createClient();
      const signatureData = canvasRef.current.toDataURL('image/png');
      const contractText = `${contrato.empresa_nombre}|${contrato.firmante_nombre}|${contrato.firmante_cargo}|${contrato.lugar}|v1.0`;
      const docHash = await sha256(contractText);
      const nowIso = new Date().toISOString();

      const { error: e1 } = await supabase.from('contrato_firmas').insert({
        contrato_id: contrato.id, user_id: perfil.id,
        nombre_firmante: contrato.firmante_nombre, cargo: contrato.firmante_cargo, email: perfil.email,
        signature_data: signatureData, metodo_firma: 'canvas', ip_address: null,
        user_agent: navigator.userAgent, signed_at_iso: nowIso, hash_documento: docHash,
      });
      if (e1) throw e1;

      const expires = new Date();
      expires.setMonth(expires.getMonth() + (contrato.vigencia_meses ?? 12));
      const { error: e2 } = await supabase.from('contratos').update({
        estado: 'firmado', signed_at: nowIso, expires_at: expires.toISOString(),
        clausulas_snapshot: { version: 'v1.0', texto: 'Contrato de Compromiso con la Escalabilidad — 6 cláusulas + Preámbulo', firmado_at: nowIso },
      }).eq('id', contrato.id);
      if (e2) throw e2;

      onContratoChange({ ...contrato, estado: 'firmado', signed_at: nowIso });
      onFirmada({ id: 'local', contrato_id: contrato.id, signature_data: signatureData, signed_at: nowIso });
    } catch (err: any) {
      alert('Error al firmar: ' + (err?.message ?? 'desconocido'));
    } finally {
      setSigning(false);
    }
  }

  // Progreso de firma: 1 (lectura) siempre; 2 (firma) si hasSignature; 3 (confirmación) si firmado
  const checks = [
    { done: true, text: 'Lectura del contrato' },
    { done: hasSignature, text: 'Firma manuscrita' },
    { done: firmado, text: 'Confirmación final' },
  ];
  const progress = (checks.filter((c) => c.done).length / 3) * 100;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Documento */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161618] p-8 sm:p-10">
        <div className="pointer-events-none absolute right-6 top-6 text-[11px] font-bold uppercase tracking-[0.3em] text-white/[0.06]">
          SCALEx · LATAM
        </div>

        <div className="mb-8 border-b border-white/[0.08] pb-6 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1aab99]">Ritual de Efectividad #1</div>
          <h2 className="mt-2 text-2xl font-extrabold leading-tight text-white">Contrato de Compromiso<br />con la Escalabilidad</h2>
          <p className="mt-2 text-sm text-white/50">El líder se compromete consigo mismo antes de pedir compromiso al equipo</p>
        </div>

        <p className="mb-8 leading-relaxed text-white/80">
          Yo,{' '}
          <input
            value={contrato.firmante_nombre ?? ''} disabled={firmado} placeholder="Tu nombre"
            onChange={(e) => scheduleFieldSave({ firmante_nombre: e.target.value })}
            className="inline-block min-w-[160px] border-b border-[#1aab99]/50 bg-transparent px-1 text-white outline-none placeholder:text-white/25 focus:border-[#1aab99] disabled:opacity-70"
          />
          , en mi calidad de dueño y líder de{' '}
          <input
            value={contrato.empresa_nombre ?? ''} disabled={firmado} placeholder="Tu empresa"
            onChange={(e) => scheduleFieldSave({ empresa_nombre: e.target.value })}
            className="inline-block min-w-[240px] border-b border-[#1aab99]/50 bg-transparent px-1 text-white outline-none placeholder:text-white/25 focus:border-[#1aab99] disabled:opacity-70"
          />
          , declaro lo siguiente y lo asumo como guía no negociable de mi conducta empresarial:
        </p>

        {CLAUSULAS.map((cl) => (
          <div key={cl.num} className="mb-6">
            <div className="mb-2 flex items-center gap-3 font-bold text-white">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-xs font-extrabold text-white">
                {cl.num}
              </span>
              {cl.title}
            </div>
            <div className="pl-10 text-sm leading-relaxed text-white/70">{cl.body}</div>
          </div>
        ))}

        {/* Bloque de firma */}
        <div className="mt-8 grid gap-8 border-t border-white/[0.08] pt-8 sm:grid-cols-2">
          <div className="flex flex-col gap-4 text-sm">
            {[
              ['Firmante', contrato.firmante_nombre],
              ['Cargo', contrato.firmante_cargo],
              ['Fecha', contrato.signed_at ? new Date(contrato.signed_at).toLocaleDateString('es-MX', { dateStyle: 'long' }) : fmtFullDate()],
              ['Lugar', contrato.lugar],
            ].map(([label, value]) => (
              <div key={label as string}>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-white/40">{label}</div>
                <div className="mt-0.5 font-semibold text-white">{value || '—'}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">Tu firma manuscrita</div>
            <div ref={wrapRef}
              className={`relative h-[140px] rounded-xl border ${hasSignature ? 'border-[#1aab99]/50 bg-[#1aab99]/[0.04]' : 'border-dashed border-white/15 bg-[#141416]'}`}>
              <canvas
                ref={canvasRef}
                className="h-full w-full touch-none"
                style={{ pointerEvents: firmado ? 'none' : 'auto' }}
                onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={end} onMouseLeave={end}
                onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={end}
              />
              {showPlaceholder && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/25">Firma aquí</div>
              )}
            </div>
            {!firmado && (
              <div className="mt-2 flex gap-2">
                <button onClick={clearSig} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/[0.06] hover:text-white">
                  <Eraser className="h-3.5 w-3.5" /> Limpiar
                </button>
                <button onClick={typedSig} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/[0.06] hover:text-white">
                  <Type className="h-3.5 w-3.5" /> Escribir
                </button>
              </div>
            )}
          </div>
        </div>

        {firmado && (
          <div className="mt-8 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-white">Contrato firmado</div>
              <div className="text-sm text-white/50">
                Firmado · {contrato.signed_at ? new Date(contrato.signed_at).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' }) : ''}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Columna derecha */}
      <div className="flex flex-col gap-4">
        {!firmado && (
          <div className="rounded-2xl border border-[#1aab99]/30 bg-gradient-to-br from-[#1aab99]/10 to-[#3533cd]/10 p-5">
            <div className="font-bold text-white">Listo para firmar</div>
            <p className="mt-1.5 text-sm leading-relaxed text-white/60">
              Al firmar confirmas tu compromiso con la metodología SCALEx y con la escalabilidad de tu empresa.
            </p>
            <button
              onClick={signContract} disabled={!hasSignature || signing}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenTool className="h-4 w-4" />}
              {signing ? 'Firmando…' : 'Firmar Contrato'}
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
            <CheckCircle2 className="h-4 w-4 text-[#1aab99]" /> Progreso de firma
          </div>
          <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-[#1aab99] to-[#3533cd] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex flex-col gap-3">
            {checks.map((c, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full ${c.done ? 'bg-emerald-500 text-white' : 'border border-white/15 bg-white/[0.04]'}`}>
                  {c.done && <Check className="h-3 w-3" />}
                </span>
                <span className={c.done ? 'text-white' : 'text-white/50'}>{c.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
            <Info className="h-4 w-4 text-[#1aab99]" /> Información del documento
          </div>
          <div className="flex flex-col gap-2 text-sm">
            {[['Versión', 'v1.0'], ['Cláusulas', '6 + Preámbulo'], ['Firmantes', 'Solo dueño'], ['Validez', '12 meses']].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-white/50">{k}</span>
                <span className="font-semibold text-white">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Cláusulas del contrato (texto fiel al portal) */
const CLAUSULAS: { num: string; title: string; body: React.ReactNode }[] = [
  {
    num: 'P', title: 'Preámbulo · Considerandos',
    body: (
      <ul className="ml-4 list-disc space-y-1.5">
        <li>Reconozco que <em>escalar mi empresa requiere disciplina, no inspiración</em>.</li>
        <li>Acepto que la metodología <strong>SCALEx</strong> es el marco que voy a seguir, en sus 5 pilares: Reflejo, ADN, Vector, Ritmo y Flujo.</li>
        <li>Entiendo que los resultados dependen primero de mi compromiso, no del de otros.</li>
      </ul>
    ),
  },
  { num: '1', title: 'Del compromiso con la Visión', body: 'Me comprometo a sostener el Vector Audaz de mi empresa —tal como queda registrado en mi OPSP— y a no abandonarlo por presiones de corto plazo, ruido del mercado, o desánimo personal. La visión es el norte; las tácticas se ajustan, el rumbo no.' },
  {
    num: '2', title: 'Del compromiso con el Método',
    body: (
      <>Me comprometo a:
        <ul className="ml-4 mt-1.5 list-disc space-y-1.5">
          <li>Llenar y mantener actualizado mi <strong>OPSP</strong> cada trimestre.</li>
          <li>Activar y respetar los <strong>Rituales de Efectividad</strong> que correspondan a cada etapa.</li>
          <li>Rendir cuentas al <strong>Consejo de Escalabilidad</strong> cuando exista, con transparencia y sin maquillaje.</li>
        </ul>
      </>
    ),
  },
  {
    num: '3', title: 'Del compromiso con el Equipo',
    body: (
      <>Reconozco que no puedo escalar solo. Me comprometo a:
        <ul className="ml-4 mt-1.5 list-disc space-y-1.5">
          <li>Construir un equipo que pueda decirme <em>«no»</em> sin miedo a represalias.</li>
          <li>Pagar lo justo por talento que vale, sin regatear la pieza clave del crecimiento.</li>
          <li>Soltar el control donde otros pueden hacerlo mejor que yo.</li>
        </ul>
      </>
    ),
  },
  {
    num: '4', title: 'Del compromiso Financiero',
    body: (
      <>Me comprometo a:
        <ul className="ml-4 mt-1.5 list-disc space-y-1.5">
          <li>Conocer mis números cada semana, no solo cuando hay crisis.</li>
          <li>No mezclar finanzas personales con las de la empresa, en ningún caso.</li>
          <li>Mantener reservas operativas mínimas como disciplina, no como excepción.</li>
        </ul>
      </>
    ),
  },
  {
    num: '5', title: 'Del compromiso conmigo mismo',
    body: (
      <>Me comprometo a:
        <ul className="ml-4 mt-1.5 list-disc space-y-1.5">
          <li>Trabajar <em>EN</em> el negocio, no solo <em>en</em> él.</li>
          <li>Cuidar mi energía y mi salud como cuido el flujo de caja.</li>
          <li>No confundir actividad con productividad ni cantidad de horas con resultados.</li>
        </ul>
      </>
    ),
  },
  {
    num: '6', title: 'De las consecuencias',
    body: (
      <>Si rompo este contrato, acepto que:
        <ul className="ml-4 mt-1.5 list-disc space-y-1.5">
          <li>El Consejo de Escalabilidad me lo señalará sin titubear.</li>
          <li>Recalibraré mi OPSP y mis Rituales antes de seguir adelante.</li>
          <li>Volveré a firmar este contrato como acto consciente de reinicio.</li>
        </ul>
      </>
    ),
  },
];

/* ══════════════════════════════════════════════════════════════════════════
   VISTA 3 — CONSEJO DE ESCALABILIDAD
   ══════════════════════════════════════════════════════════════════════════ */
function ConsejoView({
  consejo, miembros, sesiones, pagos,
}: {
  consejo: Consejo | null; miembros: Miembro[]; sesiones: Sesion[]; pagos: Pago[];
}) {
  if (!consejo) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-16 text-center">
        <h2 className="text-xl font-bold text-white">Consejo no configurado</h2>
        <p className="mt-2 text-white/50">Contacta a tu consultor SCALEx para configurar tu Consejo de Escalabilidad.</p>
      </div>
    );
  }

  const gradients = ['from-[#1aab99] to-[#3533cd]', 'from-[#3533cd] to-[#8b5cf6]', 'from-[#f59e0b] to-[#ec4899]'];
  const slots = Math.max(0, 3 - miembros.length);
  const pagoPendiente = pagos.find((p) => p.estado === 'pendiente');
  const pagados = pagos.filter((p) => p.estado === 'pagado');

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {/* Columna izquierda */}
      <div className="flex flex-col gap-4">
        {/* Miembros */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
          <h2 className="text-lg font-extrabold text-white">Miembros del Consejo</h2>
          <p className="mt-0.5 text-sm text-white/50">2 a 3 personas con expertise multidisciplinario.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {miembros.map((m, i) => (
              <div key={m.id} className="flex flex-col items-center rounded-xl border border-white/[0.08] bg-[#141416] p-4 text-center">
                <div className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${gradients[i % 3]} text-lg font-extrabold text-white`}>
                  {initials(`${m.nombre} ${m.apellido ?? ''}`)}
                </div>
                <div className="mt-2 font-bold text-white">{m.nombre} {m.apellido ?? ''}</div>
                <div className="text-xs text-white/50">{m.area ?? '—'}</div>
                <span className="mt-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">Activo</span>
              </div>
            ))}
            {Array.from({ length: slots }).map((_, i) => (
              <div key={`empty-${i}`} className="flex flex-col items-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 text-white/30">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div className="mt-2 font-bold text-white/40">Agregar miembro</div>
                <div className="text-xs text-white/30">Por asignar</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sesiones */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
          <h2 className="text-lg font-extrabold text-white">Sesiones del Consejo</h2>
          <p className="mt-0.5 text-sm text-white/50">Una sesión por trimestre. Rendición de cuentas + entrega de valor.</p>
          <div className="mt-4 flex flex-col gap-2">
            {sesiones.length === 0 && <div className="py-3 text-sm text-white/40">Sin sesiones programadas.</div>}
            {sesiones.slice(0, 5).map((s) => {
              const d = new Date(s.fecha_programada);
              const past = s.estado === 'completada';
              const upcoming = s.estado === 'programada';
              const dur = s.duracion_min ?? 90;
              const dEnd = new Date(d.getTime() + dur * 60000);
              const statusCls = past ? 'bg-white/[0.06] text-white/50' : upcoming ? 'bg-[#1aab99]/15 text-[#1aab99]' : 'bg-amber-500/15 text-amber-400';
              const statusText = past ? 'Completada' : upcoming ? 'Próxima' : 'Programada';
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#141416] p-3">
                  <div className={`flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-lg ${past ? 'bg-white/[0.06] text-white/40' : 'bg-gradient-to-br from-[#1aab99]/20 to-[#3533cd]/20 text-white'}`}>
                    <span className="text-base font-extrabold leading-none">{d.getDate()}</span>
                    <span className="text-[10px] uppercase">{MESES_CAL[d.getMonth()]}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white">{s.titulo}</div>
                    <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-white/50">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtTime(s.fecha_programada)} — {String(dEnd.getHours()).padStart(2, '0')}:{String(dEnd.getMinutes()).padStart(2, '0')}</span>
                      <span className="flex items-center gap-1">{past ? <FileText className="h-3 w-3" /> : <Users className="h-3 w-3" />} {past ? 'Acta firmada' : `${miembros.length} miembros`}</span>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusCls}`}>{statusText}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Columna derecha */}
      <div className="flex flex-col gap-4">
        {pagoPendiente && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Cuota trimestral</div>
            <div className="mt-1 text-3xl font-extrabold text-white">{fmtMoney(pagoPendiente.monto, pagoPendiente.moneda ?? 'MXN')}</div>
            <div className="text-sm text-white/50">{pagoPendiente.moneda} · {pagoPendiente.trimestre} {pagoPendiente.ano}</div>
            <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-400" />
              <div>
                <div className="text-sm font-semibold text-amber-400">Pendiente</div>
                <div className="text-xs text-white/50">
                  {pagoPendiente.fecha_vencimiento
                    ? `Vence el ${new Date(pagoPendiente.fecha_vencimiento).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}`
                    : 'Sin fecha de vencimiento'}
                </div>
              </div>
            </div>
            <button disabled className="mt-4 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/40">
              <CreditCard className="h-4 w-4" /> Pagar trimestre
            </button>
            {pagados.length > 0 && (
              <div className="mt-4 border-t border-white/[0.06] pt-3">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">Historial</div>
                {pagados.map((p) => (
                  <div key={p.id} className="flex justify-between py-1 text-sm">
                    <span className="text-white/60">{p.trimestre} {p.ano}</span>
                    <span className="font-semibold text-emerald-400">Pagado</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
            <Lightbulb className="h-4 w-4 text-[#1aab99]" /> Cuota base
          </div>
          <div className="text-2xl font-extrabold text-white">{fmtMoney(consejo.cuota_trimestral, consejo.cuota_moneda ?? 'MXN')}</div>
          <p className="mt-1 text-xs leading-relaxed text-white/50">Cuota acordada con el Consejo. Pagada cada inicio de trimestre.</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
            <Info className="h-4 w-4 text-[#1aab99]" /> ¿Por qué se paga?
          </div>
          <p className="text-sm leading-relaxed text-white/60">
            Los miembros del Consejo dedican tiempo, expertise y reputación al éxito de tu empresa.
            La cuota trimestral honra ese compromiso y mantiene la relación profesional.
          </p>
        </div>
      </div>
    </div>
  );
}
