'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Wallet, TrendingUp, Activity, Calendar, Plus, X, Save,
  Settings, ChevronDown, AlertTriangle, Check, BarChart2, RefreshCw, Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/teamx/org';

/* ── Tipos ──────────────────────────────────────────────────────────────── */
type Stats = {
  saldo_hoy: number | null;
  promedio_7_dias: number | null;
  tendencia_pct: number | null;
  estado_alerta: 'sano' | 'atencion' | 'alerta' | null;
  umbral_alerta: number | null;
  umbral_es_manual: boolean | null;
};
type Componente = { label: string; monto: number };
type DiaTendencia = {
  fecha: string;
  saldo_inicial: number | null;
  ingresos_total: number | null;
  egresos_total: number | null;
  saldo_final: number | null;
  notas: string | null;
  ingresos_componentes: Componente[] | null;
  egresos_componentes: Componente[] | null;
};
type DraftComponente = Componente & { id: string };
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/* ── Helpers ────────────────────────────────────────────────────────────── */
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fmt = (n?: number | null) => {
  if (n === null || n === undefined || isNaN(n)) return '$—';
  return '$' + Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
};
const fechaHoy = () => new Date().toISOString().split('T')[0];
const fechaLabel = (iso?: string | null) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${parseInt(d, 10)} ${MESES[parseInt(m, 10) - 1]} ${y}`;
};
const newDraftId = () => 'draft-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);

const inputCls =
  'w-full rounded-lg border border-white/10 bg-[#141416] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25';

/* ══════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════════════════════════════════════ */
export function CajaView({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const orgIdRef = useRef<string | null>(null);

  const [stats, setStats] = useState<Stats | null>(null);
  const [tendencia, setTendencia] = useState<DiaTendencia[]>([]);
  const [historial, setHistorial] = useState<DiaTendencia[]>([]);
  const [historialPage, setHistorialPage] = useState(0);
  const [historialOpen, setHistorialOpen] = useState(false);

  // Formulario
  const [fecha, setFecha] = useState(fechaHoy());
  const [saldoInicial, setSaldoInicial] = useState(0);
  const [saldoInicialHint, setSaldoInicialHint] = useState('');
  const [ingresos, setIngresos] = useState('');
  const [egresos, setEgresos] = useState('');
  const [ingDesglosado, setIngDesglosado] = useState(false);
  const [egrDesglosado, setEgrDesglosado] = useState(false);
  const [ingComponentes, setIngComponentes] = useState<DraftComponente[]>([]);
  const [egrComponentes, setEgrComponentes] = useState<DraftComponente[]>([]);
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [feedback, setFeedback] = useState('');

  // Modales
  const [showSetup, setShowSetup] = useState(false);
  const [setupSaldo, setSetupSaldo] = useState('');
  const [savingSetup, setSavingSetup] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [umbralManual, setUmbralManual] = useState(false);
  const [configUmbral, setConfigUmbral] = useState('');
  const [configSaldoInicial, setConfigSaldoInicial] = useState('');
  const [recalculando, setRecalculando] = useState(false);

  const graficaWrapRef = useRef<HTMLDivElement | null>(null);
  const [graficaWidth, setGraficaWidth] = useState(600);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  /* ── Carga inicial ── */
  const cargarStats = useCallback(async (orgId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('flujo_caja_stats', { p_org_id: orgId });
    if (!error) setStats(data as Stats);
  }, []);

  const cargarTendencia = useCallback(async (orgId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('flujo_caja_tendencia', { p_org_id: orgId, p_dias: 30 });
    if (!error) setTendencia((data ?? []) as DiaTendencia[]);
  }, []);

  const cargarHistorial = useCallback(async (orgId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('flujo_caja_tendencia', { p_org_id: orgId, p_dias: 365 });
    if (!error) {
      const sorted = [...((data ?? []) as DiaTendencia[])].sort((a, b) => b.fecha.localeCompare(a.fecha));
      setHistorial(sorted);
    }
  }, []);

  const cargarFormulario = useCallback(async (f: string, tendenciaData: DiaTendencia[]) => {
    const existente = tendenciaData.find((d) => d.fecha === f);
    if (existente) {
      const si = existente.saldo_inicial ?? 0;
      setSaldoInicial(si);
      setSaldoInicialHint('cargado del registro guardado');
      setIngresos(String(existente.ingresos_total ?? ''));
      setEgresos(String(existente.egresos_total ?? ''));
      setNotas(existente.notas ?? '');
      if (existente.ingresos_componentes?.length) {
        setIngDesglosado(true);
        setIngComponentes(existente.ingresos_componentes.map((c) => ({ ...c, id: newDraftId() })));
      } else {
        setIngDesglosado(false);
        setIngComponentes([]);
      }
      if (existente.egresos_componentes?.length) {
        setEgrDesglosado(true);
        setEgrComponentes(existente.egresos_componentes.map((c) => ({ ...c, id: newDraftId() })));
      } else {
        setEgrDesglosado(false);
        setEgrComponentes([]);
      }
    } else {
      setIngresos(''); setEgresos(''); setNotas('');
      setIngDesglosado(false); setEgrDesglosado(false);
      setIngComponentes([]); setEgrComponentes([]);
      const sorted = tendenciaData
        .filter((d) => d.fecha < f && d.saldo_final != null)
        .sort((a, b) => b.fecha.localeCompare(a.fecha));
      const saldoPrev = sorted.length > 0 ? (sorted[0].saldo_final ?? 0) : 0;
      setSaldoInicial(saldoPrev);
      setSaldoInicialHint(saldoPrev > 0 ? 'viene del saldo final del día anterior' : 'ingresa el saldo inicial manualmente');
    }
  }, []);

  useEffect(() => {
    (async () => {
      const orgId = await getActiveOrgId();
      if (!orgId) { setLoading(false); return; }
      orgIdRef.current = orgId;

      await Promise.all([cargarStats(orgId), cargarTendencia(orgId), cargarHistorial(orgId)]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Verificar setup + cargar formulario de hoy, una vez que tendencia/historial están listos
  const setupChecked = useRef(false);
  useEffect(() => {
    if (loading) return;
    if (!setupChecked.current) {
      setupChecked.current = true;
      const sinDias = historial.length === 0;
      const sinStats = !stats || stats.saldo_hoy == null;
      if (sinDias && sinStats) setShowSetup(true);
      cargarFormulario(fechaHoy(), tendencia);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // medir ancho de la gráfica
  useEffect(() => {
    if (!graficaWrapRef.current) return;
    const el = graficaWrapRef.current;
    const ro = new ResizeObserver(() => setGraficaWidth(el.clientWidth || 600));
    ro.observe(el);
    setGraficaWidth(el.clientWidth || 600);
    return () => ro.disconnect();
  }, []);

  /* ── Cálculo saldo final ── */
  const ingTotalCalc = ingDesglosado
    ? ingComponentes.reduce((s, c) => s + (Number(c.monto) || 0), 0)
    : parseFloat(ingresos) || 0;
  const egrTotalCalc = egrDesglosado
    ? egrComponentes.reduce((s, c) => s + (Number(c.monto) || 0), 0)
    : parseFloat(egresos) || 0;
  const saldoFinalCalc = saldoInicial + ingTotalCalc - egrTotalCalc;

  /* ── Handlers formulario ── */
  const onFechaChange = async (f: string) => {
    setFecha(f);
    await cargarFormulario(f, tendencia);
  };

  const toggleDesglosar = (tipo: 'ing' | 'egr') => {
    const esIng = tipo === 'ing';
    const desglosado = esIng ? ingDesglosado : egrDesglosado;
    const mainVal = parseFloat(esIng ? ingresos : egresos) || 0;
    const componentes = esIng ? ingComponentes : egrComponentes;

    if (!desglosado) {
      const next = componentes.length > 0 ? componentes : [{ id: newDraftId(), label: '', monto: mainVal > 0 ? mainVal : ('' as unknown as number) }];
      if (esIng) { setIngDesglosado(true); setIngComponentes(next); }
      else { setEgrDesglosado(true); setEgrComponentes(next); }
    } else {
      const total = componentes.reduce((s, c) => s + (Number(c.monto) || 0), 0);
      if (esIng) { setIngDesglosado(false); setIngresos(total ? String(total) : ''); }
      else { setEgrDesglosado(false); setEgresos(total ? String(total) : ''); }
    }
  };

  const agregarComponente = (tipo: 'ing' | 'egr') => {
    const row: DraftComponente = { id: newDraftId(), label: '', monto: '' as unknown as number };
    if (tipo === 'ing') setIngComponentes((s) => [...s, row]);
    else setEgrComponentes((s) => [...s, row]);
  };
  const quitarComponente = (tipo: 'ing' | 'egr', id: string) => {
    if (tipo === 'ing') setIngComponentes((s) => s.filter((c) => c.id !== id));
    else setEgrComponentes((s) => s.filter((c) => c.id !== id));
  };
  const editarComponente = (tipo: 'ing' | 'egr', id: string, field: 'label' | 'monto', value: string) => {
    const upd = (arr: DraftComponente[]) => arr.map((c) => (c.id === id ? { ...c, [field]: field === 'monto' ? (value as unknown as number) : value } : c));
    if (tipo === 'ing') setIngComponentes(upd);
    else setEgrComponentes(upd);
  };

  async function guardarDia() {
    const orgId = orgIdRef.current;
    if (!orgId || guardando) return;
    setGuardando(true); setSaveState('saving'); setFeedback('');
    try {
      const supabase = createClient();
      let ingComp: Componente[] = [];
      let egrComp: Componente[] = [];
      let ingTotal = parseFloat(ingresos) || 0;
      let egrTotal = parseFloat(egresos) || 0;
      if (ingDesglosado) {
        ingComp = ingComponentes
          .map((c) => ({ label: String(c.label ?? '').trim(), monto: Number(c.monto) || 0 }))
          .filter((c) => c.label || c.monto > 0);
        ingTotal = ingComp.reduce((s, c) => s + c.monto, 0);
      }
      if (egrDesglosado) {
        egrComp = egrComponentes
          .map((c) => ({ label: String(c.label ?? '').trim(), monto: Number(c.monto) || 0 }))
          .filter((c) => c.label || c.monto > 0);
        egrTotal = egrComp.reduce((s, c) => s + c.monto, 0);
      }

      const { error } = await supabase.rpc('flujo_caja_guardar_dia', {
        p_org_id: orgId,
        p_fecha: fecha,
        p_ingresos_total: ingTotal,
        p_egresos_total: egrTotal,
        p_ingresos_componentes: ingComp.length > 0 ? ingComp : null,
        p_egresos_componentes: egrComp.length > 0 ? egrComp : null,
        p_notas: notas.trim() || null,
      });
      if (error) throw error;

      setSaveState('saved');
      setFeedback('✓ Día guardado correctamente');
      await Promise.all([cargarStats(orgId), cargarTendencia(orgId), cargarHistorial(orgId)]);
      setTimeout(() => { setSaveState('idle'); setFeedback(''); }, 3000);
    } catch (e: any) {
      setSaveState('error');
      setFeedback('Error: ' + (e?.message ?? 'intenta de nuevo'));
      setTimeout(() => setSaveState('idle'), 4000);
    }
    setGuardando(false);
  }

  function abrirDesdeHistorial(d: DiaTendencia) {
    setFecha(d.fecha);
    cargarFormulario(d.fecha, tendencia);
  }

  /* ── Setup inicial ── */
  async function confirmarSetup() {
    const orgId = orgIdRef.current;
    const saldo = parseFloat(setupSaldo);
    if (!orgId || !saldo || saldo < 0) return;
    setSavingSetup(true);
    try {
      const supabase = createClient();
      await supabase.rpc('flujo_caja_set_saldo_inicial', { p_org_id: orgId, p_saldo: saldo });
      setShowSetup(false);
      setSaldoInicial(saldo);
      setSaldoInicialHint('saldo inicial configurado');
    } finally {
      setSavingSetup(false);
    }
  }

  /* ── Configuración ── */
  function abrirConfig() {
    if (stats) {
      const manual = !!stats.umbral_es_manual;
      setUmbralManual(manual);
      setConfigUmbral(manual && stats.umbral_alerta != null ? String(stats.umbral_alerta) : '');
    } else {
      setUmbralManual(false);
      setConfigUmbral('');
    }
    setConfigSaldoInicial('');
    setShowConfig(true);
  }

  async function guardarConfig() {
    const orgId = orgIdRef.current;
    if (!orgId) return;
    const umbral = umbralManual ? (parseFloat(configUmbral) || null) : null;
    const saldoIni = parseFloat(configSaldoInicial) || null;
    try {
      const supabase = createClient();
      const promises: PromiseLike<any>[] = [];
      if (umbral !== null || !umbralManual) {
        promises.push(supabase.rpc('flujo_caja_set_umbral', { p_org_id: orgId, p_umbral: umbral || 0, p_es_automatico: !umbralManual }));
      }
      if (saldoIni != null) {
        promises.push(supabase.rpc('flujo_caja_set_saldo_inicial', { p_org_id: orgId, p_saldo: saldoIni }));
      }
      await Promise.all(promises);
      setShowConfig(false);
      await Promise.all([cargarStats(orgId), cargarTendencia(orgId)]);
    } catch (e) {
      console.error('guardarConfig:', e);
    }
  }

  async function recalcularCadena() {
    const orgId = orgIdRef.current;
    if (!orgId || historial.length === 0) return;
    const fechaDesde = historial[historial.length - 1]?.fecha;
    if (!fechaDesde) return;
    setRecalculando(true);
    try {
      const supabase = createClient();
      await supabase.rpc('flujo_caja_recalcular_desde', { p_org_id: orgId, p_fecha_desde: fechaDesde });
      await Promise.all([cargarStats(orgId), cargarTendencia(orgId), cargarHistorial(orgId)]);
    } finally {
      setRecalculando(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-white/40" /></div>;
  }

  /* ── Gráfica: puntos ── */
  const pts = tendencia.filter((d) => d.saldo_final != null).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const W = graficaWidth;
  const H = 200;
  const pad = { top: 20, right: 20, bottom: 36, left: 56 };
  const innerW = Math.max(1, W - pad.left - pad.right);
  const innerH = H - pad.top - pad.bottom;
  const valores = pts.map((d) => d.saldo_final as number);
  const minVal = valores.length ? Math.min(...valores) : 0;
  const maxVal = valores.length ? Math.max(...valores) : 0;
  const rango = maxVal - minVal || 1;
  const tendPct = stats?.tendencia_pct ?? null;
  const lineColor = tendPct != null ? (tendPct > 2 ? '#22c55e' : tendPct < -2 ? '#ef4444' : '#f59e0b') : '#1aab99';
  const xOf = (i: number) => pad.left + (pts.length > 1 ? (i / (pts.length - 1)) * innerW : innerW / 2);
  const yOf = (v: number) => pad.top + innerH - ((v - minVal) / rango) * innerH;
  const pathD = pts.map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(d.saldo_final as number).toFixed(1)}`).join(' ');
  const areaD = pts.length > 1
    ? pathD + ` L${xOf(pts.length - 1).toFixed(1)},${(pad.top + innerH).toFixed(1)} L${pad.left.toFixed(1)},${(pad.top + innerH).toFixed(1)} Z`
    : '';
  const umbral = stats?.umbral_alerta ?? null;
  const showUmbral = umbral != null && umbral >= minVal && umbral <= maxVal * 1.2;
  const step = Math.max(1, Math.floor(pts.length / 5));

  const alertBanner = stats?.estado_alerta && stats.estado_alerta !== 'sano' ? stats.estado_alerta : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition hover:bg-white/[0.06] hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">Pilar 5 · Flujo</p>
          <h1 className="text-2xl font-bold text-white">Flujo de Caja Diario</h1>
        </div>
        <div className="flex items-center gap-2">
          {saveState !== 'idle' && (
            <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              saveState === 'saved' ? 'bg-emerald-500/15 text-emerald-400'
                : saveState === 'saving' ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-red-500/15 text-red-400'
            }`}>
              {saveState === 'saving' ? 'Guardando…' : saveState === 'saved' ? 'Guardado' : 'Error al guardar'}
            </span>
          )}
          <button onClick={abrirConfig} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition hover:bg-white/[0.06] hover:text-white" title="Configuración">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Stats bar */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/40"><Wallet className="h-3.5 w-3.5" /> Saldo hoy</div>
            <div className="text-2xl font-extrabold text-white">{fmt(stats?.saldo_hoy)}</div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/40"><TrendingUp className="h-3.5 w-3.5" /> Promedio 7 días</div>
            <div className="text-2xl font-extrabold text-white">{fmt(stats?.promedio_7_dias)}</div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/40"><Activity className="h-3.5 w-3.5" /> Tendencia</div>
            <div className={`text-2xl font-extrabold ${tendPct != null ? (tendPct >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-white'}`}>
              {tendPct != null ? `${tendPct >= 0 ? '↗ +' : '↘ '}${tendPct.toFixed(1)}%` : '—'}
            </div>
            {tendPct != null && <div className="mt-1 text-xs text-white/40">vs 7 días anteriores</div>}
          </div>
        </div>

        {alertBanner && (
          <div className={`flex items-start gap-3 rounded-xl border p-4 ${alertBanner === 'alerta' ? 'border-red-500/25 bg-red-500/10' : 'border-amber-500/25 bg-amber-500/10'}`}>
            <AlertTriangle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${alertBanner === 'alerta' ? 'text-red-400' : 'text-amber-400'}`} />
            <div>
              <div className={`text-sm font-bold ${alertBanner === 'alerta' ? 'text-red-400' : 'text-amber-400'}`}>
                {alertBanner === 'alerta' ? 'Alerta financiera' : 'Atención'}
              </div>
              <p className="text-xs text-white/50">
                {alertBanner === 'alerta'
                  ? `Tu saldo está por debajo del mínimo recomendado (${fmt(stats?.umbral_alerta)}).`
                  : 'Tu saldo cayó más del 20% en la última semana.'}
              </p>
            </div>
          </div>
        )}

        {/* Formulario */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-white"><Calendar className="h-4 w-4 text-[#1aab99]" /> Captura del día</div>

          <div className="mb-4 grid gap-4 sm:grid-cols-[200px_1fr]">
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">Fecha</div>
              <input type="date" value={fecha} max={fechaHoy()} onChange={(e) => onFechaChange(e.target.value)} className={inputCls} />
            </div>
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">Saldo inicial</div>
              <input type="text" readOnly value={saldoInicial ? saldoInicial.toLocaleString('es-MX', { maximumFractionDigits: 0 }) : ''} placeholder="0" className={`${inputCls} cursor-default text-white/60`} />
              <div className="mt-1 text-[11px] text-white/30">{saldoInicialHint}</div>
            </div>
          </div>

          {/* Ingresos */}
          <FlujoGroup
            label="↑ Ingresos" color="text-emerald-400"
            desglosado={ingDesglosado} onToggle={() => toggleDesglosar('ing')}
            main={ingresos} onMainChange={setIngresos}
            componentes={ingComponentes}
            onAdd={() => agregarComponente('ing')}
            onRemove={(id) => quitarComponente('ing', id)}
            onEdit={(id, f, v) => editarComponente('ing', id, f, v)}
          />
          {/* Egresos */}
          <FlujoGroup
            label="↓ Egresos" color="text-red-400"
            desglosado={egrDesglosado} onToggle={() => toggleDesglosar('egr')}
            main={egresos} onMainChange={setEgresos}
            componentes={egrComponentes}
            onAdd={() => agregarComponente('egr')}
            onRemove={(id) => quitarComponente('egr', id)}
            onEdit={(id, f, v) => editarComponente('egr', id, f, v)}
          />

          <div className="mb-4 flex items-center justify-between rounded-xl border border-white/10 bg-[#141416] px-4 py-3">
            <span className="text-sm font-bold text-white/70">Saldo final calculado</span>
            <span className={`text-xl font-extrabold ${saldoFinalCalc >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(saldoFinalCalc)}</span>
          </div>

          <div className="mb-4">
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">Notas del día (opcional)</div>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="¿Algo relevante hoy? Pagos pendientes, cobros esperados..." className={`${inputCls} min-h-[72px] resize-y`} />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={guardarDia} disabled={guardando}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar día
            </button>
            {feedback && <span className={`text-xs ${saveState === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>{feedback}</span>}
          </div>
        </div>

        {/* Gráfica */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-white"><TrendingUp className="h-4 w-4 text-[#1aab99]" /> Tendencia 30 días</div>
          <div ref={graficaWrapRef} className="relative h-[200px] w-full">
            {pts.length < 2 ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-white/25">
                <div><BarChart2 className="mx-auto mb-2 h-7 w-7 text-white/20" />Captura más días para ver la tendencia</div>
              </div>
            ) : (
              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
                <defs>
                  <linearGradient id="caja-area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lineColor} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3].map((t) => {
                  const v = minVal + (rango * t) / 3;
                  const y = yOf(v);
                  const label = v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'k' : v.toFixed(0);
                  return (
                    <g key={t}>
                      <line x1={pad.left} y1={y} x2={W - pad.right} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="4,4" />
                      <text x={pad.left - 6} y={y + 4} textAnchor="end" fontSize={10} fill="rgba(255,255,255,0.4)">{label}</text>
                    </g>
                  );
                })}
                <path d={areaD} fill="url(#caja-area-grad)" />
                <path d={pathD} fill="none" stroke={lineColor} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                {showUmbral && (
                  <>
                    <line x1={pad.left} y1={yOf(umbral!)} x2={W - pad.right} y2={yOf(umbral!)} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5,4" opacity={0.7} />
                    <text x={W - pad.right + 4} y={yOf(umbral!) + 4} fontSize={9} fill="#ef4444" opacity={0.8}>umbral</text>
                  </>
                )}
                {pts.map((d, i) => {
                  if (!(i % step === 0 || i === pts.length - 1)) return null;
                  const [, m, dd] = d.fecha.split('-');
                  return <text key={d.fecha} x={xOf(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.4)">{parseInt(dd, 10)} {MESES[parseInt(m, 10) - 1]}</text>;
                })}
                {pts.map((d, i) => (
                  <circle key={d.fecha} cx={xOf(i)} cy={yOf(d.saldo_final as number)} r={4}
                    fill={lineColor} stroke="#1c1c1e" strokeWidth={2}
                    opacity={hoverIdx === i ? 1 : 0} style={{ cursor: 'crosshair' }}
                    onMouseEnter={() => setHoverIdx(i)}
                    onMouseMove={(e) => {
                      const rect = graficaWrapRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      setHoverPos({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 10 });
                    }}
                    onMouseLeave={() => setHoverIdx(null)}
                  />
                ))}
              </svg>
            )}
            {hoverIdx != null && pts[hoverIdx] && (
              <div className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-white/10 bg-[#242426] px-3 py-2 text-xs leading-relaxed text-white shadow-xl"
                style={{ left: hoverPos.x, top: hoverPos.y }}>
                <strong>{fechaLabel(pts[hoverIdx].fecha)}</strong><br />
                Saldo: <strong>{fmt(pts[hoverIdx].saldo_final)}</strong><br />
                Ingresos: {fmt(pts[hoverIdx].ingresos_total)} · Egresos: {fmt(pts[hoverIdx].egresos_total)}
                {pts[hoverIdx].notas && <><br /><em className="text-white/40">{pts[hoverIdx].notas}</em></>}
              </div>
            )}
          </div>
        </div>

        {/* Historial */}
        <div>
          <button onClick={() => setHistorialOpen((o) => !o)} className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3.5 text-sm font-bold text-white/60 transition hover:bg-white/[0.06] hover:text-white">
            <Activity className="h-4 w-4" /> Ver historial completo
            <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${historialOpen ? 'rotate-180' : ''}`} />
          </button>
          {historialOpen && (
            <div className="mt-2 overflow-hidden rounded-xl border border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/[0.03]">
                      {['Fecha', 'Saldo inicial', 'Ingresos', 'Egresos', 'Saldo final', 'Notas'].map((h) => (
                        <th key={h} className="whitespace-nowrap border-b border-white/10 px-3.5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-white/40">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historial.slice(historialPage * 30, (historialPage + 1) * 30).map((d) => (
                      <tr key={d.fecha} onClick={() => abrirDesdeHistorial(d)} className="cursor-pointer border-b border-white/[0.06] last:border-0 hover:bg-white/[0.04]">
                        <td className="whitespace-nowrap px-3.5 py-2.5 font-semibold text-white">{fechaLabel(d.fecha)}</td>
                        <td className="px-3.5 py-2.5 text-white/60">{fmt(d.saldo_inicial)}</td>
                        <td className="px-3.5 py-2.5 font-semibold text-emerald-400">{fmt(d.ingresos_total)}</td>
                        <td className="px-3.5 py-2.5 font-semibold text-red-400">{fmt(d.egresos_total)}</td>
                        <td className="px-3.5 py-2.5 font-extrabold text-white">{fmt(d.saldo_final)}</td>
                        <td className="max-w-[160px] truncate px-3.5 py-2.5 text-xs text-white/30">{d.notas || '—'}</td>
                      </tr>
                    ))}
                    {historial.length === 0 && (
                      <tr><td colSpan={6} className="px-3.5 py-6 text-center text-sm text-white/30">Sin registros aún.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {historial.length > 0 && (
                <div className="flex items-center gap-2 border-t border-white/10 px-3.5 py-2.5">
                  <button disabled={historialPage === 0} onClick={() => setHistorialPage((p) => p - 1)} className="rounded-md border border-white/10 px-3 py-1 text-xs font-semibold text-white/60 disabled:opacity-30">‹ Anterior</button>
                  <span className="flex-1 text-xs text-white/40">Mostrando {historialPage * 30 + 1}–{Math.min((historialPage + 1) * 30, historial.length)} de {historial.length}</span>
                  <button disabled={(historialPage + 1) * 30 >= historial.length} onClick={() => setHistorialPage((p) => p + 1)} className="rounded-md border border-white/10 px-3 py-1 text-xs font-semibold text-white/60 disabled:opacity-30">Siguiente ›</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL SETUP */}
      {showSetup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[440px] rounded-2xl border border-white/10 bg-[#1c1c1e] p-8">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1aab99] to-[#3533cd]"><Wallet className="h-6 w-6 text-white" /></div>
            <h2 className="mb-2 text-xl font-extrabold text-white">Bienvenido al Flujo de Caja</h2>
            <p className="mb-6 text-sm leading-relaxed text-white/50">Para empezar, necesitamos saber cuánto tienes hoy en bancos y caja. Esto será tu saldo inicial y el punto de partida de tu historial financiero diario.</p>
            <div className="mb-2">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">Saldo inicial hoy</div>
              <input type="number" min={0} value={setupSaldo} onChange={(e) => setSetupSaldo(e.target.value)} placeholder="0" className={`${inputCls} text-lg`} />
            </div>
            <div className="mt-6 flex gap-2.5">
              <button onClick={confirmarSetup} disabled={savingSetup || !setupSaldo}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40">
                {savingSetup ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Comenzar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIG */}
      {showConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[440px] rounded-2xl border border-white/10 bg-[#1c1c1e] p-8">
            <h2 className="mb-2 text-xl font-extrabold text-white">Configuración</h2>
            <p className="mb-4 text-sm text-white/50">Ajusta el umbral de alerta y el saldo inicial de la cadena.</p>

            <div className="mb-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Umbral de alerta</div>
              <div className="flex flex-col gap-2">
                {[{ v: false, l: 'Automático (GFM del último diagnóstico)' }, { v: true, l: 'Manual' }].map((opt) => (
                  <label key={String(opt.v)} onClick={() => setUmbralManual(opt.v)}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 py-3 text-sm transition ${umbralManual === opt.v ? 'border-[#1aab99] bg-[#1aab99]/10' : 'border-white/10 hover:bg-white/[0.03]'}`}>
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${umbralManual === opt.v ? 'border-[#1aab99] bg-[#1aab99]' : 'border-white/20'}`}>
                      {umbralManual === opt.v && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                    <span className="font-semibold text-white">{opt.l}</span>
                  </label>
                ))}
              </div>
              {umbralManual && (
                <input type="number" value={configUmbral} onChange={(e) => setConfigUmbral(e.target.value)} placeholder="0" min={0} className={`${inputCls} mt-2`} />
              )}
            </div>

            <div className="mb-2">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">Saldo inicial de la cadena</div>
              <input type="number" value={configSaldoInicial} onChange={(e) => setConfigSaldoInicial(e.target.value)} placeholder="0" min={0} className={`${inputCls} mb-2`} />
              <button onClick={recalcularCadena} disabled={recalculando}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/60 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40">
                <RefreshCw className={`h-3.5 w-3.5 ${recalculando ? 'animate-spin' : ''}`} /> {recalculando ? 'Recalculando…' : 'Recalcular cadena desde el inicio'}
              </button>
              <div className="mt-1.5 text-[11px] text-white/30">Recalcula todos los saldos en cascada desde la primera entrada.</div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <button onClick={guardarConfig} className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90">
                <Check className="h-4 w-4" /> Guardar configuración
              </button>
              <button onClick={() => setShowConfig(false)} className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-white/60 transition hover:bg-white/[0.06] hover:text-white">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Grupo Ingresos/Egresos con desglose ── */
function FlujoGroup({
  label, color, desglosado, onToggle, main, onMainChange, componentes, onAdd, onRemove, onEdit,
}: {
  label: string; color: string; desglosado: boolean; onToggle: () => void;
  main: string; onMainChange: (v: string) => void;
  componentes: DraftComponente[];
  onAdd: () => void; onRemove: (id: string) => void; onEdit: (id: string, field: 'label' | 'monto', value: string) => void;
}) {
  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <span className={`flex-1 text-sm font-bold ${color}`}>{label}</span>
        <button onClick={onToggle} className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/60 transition hover:bg-white/[0.06] hover:text-white">
          {desglosado ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />} {desglosado ? 'Colapsar' : 'Desglosar'}
        </button>
      </div>
      {!desglosado ? (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-white/40">$</span>
          <input type="number" min={0} value={main} onChange={(e) => onMainChange(e.target.value)} placeholder="0" className={`${inputCls} pl-6`} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {componentes.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <input value={c.label} onChange={(e) => onEdit(c.id, 'label', e.target.value)} placeholder="Descripción" className={`${inputCls} flex-[2] text-sm`} />
              <input type="number" min={0} value={c.monto as unknown as string} onChange={(e) => onEdit(c.id, 'monto', e.target.value)} placeholder="0" className={`${inputCls} w-32 flex-shrink-0 text-sm`} />
              <button onClick={() => onRemove(c.id)} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-white/10 text-white/30 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button onClick={onAdd} className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 py-2 text-xs font-semibold text-white/40 transition hover:border-[#1aab99] hover:text-[#1aab99]">
            <Plus className="h-3.5 w-3.5" /> Agregar componente
          </button>
        </div>
      )}
    </div>
  );
}
