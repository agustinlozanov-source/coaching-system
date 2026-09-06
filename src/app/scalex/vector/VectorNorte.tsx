'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, Check, Grid, GitCommit, Loader2, Settings, Target, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Perfil, VectorEstrategico, VectorTrimestre } from './types';
import { getAnioCalendar } from './helpers';

const inputCls =
  'w-full rounded-lg border border-[var(--sx-border)] bg-[var(--sx-input)] px-3 py-2 text-sm text-[var(--sx-text)] outline-none transition placeholder:text-[var(--sx-text-faint)] focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25';

type Toast = { msg: string; type: 'success' | 'error' } | null;

export function VectorNorte({
  orgId,
  profile,
  onOpenTrimestre,
}: {
  orgId: string | null;
  profile: Perfil | null;
  onOpenTrimestre: (id: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [vector, setVector] = useState<VectorEstrategico | null>(null);
  const [trimestres, setTrimestres] = useState<VectorTrimestre[]>([]);
  const [toast, setToast] = useState<Toast>(null);

  // Setup form state
  const [meta, setMeta] = useState('');
  const [nombre, setNombre] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [anio1, setAnio1] = useState('');
  const [anio2, setAnio2] = useState('');
  const [anio3, setAnio3] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      if (!orgId) {
        setLoading(false);
        return;
      }
      const supabase = createClient();
      const { data: v } = await supabase
        .from('vector_estrategicos')
        .select('*')
        .eq('organizacion_id', orgId)
        .eq('estado', 'activo')
        .maybeSingle();

      if (v) {
        setVector(v as VectorEstrategico);
        const { data: trims } = await supabase
          .from('vector_trimestres')
          .select('*, vector_factor_x(complemento, meta_descripcion)')
          .eq('vector_id', v.id)
          .order('numero', { ascending: true });
        setTrimestres((trims ?? []) as VectorTrimestre[]);
      } else {
        // Default: primer día del próximo trimestre (espejo de initSetup())
        const hoy = new Date();
        const mesActual = hoy.getMonth();
        const trimestreActual = Math.floor(mesActual / 3);
        const mesProximoTri = (trimestreActual + 1) * 3;
        const anio = hoy.getFullYear() + (mesProximoTri >= 12 ? 1 : 0);
        const mes = mesProximoTri % 12;
        const fechaProx = new Date(anio, mes, 1);
        setFechaInicio(fechaProx.toISOString().split('T')[0]);
      }

      setLoading(false);
    })();
  }, [orgId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const anioBase = useMemo(() => (fechaInicio ? new Date(fechaInicio + 'T12:00:00').getFullYear() : null), [fechaInicio]);

  async function handleCrearVector() {
    if (!meta.trim()) {
      setToast({ msg: 'La meta es obligatoria', type: 'error' });
      return;
    }
    if (!fechaInicio) {
      setToast({ msg: 'Define una fecha de inicio', type: 'error' });
      return;
    }
    if (!orgId) return;

    setCreating(true);
    const supabase = createClient();
    const base = new Date(fechaInicio + 'T12:00:00').getFullYear();
    const fechaFin = `${base + 3}-${fechaInicio.substring(5)}`;

    const { data, error } = await supabase
      .from('vector_estrategicos')
      .insert({
        organizacion_id: orgId,
        creado_por: profile?.id ?? null,
        meta: meta.trim(),
        nombre: nombre.trim() || null,
        plan_anio_1: anio1.trim() || null,
        plan_anio_2: anio2.trim() || null,
        plan_anio_3: anio3.trim() || null,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      })
      .select('*')
      .single();

    if (error || !data) {
      setCreating(false);
      setToast({ msg: 'Error al crear vector: ' + (error?.message ?? 'desconocido'), type: 'error' });
      return;
    }

    setVector(data as VectorEstrategico);
    const { data: trims } = await supabase
      .from('vector_trimestres')
      .select('*, vector_factor_x(complemento, meta_descripcion)')
      .eq('vector_id', data.id)
      .order('numero', { ascending: true });
    setTrimestres((trims ?? []) as VectorTrimestre[]);
    setCreating(false);
    setToast({ msg: 'Vector creado · 12 rounds generados', type: 'success' });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--sx-text-dim)]" />
      </div>
    );
  }

  return (
    <div>
      {!vector ? (
        <SetupForm
          meta={meta} setMeta={setMeta}
          nombre={nombre} setNombre={setNombre}
          fechaInicio={fechaInicio} setFechaInicio={setFechaInicio}
          anio1={anio1} setAnio1={setAnio1}
          anio2={anio2} setAnio2={setAnio2}
          anio3={anio3} setAnio3={setAnio3}
          anioBase={anioBase}
          creating={creating}
          onCrear={handleCrearVector}
        />
      ) : (
        <Tablero vector={vector} trimestres={trimestres} onOpenTrimestre={onOpenTrimestre} />
      )}

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border px-5 py-2.5 text-sm font-semibold shadow-lg ${
            toast.type === 'success'
              ? 'border-emerald-500 bg-[var(--sx-card)] text-emerald-400'
              : 'border-red-500 bg-[var(--sx-card)] text-red-400'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════ SETUP ══════════════════════════════════════ */
function SetupForm({
  meta, setMeta, nombre, setNombre, fechaInicio, setFechaInicio,
  anio1, setAnio1, anio2, setAnio2, anio3, setAnio3, anioBase, creating, onCrear,
}: {
  meta: string; setMeta: (v: string) => void;
  nombre: string; setNombre: (v: string) => void;
  fechaInicio: string; setFechaInicio: (v: string) => void;
  anio1: string; setAnio1: (v: string) => void;
  anio2: string; setAnio2: (v: string) => void;
  anio3: string; setAnio3: (v: string) => void;
  anioBase: number | null;
  creating: boolean;
  onCrear: () => void;
}) {
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-[var(--sx-text)]">
          Define tu meta <span className="bg-gradient-to-br from-[#1aab99] to-[#3533cd] bg-clip-text text-transparent">a 3 años</span>
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--sx-text-muted)]">
          Una meta clara que defina los próximos 12 trimestres. Lo aspiracional bien anclado en lo realista. El
          sistema generará automáticamente los 12 rounds desde tu fecha de inicio.
        </p>
      </div>

      {/* META */}
      <div className="mb-4 rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-[var(--sx-text)]">
          <Target className="h-4 w-4 text-[#1aab99]" /> La meta — Tu norte a 3 años
        </div>
        <div className="rounded-xl border-[1.5px] border-[#1aab99] bg-gradient-to-br from-[#1aab99]/10 to-[#3533cd]/10 p-5">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#1aab99]">
            Cuál es tu meta clara a 3 años
          </label>
          <input
            value={meta}
            onChange={(e) => setMeta(e.target.value)}
            maxLength={280}
            placeholder="Ej: Triplicar ventas anuales · Llegar a 200 clientes activos · Abrir 3 sucursales nuevas"
            className="w-full bg-transparent text-xl font-extrabold text-[var(--sx-text)] outline-none placeholder:text-[var(--sx-text-faint)]"
          />
          <div className="mt-2.5 text-xs italic leading-relaxed text-[var(--sx-text-dim)]">
            Una sola meta. Específica, medible, ambiciosa pero realista. Si en 3 años la cumples, la empresa estará
            en otro nivel.
          </div>
        </div>
      </div>

      {/* PLAN ANUAL */}
      <div className="mb-4 rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-[var(--sx-text)]">
          <Calendar className="h-4 w-4 text-[#1aab99]" /> Plan anual — Cómo se ve cada año
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: `AÑO 1${anioBase ? ' · ' + anioBase : ''}`, value: anio1, set: setAnio1, ph: '¿Qué necesitas lograr en el primer año para estar en camino?' },
            { label: `AÑO 2${anioBase ? ' · ' + (anioBase + 1) : ''}`, value: anio2, set: setAnio2, ph: '¿Qué necesitas lograr en el segundo año?' },
            { label: `AÑO 3${anioBase ? ' · ' + (anioBase + 2) : ''}`, value: anio3, set: setAnio3, ph: '¿Cómo se ve la meta cumplida al final del año 3?' },
          ].map((a) => (
            <div key={a.label} className="rounded-xl border border-[var(--sx-border)] bg-[var(--sx-input)] p-4">
              <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-[#1aab99]">{a.label}</div>
              <textarea
                value={a.value}
                onChange={(e) => a.set(e.target.value)}
                placeholder={a.ph}
                className="min-h-[80px] w-full resize-none bg-transparent text-sm text-[var(--sx-text)] outline-none placeholder:text-[var(--sx-text-faint)]"
              />
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-[var(--sx-text-dim)]">
          Estos son los hitos anuales. Cada año tendrá 4 rounds que se llenan trimestre a trimestre.
        </div>
      </div>

      {/* CONFIG */}
      <div className="mb-6 rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-[var(--sx-text)]">
          <Settings className="h-4 w-4 text-[#1aab99]" /> Configuración del Vector
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">Fecha de inicio</label>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className={inputCls} />
            <div className="mt-1.5 text-xs text-[var(--sx-text-dim)]">El Round 1 empieza este día. Los 12 trimestres se calcularán automáticamente.</div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">Nombre del Vector (opcional)</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Vector 2026-2028 · Triplicación" className={inputCls} />
            <div className="mt-1.5 text-xs text-[var(--sx-text-dim)]">Para identificarlo en tu historial.</div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onCrear}
          disabled={creating}
          className="flex items-center gap-2 rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {creating ? 'Creando vector…' : 'Crear Vector'}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════ TABLERO ══════════════════════════════════════ */
function Tablero({
  vector, trimestres, onOpenTrimestre,
}: {
  vector: VectorEstrategico; trimestres: VectorTrimestre[]; onOpenTrimestre: (id: string) => void;
}) {
  const completados = trimestres.filter((t) => t.estado === 'completado').length;
  const activo = trimestres.find((t) => t.estado === 'activo');
  const pct = Math.round((completados / 12) * 100);
  const anioBase = getAnioCalendar(vector.fecha_inicio);

  const anios = [1, 2, 3].map((num) => ({
    num,
    anio: anioBase ? Number(anioBase) + (num - 1) : '',
    plan: num === 1 ? vector.plan_anio_1 : num === 2 ? vector.plan_anio_2 : vector.plan_anio_3,
    rounds: trimestres.filter((t) => t.anio === num),
  }));

  return (
    <div>
      {/* HERO */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] p-7 text-white">
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10" />
        <div className="relative z-10 text-xs font-bold uppercase tracking-wide opacity-90">
          {(vector.nombre || 'Vector activo') + ' · ' + getAnioCalendar(vector.fecha_inicio) + '-' + getAnioCalendar(vector.fecha_fin)}
        </div>
        <div className="relative z-10 mt-3 max-w-2xl text-2xl font-extrabold leading-tight">{vector.meta}</div>
        <div className="relative z-10 mt-3 flex flex-wrap gap-5 text-sm opacity-95">
          <div><strong className="font-extrabold">3</strong> años</div>
          <div><strong className="font-extrabold">12</strong> rounds</div>
          <div>
            {activo ? (
              <><strong className="font-extrabold">Round {activo.numero}</strong> · activo</>
            ) : completados === 12 ? (
              <strong className="font-extrabold">Completado</strong>
            ) : (
              <strong className="font-extrabold">Sin round activo</strong>
            )}
          </div>
          <div>
            {activo ? <><strong className="font-extrabold">Año {activo.anio}</strong> · en curso</> : <strong className="font-extrabold">Por iniciar</strong>}
          </div>
        </div>
        <div className="relative z-10 mt-4 rounded-xl bg-white/[0.18] p-4">
          <div className="mb-2 flex items-baseline justify-between text-sm font-semibold">
            <span>{completados} de 12 rounds completados</span>
            <span className="text-xl font-extrabold">{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/20">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* TIMELINE */}
      <div className="mb-6 rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-5">
        <div className="mb-4 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-[var(--sx-text)]">
          <GitCommit className="h-3.5 w-3.5 text-[#1aab99]" /> Los 12 rounds — vista timeline
        </div>
        <div className="relative h-14 px-2">
          <div className="absolute left-2 right-2 top-[22px] h-1 rounded-full bg-[var(--sx-card-hover)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1aab99] to-[#3533cd] transition-all"
              style={{ width: `${(completados / 12) * 100}%` }}
            />
          </div>
          <div className="absolute inset-0 grid grid-cols-12 px-2">
            {trimestres.map((t) => (
              <div key={t.id} className="flex flex-col items-center">
                <span
                  className={`mt-3.5 mb-1.5 block rounded-full ${
                    t.estado === 'completado'
                      ? 'h-3 w-3 bg-emerald-500'
                      : t.estado === 'activo'
                        ? 'h-[18px] w-[18px] border-2 border-[#1aab99] bg-white shadow-[0_0_0_4px_rgba(26,171,153,0.15)]'
                        : 'h-3 w-3 border-2 border-[var(--sx-border-strong)] bg-[var(--sx-card-hover)]'
                  }`}
                />
                <span className={`text-[10px] font-bold ${t.estado === 'activo' ? 'text-[#1aab99]' : t.estado === 'completado' ? 'text-emerald-400' : 'text-[var(--sx-text-dim)]'}`}>
                  R{t.numero}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PLAN ANUAL */}
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--sx-text)]">
        <Calendar className="h-4 w-4 text-[#1aab99]" /> Plan anual
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {anios.map((a) => {
          const comp = a.rounds.filter((r) => r.estado === 'completado').length;
          const tieneActivo = a.rounds.some((r) => r.estado === 'activo');
          const todosCompletados = comp === 4;
          let badge = 'FUTURO';
          let borderCls = 'border-[var(--sx-border)]';
          if (tieneActivo) { badge = 'EN CURSO'; borderCls = 'border-[#1aab99]'; }
          else if (todosCompletados) { badge = 'COMPLETADO'; borderCls = 'border-emerald-500/60'; }
          else if (comp > 0) { badge = 'AVANCE PARCIAL'; borderCls = 'border-emerald-500/60'; }
          const activoDelAnio = a.rounds.find((r) => r.estado === 'activo');
          const planLines = (a.plan ?? '').split('\n');

          return (
            <div key={a.num} className={`relative rounded-2xl border bg-[var(--sx-card)] p-5 ${borderCls}`}>
              <span className="absolute right-4 top-4 rounded-full bg-[var(--sx-card-hover)] px-2.5 py-1 text-[10px] font-extrabold text-[var(--sx-text-dim)]">{badge}</span>
              <div className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-[#1aab99]">AÑO {a.num} · {a.anio}</div>
              <div className="mb-2 text-base font-extrabold text-[var(--sx-text)]">
                {a.plan ? planLines[0] : <span className="italic text-[var(--sx-text-dim)]">Sin plan definido</span>}
              </div>
              {a.plan && planLines.length > 1 && (
                <div className="mb-3 text-xs leading-relaxed text-[var(--sx-text-muted)]">{planLines.slice(1).join(' ')}</div>
              )}
              <div className="flex gap-3 border-t border-[var(--sx-border)] pt-3 text-xs text-[var(--sx-text-dim)]">
                <span><strong className="text-[var(--sx-text-muted)]">{comp}/4</strong> rounds</span>
                {activoDelAnio ? (
                  <span><strong className="text-[var(--sx-text-muted)]">R{activoDelAnio.numero}</strong> activo</span>
                ) : a.rounds.length === 4 ? (
                  <span>R{a.rounds[0].numero}–R{a.rounds[3].numero}</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* ROUND ACTIVO */}
      {activo && (
        <>
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--sx-text)]">
            <Zap className="h-4 w-4 text-[#1aab99]" /> Round activo
          </div>
          <button
            onClick={() => onOpenTrimestre(activo.id)}
            className="mb-6 grid w-full grid-cols-1 items-center gap-4 rounded-2xl border-[1.5px] border-[#1aab99] bg-gradient-to-br from-[#1aab99]/10 to-[#3533cd]/10 p-6 text-left transition hover:brightness-110 md:grid-cols-[1fr_auto]"
          >
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2.5 text-xs text-[var(--sx-text-muted)]">
                <span className="rounded-full bg-[#1aab99]/15 px-2.5 py-0.5 font-extrabold text-[#1aab99]">R{activo.numero}</span>
                <span>—</span>
              </div>
              <div className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-[#1aab99]">FACTOR X DEL TRIMESTRE</div>
              <div className="mb-1 text-xl font-extrabold text-[var(--sx-text)]">
                {activo.vector_factor_x?.[0]?.complemento ? `Utilidad por ${activo.vector_factor_x[0].complemento}` : 'Factor X sin definir'}
              </div>
              <div className="text-sm text-[var(--sx-text-muted)]">
                {activo.vector_factor_x?.[0]?.meta_descripcion || 'Entra al detalle del round para definir tu Factor X y los indicadores críticos.'}
              </div>
            </div>
            <span className="flex items-center gap-2 rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-5 py-2.5 text-sm font-bold text-white">
              {activo.titulo || 'Ver round'}
            </span>
          </button>
        </>
      )}

      {/* GRID 12 ROUNDS */}
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--sx-text)]">
        <Grid className="h-4 w-4 text-[#1aab99]" /> Los 12 rounds
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {trimestres.map((t) => {
          const fx = t.vector_factor_x?.[0];
          const borderCls = t.estado === 'activo' ? 'border-[#1aab99] shadow-[0_0_0_1px_#1aab99]' : t.estado === 'completado' ? 'border-emerald-500/50' : 'border-[var(--sx-border)]';
          const bgCls = t.estado === 'activo' ? 'bg-gradient-to-br from-[#1aab99]/10 to-transparent' : t.estado === 'completado' ? 'bg-gradient-to-br from-emerald-500/[0.06] to-transparent' : 'bg-[var(--sx-card)]';
          return (
            <button
              key={t.id}
              onClick={() => onOpenTrimestre(t.id)}
              className={`flex min-h-[130px] flex-col rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--sx-border-strong)] ${borderCls} ${bgCls}`}
            >
              <div className="mb-2.5 flex items-center justify-between">
                <span className="rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-2.5 py-1 text-[11px] font-extrabold text-white">R{t.numero}</span>
                <span className="text-[10.5px] font-semibold text-[var(--sx-text-dim)]">Q{t.trimestre_anio}</span>
              </div>
              <div className={`mb-1.5 text-sm font-bold leading-snug ${t.estado === 'completado' ? 'text-[var(--sx-text-muted)]' : 'text-[var(--sx-text)]'}`}>
                {t.titulo || 'Sin definir'}
              </div>
              <div className="mb-auto text-[11px] italic leading-snug text-[var(--sx-text-dim)]">
                {fx?.complemento ? `Factor X: Utilidad por ${fx.complemento}` : 'Factor X sin definir'}
              </div>
              <div className="mt-2.5 flex justify-between border-t border-[var(--sx-border)] pt-2.5">
                {t.estado === 'activo' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#1aab99] px-2.5 py-1 text-[10.5px] font-bold text-white">
                    <Zap className="h-2.5 w-2.5" /> En curso
                  </span>
                )}
                {t.estado === 'completado' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10.5px] font-bold text-emerald-400">
                    <Check className="h-2.5 w-2.5" /> Completado
                  </span>
                )}
                {t.estado === 'pendiente' && (
                  <span className="rounded-full bg-[var(--sx-card-hover)] px-2.5 py-1 text-[10.5px] font-bold text-[var(--sx-text-dim)]">Pendiente</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
