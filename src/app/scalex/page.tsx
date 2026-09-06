import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Map, Flag, Repeat, Calendar, Target, FileSignature, Users, Rocket,
  ArrowRight, Clock,
} from 'lucide-react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'SCALEx · Dashboard' };
export const dynamic = 'force-dynamic';

/* ── Helpers de datos (portados de dashboard.js del portal) ─────────────── */
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
};
const fmtTime = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const fmtDateLong = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${DIAS[d.getDay()]} · ${d.getDate()} ${MESES_LONG[d.getMonth()]}`;
};

function isFilled(v: any): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (typeof v === 'number') return true;
  if (Array.isArray(v)) return v.some(isFilled);
  if (typeof v === 'object') return Object.values(v).some(isFilled);
  return false;
}

function calcOPSPProgress(opsp: any) {
  if (!opsp) return { total: 0, estrategia: 0, anual: 0, trimestral: 0 };
  const e = opsp.estrategia || {}, a = opsp.anual || {}, t = opsp.trimestral || {};
  const estrategiaItems = [e.proposito_evolutivo, e.vector_audaz, e.factor_x, e.promesa_marca, e.adn?.cultura, e.adn?.marketing, e.vector_3a5?.ingresos, e.acciones_3a5, e.acciones_proposito];
  const anualItems = [a.ingresos, a.margen_bruto, a.efectivo, a.acciones_anuales, a.factores_procesos, a.kpis_anuales];
  const trimestralItems = [t.ingresos_q, t.tema?.nombre, t.tema?.objetivo_critico, t.rocas_tacticas, t.rituales_responsabilidad, t.celebracion, t.recompensa];
  const es = estrategiaItems.filter(isFilled).length / estrategiaItems.length;
  const an = anualItems.filter(isFilled).length / anualItems.length;
  const tr = trimestralItems.filter(isFilled).length / trimestralItems.length;
  return {
    total: Math.round(((es + an + tr) / 3) * 100),
    estrategia: Math.round(es * 100), anual: Math.round(an * 100), trimestral: Math.round(tr * 100),
  };
}

function currentQuarter() {
  const now = new Date();
  const m = now.getMonth() + 1;
  const q = m <= 3 ? 'Q1' : m <= 6 ? 'Q2' : m <= 9 ? 'Q3' : 'Q4';
  return `${q} ${now.getFullYear()}`;
}

export default async function ScalexDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Org activa (cliente server)
  const { data: membresias } = await supabase
    .from('miembros_organizacion').select('organizacion_id, rol_en_org, estado').eq('user_id', user.id);
  const activas = (membresias ?? []).filter((m) => m.estado === 'activo' || m.estado === 'activa');
  const pool = activas.length ? activas : (membresias ?? []);
  const cookieOrg = cookies().get('sx_active_org')?.value ?? null;
  const ids = pool.map((m) => m.organizacion_id);
  const orgId = (cookieOrg && ids.includes(cookieOrg))
    ? cookieOrg
    : ((pool.find((m) => m.rol_en_org === 'dueno') ?? pool[0])?.organizacion_id ?? null);

  let opsp: any = null, contrato: any = null;
  let consejo: any = null, miembros: any[] = [], proximaSesion: any = null, pagoPendiente: any = null;

  if (orgId) {
    const [opspRes, contratoRes, consejoRes] = await Promise.all([
      supabase.from('opsp').select('*').eq('organizacion_id', orgId).maybeSingle(),
      supabase.from('contratos').select('*').eq('organizacion_id', orgId).eq('tipo', 'dueno').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('consejos').select('*').eq('organizacion_id', orgId).maybeSingle(),
    ]);
    opsp = opspRes.data; contrato = contratoRes.data; consejo = consejoRes.data;
    if (consejo) {
      const [mRes, sRes, pRes] = await Promise.all([
        supabase.from('consejo_miembros').select('*').eq('consejo_id', consejo.id).eq('estado', 'activo'),
        supabase.from('consejo_sesiones').select('*').eq('consejo_id', consejo.id).eq('estado', 'programada').order('fecha_programada', { ascending: true }).limit(1),
        supabase.from('consejo_pagos').select('*').eq('consejo_id', consejo.id).eq('estado', 'pendiente').order('fecha_vencimiento', { ascending: true }).limit(1),
      ]);
      miembros = mRes.data ?? []; proximaSesion = sRes.data?.[0] ?? null; pagoPendiente = pRes.data?.[0] ?? null;
    }
  }

  const progress = calcOPSPProgress(opsp);
  const trimestral = opsp?.trimestral || {};
  const estrategia = opsp?.estrategia || {};
  const rocas = (trimestral.rocas_tacticas || []).filter((r: any) => r?.prioridad);

  const ritualesActivos: string[] = [];
  if (contrato?.estado === 'firmado') ritualesActivos.push('Contrato');
  else if (contrato) ritualesActivos.push('Contrato (por firmar)');
  if (consejo) ritualesActivos.push('Consejo');

  const contratoFirmado = contrato?.estado === 'firmado';

  // Ring geometry
  const R = 42, CIRC = 2 * Math.PI * R;
  const ringOffset = CIRC - (progress.total / 100) * CIRC;

  const KPIS = [
    {
      icon: Map, label: 'OPSP COMPLETADO', value: `${progress.total}%`,
      sub: `Estrategia ${progress.estrategia}% · Año ${progress.anual}% · Trim ${progress.trimestral}%`,
      badge: opsp ? 'Activo' : 'Vacío', badgeCls: 'bg-white/15 text-white', featured: true,
    },
    {
      icon: Flag, label: 'ROCAS DEL TRIMESTRE', value: String(rocas.length),
      sub: rocas.length ? `${rocas.length} prioridades activas` : 'Sin rocas configuradas',
      badge: 'Trimestre', badgeCls: 'bg-amber-500/15 text-amber-400',
    },
    {
      icon: Repeat, label: 'RITUALES ACTIVOS', value: String(ritualesActivos.length),
      sub: ritualesActivos.length ? ritualesActivos.join(' · ') : 'Activa rituales para escalar',
      badge: 'Activos', badgeCls: 'bg-emerald-500/15 text-emerald-400',
    },
    {
      icon: Calendar, label: 'PRÓXIMA SESIÓN', value: proximaSesion ? fmtDate(proximaSesion.fecha_programada) : '—',
      sub: proximaSesion ? `${fmtTime(proximaSesion.fecha_programada)} · ${String(proximaSesion.titulo).slice(0, 30)}` : 'Sin sesiones programadas',
      badge: 'Próxima', badgeCls: 'bg-[#1aab99]/15 text-[#1aab99]',
    },
  ];

  const semaforo = ['#1aab99', '#f59e0b', '#1aab99', '#f59e0b', '#ef4444'];
  const mockProgress = [78, 45, 92, 62, 18];

  return (
    <div className="px-8 py-8">
      {/* Encabezado */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#1aab99]">Dashboard · {currentQuarter()}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[var(--sx-text)]">Tu proceso de escalabilidad</h1>
        <p className="mt-1 text-[var(--sx-text-muted)]">Resumen de tu OPSP, rituales activos y próximas acciones.</p>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label}
              className={`rounded-2xl border p-5 ${k.featured
                ? 'border-transparent bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-white'
                : 'border-[var(--sx-border)] bg-[var(--sx-card)]'}`}>
              <div className="mb-4 flex items-center justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${k.featured ? 'bg-white/20 text-white' : 'bg-[var(--sx-card-hover)] text-[var(--sx-text-muted)]'}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${k.badgeCls}`}>{k.badge}</span>
              </div>
              <div className={`text-[11px] font-semibold uppercase tracking-wide ${k.featured ? 'text-white/80' : 'text-[var(--sx-text-dim)]'}`}>{k.label}</div>
              <div className={`mt-1 text-3xl font-extrabold ${k.featured ? 'text-white' : 'text-[var(--sx-text)]'}`}>{k.value}</div>
              <div className={`mt-1 text-xs ${k.featured ? 'text-white/80' : 'text-[var(--sx-text-dim)]'}`}>{k.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Columna izquierda */}
        <div className="flex flex-col gap-6">
          {/* Vector Audaz */}
          <div className="rounded-2xl bg-gradient-to-br from-[#3533cd] to-[#1aab99] p-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">🎯 Vector Audaz · BHAG</p>
            <h2 className="mt-2 text-xl font-extrabold">Tu propósito audaz</h2>
            <p className="mt-2 max-w-2xl leading-relaxed text-white/90">
              {estrategia.vector_audaz || 'Aún no has definido tu Vector Audaz. Ve al OPSP y define hacia dónde vas en 10-25 años.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-8 border-t border-white/20 pt-4">
              <div><div className="text-[11px] uppercase text-white/70">Horizonte</div><div className="text-lg font-extrabold">{estrategia.vector_3a5?.ano_meta || '—'}</div></div>
              <div><div className="text-[11px] uppercase text-white/70">Ingresos meta</div><div className="text-lg font-extrabold">{estrategia.vector_3a5?.ingresos || '—'}</div></div>
              <div><div className="text-[11px] uppercase text-white/70">Ganancias</div><div className="text-lg font-extrabold">{estrategia.vector_3a5?.ganancias || '—'}</div></div>
            </div>
          </div>

          {/* Rocas del Trimestre */}
          <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--sx-text)]">Rocas del Trimestre</h2>
              <Link href="/scalex/opsp" className="flex items-center gap-1 text-sm font-semibold text-[#1aab99]">Editar <ArrowRight className="h-4 w-4" /></Link>
            </div>
            {rocas.length === 0 ? (
              <p className="py-3 text-sm text-[var(--sx-text-dim)]">Sin rocas tácticas. Configúralas en el OPSP del trimestre.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {rocas.map((r: any, i: number) => {
                  const pct = mockProgress[i] ?? 50; const col = semaforo[i] ?? '#f59e0b';
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-xs font-extrabold text-white" style={{ backgroundColor: col }}>{i + 1}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-[var(--sx-text)]">{r.prioridad}</div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--sx-card-hover)]">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: col }} />
                          </div>
                          <span className="text-xs font-semibold text-[var(--sx-text-muted)]">{pct}%</span>
                        </div>
                        {r.responsable && <div className="mt-1 text-[11px] text-[var(--sx-text-dim)]">→ {r.responsable}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha */}
        <div className="flex flex-col gap-6">
          {/* OPSP ring */}
          <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--sx-text)]">OPSP</h2>
              <Link href="/scalex/opsp" className="flex items-center gap-1 text-sm font-semibold text-[#1aab99]">Editar <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative h-28 w-28 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r={R} fill="none" stroke="var(--sx-card-hover)" strokeWidth="8" />
                  <circle cx="50" cy="50" r={R} fill="none" stroke="#1aab99" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={CIRC.toFixed(2)} strokeDashoffset={ringOffset.toFixed(2)} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold text-[var(--sx-text)]">{progress.total}%</span>
                  <span className="text-[10px] uppercase text-[var(--sx-text-dim)]">Completo</span>
                </div>
              </div>
              <div className="flex-1 space-y-2 text-sm">
                {[['Estrategia', progress.estrategia], ['Año', progress.anual], ['Trimestre', progress.trimestral]].map(([k, v]) => (
                  <div key={k as string} className="flex items-center justify-between">
                    <span className="text-[var(--sx-text-muted)]">{k}</span>
                    <span className="font-bold text-[var(--sx-text)]">{v}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rituales Activos */}
          <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--sx-text)]">Rituales Activos</h2>
              <Link href="/scalex/rituales" className="flex items-center gap-1 text-sm font-semibold text-[#1aab99]">Ver <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="flex flex-col gap-3">
              <RitualRow icon={FileSignature} nombre="Contrato del Dueño"
                status={contratoFirmado ? 'Firmado · Vigente' : contrato ? 'Sin firmar · Pendiente' : 'No iniciado'}
                badge={contratoFirmado ? 'Activo' : contrato ? 'Por firmar' : 'Inactivo'}
                badgeCls={contratoFirmado ? 'bg-emerald-500/15 text-emerald-400' : contrato ? 'bg-amber-500/15 text-amber-400' : 'bg-white/[0.06] text-[var(--sx-text-dim)]'} />
              {consejo && (
                <RitualRow icon={Users} nombre="Consejo de Escalabilidad"
                  status={`${miembros.length}/3 miembros · Próx. ${fmtDate(proximaSesion?.fecha_programada)}`}
                  badge={pagoPendiente ? 'Pago pendiente' : 'Activo'}
                  badgeCls={pagoPendiente ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'} />
              )}
              <RitualRow icon={Rocket} nombre="Kick-off de Trimestre" status="Próximamente"
                badge="Próximo" badgeCls="bg-white/[0.06] text-[var(--sx-text-dim)]" />
            </div>
          </div>

          {/* Próxima sesión */}
          <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-6">
            <h2 className="mb-3 text-lg font-bold text-[var(--sx-text)]">Próxima sesión</h2>
            {proximaSesion ? (
              <div>
                <div className="text-xs font-semibold text-[#1aab99]">{fmtDateLong(proximaSesion.fecha_programada)}</div>
                <div className="mt-1 font-bold text-[var(--sx-text)]">{proximaSesion.titulo}</div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--sx-text-muted)]">
                  <Clock className="h-3.5 w-3.5" /> {fmtTime(proximaSesion.fecha_programada)} · Consejo de Escalabilidad
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--sx-text-dim)]">
                No tienes sesiones programadas.{' '}
                <Link href="/scalex/rituales" className="font-semibold text-[#1aab99]">Agenda una con el Consejo →</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RitualRow({ icon: Icon, nombre, status, badge, badgeCls }: { icon: any; nombre: string; status: string; badge: string; badgeCls: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1aab99]/20 to-[#3533cd]/20 text-[#1aab99]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-[var(--sx-text)]">{nombre}</div>
        <div className="text-xs text-[var(--sx-text-dim)]">{status}</div>
      </div>
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeCls}`}>{badge}</span>
    </div>
  );
}
