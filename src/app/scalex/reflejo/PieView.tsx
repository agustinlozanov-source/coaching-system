'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Play, Loader2, Home, RefreshCcw, Target, Check,
  Clock, ListChecks, Award, Shield, History, Layers,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  PIE_VERSION, PIE_ESCALA, PIE_SECCIONES, PIE_PREGUNTAS, PIE_PERFILES,
  getPerfilByPuntaje, getPreguntasBySeccion, type PiePerfil,
} from './pie-questions';

type PieEvaluacionRow = {
  id: string;
  perfil: string;
  puntaje_total: number;
  puntaje_mentalidad: number;
  puntaje_decisiones: number;
  puntaje_delegacion: number;
  puntaje_vision: number;
  completada_en: string;
};

type Resultado = {
  perfil: string;
  puntaje_total: number;
  puntaje_mentalidad: number;
  puntaje_decisiones: number;
  puntaje_delegacion: number;
  puntaje_vision: number;
};

type SubView = 'intro' | 'eval' | 'result';

const fmtFecha = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';

export function PieView({ orgId, userId, onBack }: { orgId: string; userId: string; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<SubView>('intro');
  const [historial, setHistorial] = useState<PieEvaluacionRow[]>([]);
  const [evaluacionId, setEvaluacionId] = useState<string | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, number>>({});
  const [seccionActual, setSeccionActual] = useState(0);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [starting, setStarting] = useState(false);

  const loadHistorial = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('pie_evaluaciones')
      .select('*')
      .eq('organizacion_id', orgId)
      .eq('usuario_id', userId)
      .eq('estado', 'completada')
      .order('completada_en', { ascending: false })
      .limit(10);
    setHistorial((data ?? []) as PieEvaluacionRow[]);
  };

  useEffect(() => {
    (async () => {
      await loadHistorial();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getProgreso = () => {
    const total = PIE_PREGUNTAS.length;
    const respondidas = Object.keys(respuestas).length;
    return { total, respondidas, pct: total ? Math.round((respondidas / total) * 100) : 0 };
  };
  const getSeccionProgreso = (seccionCodigo: string) => {
    const preguntas = getPreguntasBySeccion(seccionCodigo);
    const respondidas = preguntas.filter((p) => respuestas[p.codigo] !== undefined).length;
    return { total: preguntas.length, respondidas, completa: respondidas === preguntas.length };
  };
  const todasRespondidas = () => PIE_PREGUNTAS.every((p) => respuestas[p.codigo] !== undefined);

  async function empezarEvaluacion() {
    setStarting(true);
    const supabase = createClient();
    const { data: evalId, error } = await supabase.rpc('pie_iniciar_evaluacion', { p_org_id: orgId });
    if (error || !evalId) {
      setStarting(false);
      return;
    }
    setEvaluacionId(evalId as string);

    const { data: respData } = await supabase
      .from('pie_respuestas')
      .select('pregunta_codigo, valor')
      .eq('evaluacion_id', evalId);
    const map: Record<string, number> = {};
    (respData ?? []).forEach((r: any) => { map[r.pregunta_codigo] = r.valor; });
    setRespuestas(map);

    let primera = 0;
    for (let i = 0; i < PIE_SECCIONES.length; i++) {
      const preguntas = getPreguntasBySeccion(PIE_SECCIONES[i].codigo);
      const respondidas = preguntas.filter((p) => map[p.codigo] !== undefined).length;
      if (respondidas !== preguntas.length) { primera = i; break; }
    }
    setSeccionActual(primera);
    setStarting(false);
    setSub('eval');
  }

  async function onSelectOption(codigo: string, valor: number) {
    setRespuestas((prev) => ({ ...prev, [codigo]: valor }));
    setSaving(true);
    const pregunta = PIE_PREGUNTAS.find((p) => p.codigo === codigo);
    const seccion = codigo.split('_')[0];
    const supabase = createClient();
    await supabase.from('pie_respuestas').upsert(
      {
        evaluacion_id: evaluacionId,
        pregunta_codigo: codigo,
        seccion,
        valor,
        orden: pregunta?.orden ?? 0,
      },
      { onConflict: 'evaluacion_id,pregunta_codigo' },
    );
    setSaving(false);
  }

  async function completar() {
    if (!todasRespondidas() || !evaluacionId) return;
    setCompleting(true);
    const supabase = createClient();
    await supabase.from('pie_evaluaciones').update({ cuestionario_version: PIE_VERSION }).eq('id', evaluacionId);
    const { data, error } = await supabase.rpc('pie_calcular_perfil', { p_evaluacion_id: evaluacionId });
    setCompleting(false);
    if (error || !data) return;
    setResultado(data as Resultado);
    setSub('result');
    await loadHistorial();
  }

  async function nuevaEvaluacion() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('pie_evaluaciones')
      .insert({ organizacion_id: orgId, usuario_id: userId, estado: 'en_progreso', cuestionario_version: PIE_VERSION })
      .select('id')
      .single();
    if (error || !data) return;
    setEvaluacionId(data.id);
    setRespuestas({});
    setSeccionActual(0);
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

  const eyebrow = sub === 'intro' ? 'Pilar 1 · Reflejo' : sub === 'eval' ? 'PIE · Evaluación' : 'PIE · Resultado';
  const title = sub === 'intro' ? 'PIE — Perfil de Impacto Empresarial' : sub === 'eval' ? 'Evaluando tu liderazgo' : 'Tu perfil de liderazgo';

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

      {sub === 'intro' && (
        <IntroView historial={historial} onEmpezar={empezarEvaluacion} starting={starting} />
      )}
      {sub === 'eval' && (
        <EvalView
          seccionActual={seccionActual}
          respuestas={respuestas}
          saving={saving}
          completing={completing}
          onSelect={onSelectOption}
          onPrev={() => setSeccionActual((s) => Math.max(0, s - 1))}
          onNext={() => {
            const esUltima = seccionActual === PIE_SECCIONES.length - 1;
            if (esUltima) completar();
            else setSeccionActual((s) => Math.min(PIE_SECCIONES.length - 1, s + 1));
          }}
          progreso={getProgreso()}
          seccionProgreso={getSeccionProgreso(PIE_SECCIONES[seccionActual].codigo)}
          todasRespondidas={todasRespondidas()}
        />
      )}
      {sub === 'result' && resultado && (
        <ResultView
          resultado={resultado}
          onVolverIntro={() => setSub('intro')}
          onNuevaEvaluacion={nuevaEvaluacion}
        />
      )}
    </div>
  );
}

/* ─────────────────────────── INTRO ─────────────────────────── */
function IntroView({
  historial, onEmpezar, starting,
}: { historial: PieEvaluacionRow[]; onEmpezar: () => void; starting: boolean }) {
  const ultima = historial[0];
  return (
    <>
      <p className="-mt-3 mb-6 max-w-2xl text-white/50">
        El PIE es un espejo sin filtros. La forma más rápida de saber si eres el motor de la escalabilidad o el freno de tu negocio.
      </p>

      {ultima && (
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-white/[0.08] border-l-[3px] border-l-[#1aab99] bg-[#1c1c1e] p-5">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#1aab99]/15 text-[#1aab99]">
            <History className="h-5 w-5" />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/50">
            <span>Ya completaste el PIE antes</span>
            <span>Última vez: <strong className="text-white/80">{fmtFecha(ultima.completada_en)}</strong></span>
            <span>Perfil: <strong className="text-white/80">{PIE_PERFILES[ultima.perfil]?.nombre ?? ultima.perfil}</strong></span>
            <span>Puntaje: <strong className="text-white/80">{ultima.puntaje_total} / 100</strong></span>
          </div>
        </div>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="relative flex flex-col justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] p-8 text-white">
          <span className="mb-2 block text-5xl font-black leading-none opacity-40">&ldquo;</span>
          <div className="mb-3 text-2xl font-extrabold leading-tight">
            Antes de escalar tu negocio, primero necesitas escalar tu liderazgo.
          </div>
          <p className="text-sm opacity-90">Esta evaluación no busca buenos o malos. Solo claridad sobre dónde estás y qué necesitas ajustar.</p>
        </div>

        <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
          {[
            { icon: Clock, label: 'Duración estimada', value: '8-12 minutos' },
            { icon: ListChecks, label: 'Preguntas', value: '20 afirmaciones · escala 1-5' },
            { icon: Award, label: 'Resultado', value: 'Tu perfil de líder' },
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
          <Layers className="h-3.5 w-3.5 text-[#1aab99]" /> Las 4 dimensiones que evalúa
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PIE_SECCIONES.map((s) => (
            <div key={s.codigo} className="rounded-xl border border-white/10 bg-[#141416] p-4">
              <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-[#1aab99]">Sección {s.numero}</div>
              <div className="mb-1 text-sm font-bold text-white">{s.titulo}</div>
              <div className="text-xs leading-relaxed text-white/40">{s.pregunta}</div>
            </div>
          ))}
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
  seccionActual, respuestas, saving, completing, onSelect, onPrev, onNext, progreso, seccionProgreso, todasRespondidas,
}: {
  seccionActual: number;
  respuestas: Record<string, number>;
  saving: boolean;
  completing: boolean;
  onSelect: (codigo: string, valor: number) => void;
  onPrev: () => void;
  onNext: () => void;
  progreso: { total: number; respondidas: number; pct: number };
  seccionProgreso: { total: number; respondidas: number; completa: boolean };
  todasRespondidas: boolean;
}) {
  const seccion = PIE_SECCIONES[seccionActual];
  const preguntas = getPreguntasBySeccion(seccion.codigo);
  const esUltima = seccionActual === PIE_SECCIONES.length - 1;
  const nextDisabled = completing || (esUltima ? !todasRespondidas : !seccionProgreso.completa);

  return (
    <>
      <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-gradient-to-r from-[#1aab99] to-[#3533cd] transition-all" style={{ width: `${progreso.pct}%` }} />
      </div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-white/40">
        <span>Sección <strong className="text-white">{seccionActual + 1}</strong> de {PIE_SECCIONES.length}</span>
        <span className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${saving ? 'animate-pulse bg-amber-400' : 'bg-emerald-400'}`} />
          {saving ? 'Guardando…' : 'Respuestas guardadas'}
        </span>
        <span><strong className="text-white">{progreso.respondidas}</strong> de {progreso.total} preguntas</span>
      </div>

      <div className="mb-5">
        <div className="mb-2.5 inline-block rounded-full bg-[#1aab99]/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#1aab99]">
          Sección {seccion.numero} · {seccion.titulo}
        </div>
        <h2 className="mb-1.5 text-xl font-extrabold text-white">{seccion.pregunta}</h2>
        <p className="text-sm italic text-white/40">{seccion.descripcion}</p>
      </div>

      <div className="space-y-3">
        {preguntas.map((p) => {
          const respuesta = respuestas[p.codigo];
          return (
            <div key={p.codigo} className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
              <div className="mb-4 text-[15px] font-semibold leading-relaxed text-white">&ldquo;{p.texto}&rdquo;</div>
              <div className="grid grid-cols-5 gap-2">
                {PIE_ESCALA.map((e) => {
                  const selected = respuesta === e.valor;
                  return (
                    <button
                      key={e.valor}
                      type="button"
                      onClick={() => onSelect(p.codigo, e.valor)}
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
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          onClick={onPrev}
          disabled={seccionActual === 0}
          className={`flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/[0.08] ${seccionActual === 0 ? 'invisible' : ''}`}
        >
          <ArrowLeft className="h-4 w-4" /> Sección anterior
        </button>
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className="flex items-center gap-2 rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span>{completing ? 'Calculando…' : esUltima ? 'Ver resultado' : 'Sección siguiente'}</span>
          {!completing && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </>
  );
}

/* ─────────────────────────── RESULT ─────────────────────────── */
function ResultView({
  resultado, onVolverIntro, onNuevaEvaluacion,
}: { resultado: Resultado; onVolverIntro: () => void; onNuevaEvaluacion: () => void }) {
  const perfil: PiePerfil = PIE_PERFILES[resultado.perfil] ?? PIE_PERFILES.lider_reactivo;
  const scores = {
    mentalidad: resultado.puntaje_mentalidad,
    decisiones: resultado.puntaje_decisiones,
    delegacion: resultado.puntaje_delegacion,
    vision: resultado.puntaje_vision,
  };
  const secciones = [
    { nombre: 'Mentalidad empresarial', valor: scores.mentalidad },
    { nombre: 'Toma de decisiones', valor: scores.decisiones },
    { nombre: 'Delegación y liderazgo', valor: scores.delegacion },
    { nombre: 'Visión y estrategia', valor: scores.vision },
  ];
  const masBaja = [...secciones].sort((a, b) => a.valor - b.valor)[0];

  return (
    <>
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] p-8 text-white">
        <div className="mb-3 text-xs font-bold uppercase tracking-widest opacity-85">Tu perfil de liderazgo</div>
        <div className="mb-3 text-4xl font-black tracking-tight">{perfil.nombre}</div>
        <div className="mb-4 flex items-baseline gap-3">
          <span className="text-5xl font-black">{resultado.puntaje_total}</span>
          <span className="text-base font-semibold opacity-80">/ 100 puntos</span>
        </div>
        <p className="mb-5 max-w-xl text-sm leading-relaxed opacity-95">{perfil.descripcion_larga}</p>
        <div className="h-2 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-white transition-all" style={{ width: `${Math.max(2, resultado.puntaje_total)}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-[10.5px] font-semibold uppercase tracking-wide opacity-85">
          <span>Reactivo</span><span>Operativo</span><span>Transición</span><span>Estratégico</span>
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
          <div className="mb-4 text-xs font-bold uppercase tracking-wide text-white">Radar por dimensión</div>
          <div className="flex justify-center">
            <PieRadar scores={scores} />
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
          <div className="mb-4 text-xs font-bold uppercase tracking-wide text-white">Desglose por sección</div>
          <div className="flex flex-col gap-4">
            {secciones.map((s) => {
              const pct = (s.valor / 25) * 100;
              const barCls = pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
              return (
                <div key={s.nombre}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-sm text-white/70">{s.nombre}</span>
                    <span className="text-sm font-extrabold text-white">{s.valor} / 25</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
        <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white">
          <Target className="h-3.5 w-3.5 text-[#1aab99]" /> Qué hacer ahora — acciones prioritarias
        </div>
        <ul className="flex flex-col gap-2.5">
          <li className="flex items-start gap-3 rounded-xl border border-white/10 border-l-[3px] border-l-[#1aab99] bg-[#141416] p-4">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-[#1aab99]/15 text-[#1aab99]"><Target className="h-3 w-3" /></div>
            <div className="text-sm leading-relaxed text-white/70">
              <strong className="text-white">Tu dimensión más baja es &ldquo;{masBaja.nombre}&rdquo; ({masBaja.valor}/25).</strong> Es donde más espacio tienes para crecer y donde más impacto generará mejorar.
            </div>
          </li>
          {perfil.acciones.map((a) => (
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

function PieRadar({ scores }: { scores: { mentalidad: number; decisiones: number; delegacion: number; vision: number } }) {
  const max = 25;
  const center = 120;
  const radius = 90;
  const angles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
  const order: (keyof typeof scores)[] = ['mentalidad', 'decisiones', 'delegacion', 'vision'];

  const pointAt = (key: keyof typeof scores, i: number, scale = 1) => {
    const v = (scores[key] / max) * scale;
    const x = center + Math.cos(angles[i]) * radius * v;
    const y = center + Math.sin(angles[i]) * radius * v;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };
  const userPoints = order.map((k, i) => pointAt(k, i)).join(' ');
  const grids = [0.25, 0.5, 0.75, 1].map((scale) =>
    order.map((_, i) => {
      const x = center + Math.cos(angles[i]) * radius * scale;
      const y = center + Math.sin(angles[i]) * radius * scale;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' '),
  );
  const labels = [
    { x: center, y: center - radius - 12, text: 'MENTALIDAD' },
    { x: center + radius + 14, y: center, text: 'DECISIONES' },
    { x: center, y: center + radius + 18, text: 'DELEGACIÓN' },
    { x: center - radius - 10, y: center, text: 'VISIÓN' },
  ];

  return (
    <svg viewBox="0 0 240 240" className="h-[220px] w-[220px]">
      <defs>
        <linearGradient id="pieRadarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1aab99" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#3533cd" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {grids.map((g, i) => (
        <polygon key={i} points={g} fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="0.8" opacity={0.5} />
      ))}
      {order.map((_, i) => {
        const x = center + Math.cos(angles[i]) * radius;
        const y = center + Math.sin(angles[i]) * radius;
        return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />;
      })}
      <polygon points={userPoints} fill="url(#pieRadarGrad)" stroke="#1aab99" strokeWidth="2" />
      {order.map((k, i) => {
        const v = scores[k] / max;
        const x = center + Math.cos(angles[i]) * radius * v;
        const y = center + Math.sin(angles[i]) * radius * v;
        return <circle key={k} cx={x.toFixed(1)} cy={y.toFixed(1)} r="4" fill="#1aab99" />;
      })}
      {labels.map((l) => (
        <text key={l.text} x={l.x} y={l.y} textAnchor="middle" fontSize="9" fontFamily="inherit" fill="rgba(255,255,255,0.5)" fontWeight={700}>
          {l.text}
        </text>
      ))}
    </svg>
  );
}
