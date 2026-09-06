'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Play, Loader2, Home, RefreshCcw, Grid as GridIcon,
  Clock, Layers, Shield, History, TrendingUp, Settings, BarChart2, AlertTriangle, Check,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  MAPE_VERSION, MAPE_ESCALA_LIKERT, MAPE_EJES, MAPE_INDICADORES, MAPE_CUADRANTES,
  getIndicadoresByEje, normalizarRespuesta, getPosicionMatriz, type MapeCuadrante, type MapeIndicador,
} from './mape-questions';

type MapeEvaluacionRow = {
  id: string;
  cuadrante: string;
  puntaje_financiero: number;
  puntaje_operativo: number;
  completada_en: string;
};

type Resultado = { cuadrante: string; puntaje_financiero: number; puntaje_operativo: number };
type Respuesta = { raw: string; score: number };
type SubView = 'intro' | 'eval' | 'result';

const fmtFecha = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';

const EJE_ICONS: Record<string, any> = { financiero: TrendingUp, operativo: Settings };

export function MapeView({ orgId, userId, onBack }: { orgId: string; userId: string; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<SubView>('intro');
  const [historial, setHistorial] = useState<MapeEvaluacionRow[]>([]);
  const [evaluacionId, setEvaluacionId] = useState<string | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, Respuesta>>({});
  const [ejeActual, setEjeActual] = useState(0);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [starting, setStarting] = useState(false);

  const loadHistorial = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('mape_evaluaciones')
      .select('*')
      .eq('organizacion_id', orgId)
      .eq('usuario_id', userId)
      .eq('estado', 'completada')
      .order('completada_en', { ascending: false })
      .limit(10);
    setHistorial((data ?? []) as MapeEvaluacionRow[]);
  };

  useEffect(() => {
    (async () => {
      await loadHistorial();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getProgreso = () => {
    const total = MAPE_INDICADORES.length;
    const respondidas = Object.keys(respuestas).length;
    return { total, respondidas, pct: total ? Math.round((respondidas / total) * 100) : 0 };
  };
  const getEjeProgreso = (ejeCodigo: string) => {
    const indicadores = getIndicadoresByEje(ejeCodigo);
    const respondidos = indicadores.filter((i) => respuestas[i.codigo] !== undefined).length;
    return { total: indicadores.length, respondidos, completo: respondidos === indicadores.length };
  };
  const todasRespondidas = () => MAPE_INDICADORES.every((i) => respuestas[i.codigo] !== undefined);

  async function empezarEvaluacion() {
    setStarting(true);
    const supabase = createClient();
    const { data: evalId, error } = await supabase.rpc('mape_iniciar_evaluacion', { p_org_id: orgId });
    if (error || !evalId) { setStarting(false); return; }
    setEvaluacionId(evalId as string);

    const { data: respData } = await supabase
      .from('mape_respuestas')
      .select('indicador_codigo, raw_value, score_0_100')
      .eq('evaluacion_id', evalId);
    const map: Record<string, Respuesta> = {};
    (respData ?? []).forEach((r: any) => { map[r.indicador_codigo] = { raw: r.raw_value, score: r.score_0_100 }; });
    setRespuestas(map);

    let primero = 0;
    for (let i = 0; i < MAPE_EJES.length; i++) {
      const indicadores = getIndicadoresByEje(MAPE_EJES[i].codigo);
      const respondidos = indicadores.filter((ind) => map[ind.codigo] !== undefined).length;
      if (respondidos !== indicadores.length) { primero = i; break; }
    }
    setEjeActual(primero);
    setStarting(false);
    setSub('eval');
  }

  async function guardarRespuesta(indicador: MapeIndicador, rawValue: string | number, score: number) {
    setRespuestas((prev) => ({ ...prev, [indicador.codigo]: { raw: String(rawValue), score } }));
    setSaving(true);
    const supabase = createClient();
    await supabase.from('mape_respuestas').upsert(
      {
        evaluacion_id: evaluacionId,
        indicador_codigo: indicador.codigo,
        eje: indicador.eje,
        tipo: indicador.tipo,
        raw_value: String(rawValue),
        score_0_100: Math.round(score),
        orden: indicador.orden,
      },
      { onConflict: 'evaluacion_id,indicador_codigo' },
    );
    setSaving(false);
  }

  function onNumericoClear(codigo: string) {
    setRespuestas((prev) => {
      const next = { ...prev };
      delete next[codigo];
      return next;
    });
  }

  async function completar() {
    if (!todasRespondidas() || !evaluacionId) return;
    setCompleting(true);
    const supabase = createClient();
    await supabase.from('mape_evaluaciones').update({ cuestionario_version: MAPE_VERSION }).eq('id', evaluacionId);
    const { data, error } = await supabase.rpc('mape_calcular_cuadrante', {
      p_evaluacion_id: evaluacionId,
      p_min_indicadores: 12,
    });
    setCompleting(false);
    if (error || !data) return;
    setResultado(data as Resultado);
    setSub('result');
    await loadHistorial();
  }

  async function nuevaEvaluacion() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('mape_evaluaciones')
      .insert({ organizacion_id: orgId, usuario_id: userId, estado: 'en_progreso', cuestionario_version: MAPE_VERSION })
      .select('id')
      .single();
    if (error || !data) return;
    setEvaluacionId(data.id);
    setRespuestas({});
    setEjeActual(0);
    setResultado(null);
    setSub('eval');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  const eyebrow = sub === 'intro' ? 'Pilar 1 · Reflejo' : sub === 'eval' ? 'MAPE · Evaluación' : 'MAPE · Resultado';
  const title = sub === 'intro' ? 'MAPE — Matriz de Posicionamiento Empresarial' : sub === 'eval' ? 'Evaluando tu empresa' : 'Tu cuadrante empresarial';

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">{eyebrow}</p>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
        </div>
      </div>

      {sub === 'intro' && <IntroView historial={historial} onEmpezar={empezarEvaluacion} starting={starting} />}
      {sub === 'eval' && (
        <EvalView
          ejeActual={ejeActual}
          respuestas={respuestas}
          saving={saving}
          completing={completing}
          onGuardar={guardarRespuesta}
          onClearNumerico={onNumericoClear}
          onPrev={() => setEjeActual((e) => Math.max(0, e - 1))}
          onNext={() => {
            const esUltimo = ejeActual === MAPE_EJES.length - 1;
            if (esUltimo) completar();
            else setEjeActual((e) => Math.min(MAPE_EJES.length - 1, e + 1));
          }}
          progreso={getProgreso()}
          ejeProgreso={getEjeProgreso(MAPE_EJES[ejeActual].codigo)}
          todasRespondidas={todasRespondidas()}
        />
      )}
      {sub === 'result' && resultado && (
        <ResultView resultado={resultado} onVolverIntro={() => setSub('intro')} onNuevaEvaluacion={nuevaEvaluacion} />
      )}
    </div>
  );
}

/* ─────────────────────────── INTRO ─────────────────────────── */
function IntroView({
  historial, onEmpezar, starting,
}: { historial: MapeEvaluacionRow[]; onEmpezar: () => void; starting: boolean }) {
  const ultima = historial[0];
  const cuadrantesPreview = [
    { key: 'crecimiento_escalable', badge: 'SALUDABLE', badgeCls: 'bg-emerald-500/15 text-emerald-400', borderCls: 'border-emerald-500/40' },
    { key: 'crecimiento_fragil', badge: 'ATENCION', badgeCls: 'bg-amber-500/15 text-amber-400', borderCls: 'border-amber-500/40' },
    { key: 'financiero_estancado', badge: 'ATENCION', badgeCls: 'bg-amber-500/15 text-amber-400', borderCls: 'border-amber-500/40' },
    { key: 'zona_estancamiento', badge: 'URGENTE', badgeCls: 'bg-red-500/15 text-red-400', borderCls: 'border-red-500/40' },
  ];

  return (
    <>
      <p className="-mt-3 mb-6 max-w-2xl text-white/50">
        El MAPE ubica a tu empresa en una matriz 2x2. Mide 2 ejes que determinan si vas hacia escalabilidad real o hacia el estancamiento.
      </p>

      {ultima && (
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-white/[0.08] border-l-[3px] border-l-[#1aab99] bg-[#1c1c1e] p-5">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#1aab99]/15 text-[#1aab99]">
            <History className="h-5 w-5" />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/50">
            <span>Ya completaste el MAPE antes</span>
            <span>Última vez: <strong className="text-white/80">{fmtFecha(ultima.completada_en)}</strong></span>
            <span>Cuadrante: <strong className="text-white/80">{MAPE_CUADRANTES[ultima.cuadrante]?.nombre ?? ultima.cuadrante}</strong></span>
            <span>Puntajes: <strong className="text-white/80">F: {ultima.puntaje_financiero} / O: {ultima.puntaje_operativo}</strong></span>
          </div>
        </div>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="relative flex flex-col justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] p-8 text-white">
          <span className="mb-2 block text-5xl font-black leading-none opacity-40">&ldquo;</span>
          <div className="mb-3 text-2xl font-extrabold leading-tight">Estás avanzando o estás estancado. No hay punto medio.</div>
          <p className="text-sm opacity-90">Si el PIE midió tu liderazgo, el MAPE mide tu empresa. Es la otra mitad del diagnóstico.</p>
        </div>
        <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
          {[
            { icon: Clock, label: 'Duración estimada', value: '10-15 minutos' },
            { icon: Layers, label: 'Estructura', value: '2 ejes · 12 indicadores' },
            { icon: GridIcon, label: 'Resultado', value: 'Tu cuadrante + plan' },
            { icon: Shield, label: 'Confidencialidad', value: 'Solo tú y tu consultor' },
          ].map((s, i, arr) => (
            <div key={s.label} className={`flex items-center gap-3 py-3 ${i < arr.length - 1 ? 'border-b border-white/[0.08]' : ''}`}>
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#1aab99]/15 text-[#1aab99]">
                <s.icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-wide text-white/40">{s.label}</div>
                <div className="text-sm font-bold text-white">{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
        <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white">
          <GridIcon className="h-3.5 w-3.5 text-[#1aab99]" /> Los 4 cuadrantes posibles
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {cuadrantesPreview.map((c) => {
            const cuad = MAPE_CUADRANTES[c.key];
            return (
              <div key={c.key} className={`flex flex-col gap-1.5 rounded-xl border ${c.borderCls} bg-[#141416] p-4`}>
                <span className={`inline-block w-fit rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${c.badgeCls}`}>{c.badge}</span>
                <div className="text-sm font-bold text-white">{cuad.nombre}</div>
                <div className="text-xs leading-relaxed text-white/40">{cuad.descripcion_corta}</div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={onEmpezar}
        disabled={starting}
        className="flex items-center gap-2 rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-7 py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        Empezar evaluación
      </button>
    </>
  );
}

/* ─────────────────────────── EVAL ─────────────────────────── */
function EvalView({
  ejeActual, respuestas, saving, completing, onGuardar, onClearNumerico, onPrev, onNext, progreso, ejeProgreso, todasRespondidas,
}: {
  ejeActual: number;
  respuestas: Record<string, Respuesta>;
  saving: boolean;
  completing: boolean;
  onGuardar: (ind: MapeIndicador, raw: string | number, score: number) => void;
  onClearNumerico: (codigo: string) => void;
  onPrev: () => void;
  onNext: () => void;
  progreso: { total: number; respondidas: number; pct: number };
  ejeProgreso: { total: number; respondidos: number; completo: boolean };
  todasRespondidas: boolean;
}) {
  const eje = MAPE_EJES[ejeActual];
  const indicadores = getIndicadoresByEje(eje.codigo);
  const esUltimo = ejeActual === MAPE_EJES.length - 1;
  const nextDisabled = completing || (esUltimo ? !todasRespondidas : !ejeProgreso.completo);
  const EjeIcon = EJE_ICONS[eje.codigo] ?? GridIcon;

  return (
    <>
      <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-gradient-to-r from-[#1aab99] to-[#3533cd] transition-all" style={{ width: `${progreso.pct}%` }} />
      </div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-white/40">
        <span>Eje <strong className="text-white">{ejeActual + 1}</strong> de {MAPE_EJES.length} · {eje.titulo}</span>
        <span className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${saving ? 'animate-pulse bg-amber-400' : 'bg-emerald-400'}`} />
          {saving ? 'Guardando…' : 'Respuestas guardadas'}
        </span>
        <span><strong className="text-white">{progreso.respondidas}</strong> de {progreso.total} indicadores</span>
      </div>

      <div className="mb-5 flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#1aab99]/15 text-[#1aab99]">
          <EjeIcon className="h-5 w-5" />
        </div>
        <div>
          <div className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-[#1aab99]">Eje {eje.numero} de 2 · {eje.titulo}</div>
          <div className="mb-0.5 text-lg font-extrabold text-white">{eje.pregunta}</div>
          <div className="text-xs italic text-white/40">{eje.descripcion}</div>
        </div>
      </div>

      <div className="space-y-3">
        {indicadores.map((ind) => (
          <IndicadorCard key={ind.codigo} ind={ind} respuesta={respuestas[ind.codigo]} onGuardar={onGuardar} onClear={onClearNumerico} />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          onClick={onPrev}
          disabled={ejeActual === 0}
          className={`flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/[0.08] ${ejeActual === 0 ? 'invisible' : ''}`}
        >
          <ArrowLeft className="h-4 w-4" /> Eje anterior
        </button>
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className="flex items-center gap-2 rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span>{completing ? 'Calculando…' : esUltimo ? 'Ver resultado' : `Siguiente eje: ${MAPE_EJES[ejeActual + 1]?.titulo ?? ''}`}</span>
          {!completing && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </>
  );
}

function IndicadorCard({
  ind, respuesta, onGuardar, onClear,
}: { ind: MapeIndicador; respuesta?: Respuesta; onGuardar: (ind: MapeIndicador, raw: string | number, score: number) => void; onClear: (codigo: string) => void }) {
  const [numVal, setNumVal] = useState(respuesta?.raw ?? '');

  useEffect(() => { setNumVal(respuesta?.raw ?? ''); }, [ind.codigo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (ind.tipo !== 'numerico') return;
    const t = setTimeout(() => {
      if (numVal.trim() === '') {
        if (respuesta) onClear(ind.codigo);
        return;
      }
      const score = normalizarRespuesta(ind, numVal);
      onGuardar(ind, numVal, score);
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numVal]);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
      <div className="mb-4 text-[15px] font-semibold leading-relaxed text-white">{ind.texto}</div>

      {ind.tipo === 'likert' && (
        <div className="grid grid-cols-5 gap-2">
          {MAPE_ESCALA_LIKERT.map((e) => {
            const selected = parseInt(respuesta?.raw ?? '') === e.valor;
            return (
              <button
                key={e.valor}
                type="button"
                onClick={() => onGuardar(ind, e.valor, normalizarRespuesta(ind, e.valor))}
                className={`rounded-lg border px-1.5 py-3 text-center transition ${
                  selected
                    ? 'border-transparent bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-white'
                    : 'border-white/10 bg-[#141416] text-white/70 hover:border-[#1aab99]/50 hover:bg-white/[0.04]'
                }`}
              >
                <div className="text-lg font-black">{e.valor}</div>
                <div className={`text-[10px] leading-tight ${selected ? 'text-white/90' : 'text-white/40'}`}>{e.label}</div>
              </button>
            );
          })}
        </div>
      )}

      {ind.tipo === 'numerico' && (
        <>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={numVal}
              onChange={(e) => setNumVal(e.target.value)}
              placeholder={ind.placeholder ?? '0'}
              min={ind.min}
              max={ind.max}
              step="any"
              className="flex-1 rounded-lg border border-white/10 bg-[#141416] px-4 py-3 text-lg font-bold text-white outline-none transition placeholder:text-white/25 focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25"
            />
            <span className="min-w-[50px] text-sm font-bold text-white/60">{ind.suffix}</span>
          </div>
          {ind.hint && (
            <div className="mt-2.5 rounded-md border-l-2 border-[#1aab99] bg-white/[0.04] px-3.5 py-2.5 text-xs leading-relaxed text-white/50">
              {ind.hint}
            </div>
          )}
        </>
      )}

      {ind.tipo === 'selector' && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ind.opciones?.map((o) => {
            const selected = respuesta?.raw === o.codigo;
            return (
              <button
                key={o.codigo}
                type="button"
                onClick={() => onGuardar(ind, o.codigo, o.score)}
                className={`rounded-lg border px-4 py-3.5 text-center text-[13px] font-bold transition ${
                  selected
                    ? 'border-transparent bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-white'
                    : 'border-white/10 bg-[#141416] text-white/70 hover:border-[#1aab99]/50 hover:bg-white/[0.04]'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── RESULT ─────────────────────────── */
function ResultView({
  resultado, onVolverIntro, onNuevaEvaluacion,
}: { resultado: Resultado; onVolverIntro: () => void; onNuevaEvaluacion: () => void }) {
  const cuad: MapeCuadrante = MAPE_CUADRANTES[resultado.cuadrante] ?? MAPE_CUADRANTES.zona_estancamiento;
  const heroCls = cuad.color === 'green' ? 'from-emerald-500 to-[#1aab99]' : cuad.color === 'amber' ? 'from-amber-500 to-orange-600' : 'from-red-500 to-red-800';
  const pos = getPosicionMatriz(resultado.puntaje_financiero, resultado.puntaje_operativo);

  const cells = [
    { key: 'crecimiento_escalable', name: 'Crecimiento Escalable', mini: 'Alto · Alta', cls: 'border-emerald-500/50 bg-emerald-500/10' },
    { key: 'crecimiento_fragil', name: 'Crecimiento Frágil', mini: 'Alto · Baja', cls: 'border-amber-500/50 bg-amber-500/10' },
    { key: 'financiero_estancado', name: 'Financiero Estancado', mini: 'Bajo · Alta', cls: 'border-amber-500/50 bg-amber-500/10' },
    { key: 'zona_estancamiento', name: 'Estancamiento', mini: 'Bajo · Baja', cls: 'border-red-500/50 bg-red-500/10' },
  ];

  const ejesBreakdown = [
    { nombre: 'Crecimiento financiero', valor: resultado.puntaje_financiero },
    { nombre: 'Capacidad operativa', valor: resultado.puntaje_operativo },
  ];

  return (
    <>
      <div className={`relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br ${heroCls} p-8 text-white`}>
        <div className="mb-3 text-xs font-bold uppercase tracking-widest opacity-85">Tu cuadrante</div>
        <div className="mb-4 text-4xl font-black tracking-tight">{cuad.nombre}</div>
        <div className="mb-4 flex flex-wrap gap-3.5">
          <div className="rounded-xl bg-white/20 px-4 py-3">
            <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide opacity-85">Crecimiento financiero</div>
            <div className="text-xl font-black">{resultado.puntaje_financiero} / 100</div>
          </div>
          <div className="rounded-xl bg-white/20 px-4 py-3">
            <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide opacity-85">Capacidad operativa</div>
            <div className="text-xl font-black">{resultado.puntaje_operativo} / 100</div>
          </div>
        </div>
        <p className="max-w-xl text-sm leading-relaxed opacity-95">{cuad.descripcion_larga}</p>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
          <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white">
            <GridIcon className="h-3.5 w-3.5 text-[#1aab99]" /> Tu posición en la matriz
          </div>
          <div className="relative mx-auto aspect-square max-w-[320px] px-6 py-5">
            <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-xl">
              {cells.map((c) => (
                <div key={c.key} className={`flex flex-col justify-start gap-1.5 border p-3 opacity-50 transition-opacity ${c.cls} ${c.key === cuad.codigo ? '!opacity-100' : ''}`}>
                  <div className="text-[11px] font-extrabold leading-tight text-white">{c.name}</div>
                  <div className="text-[9.5px] text-white/40">{c.mini}</div>
                </div>
              ))}
            </div>
            <div
              className="absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-gradient-to-br from-[#1aab99] to-[#3533cd] shadow-lg transition-all duration-700"
              style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
          <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white">
            <BarChart2 className="h-3.5 w-3.5 text-[#1aab99]" /> Desglose por eje
          </div>
          <div className="flex flex-col gap-4">
            {ejesBreakdown.map((e) => {
              const cls = e.valor >= 70 ? 'bg-emerald-500' : e.valor >= 50 ? 'bg-amber-500' : 'bg-red-500';
              return (
                <div key={e.nombre}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-sm text-white/70">{e.nombre}</span>
                    <span className="text-sm font-extrabold text-white">{e.valor} / 100</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div className={`h-full rounded-full transition-all ${cls}`} style={{ width: `${e.valor}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
        <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white">
          Acciones prioritarias para tu cuadrante
        </div>
        <ul className="flex flex-col gap-2.5">
          {cuad.riesgo_principal && (
            <li className="flex items-start gap-3 rounded-xl border border-amber-500/30 border-l-[3px] border-l-amber-500 bg-[#141416] p-4">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-400"><AlertTriangle className="h-3 w-3" /></div>
              <div className="text-sm leading-relaxed text-white/70"><strong className="text-white">Riesgo principal:</strong> {cuad.riesgo_principal}</div>
            </li>
          )}
          {cuad.acciones.map((a) => (
            <li key={a} className="flex items-start gap-3 rounded-xl border border-white/10 border-l-[3px] border-l-[#1aab99] bg-[#141416] p-4">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-[#1aab99]/15 text-[#1aab99]"><Check className="h-3 w-3" /></div>
              <div className="text-sm leading-relaxed text-white/70">{a}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <button onClick={onVolverIntro} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/[0.08]">
          <Home className="h-4 w-4" /> Volver al inicio
        </button>
        <button onClick={onNuevaEvaluacion} className="flex items-center gap-2 rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90">
          <RefreshCcw className="h-4 w-4" /> Hacer nueva evaluación
        </button>
      </div>
    </>
  );
}
