'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Target, ClipboardList, Check, RotateCcw, ArrowDown, ListChecks, Layers,
  ClipboardCheck, Zap, Plus, Trash2, User, Calendar, History, ChevronDown, CircleDashed,
  CheckCircle2, AlertTriangle, GitCommit, MoreHorizontal, Loader2, Play,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type {
  RitmoHistorialSemana, RitmoSemana, RitmoTarea, SaveStatus, VectorActivo,
} from './types';

/* ── Helpers de fecha (fieles al portal) ────────────────────────────────── */
const MESES_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_SEMANA = [
  { v: 1, label: 'Lunes (recomendado)' }, { v: 2, label: 'Martes' }, { v: 3, label: 'Miércoles' },
  { v: 4, label: 'Jueves' }, { v: 5, label: 'Viernes' }, { v: 6, label: 'Sábado' }, { v: 7, label: 'Domingo' },
];

function fechaCorta(d?: string | null) {
  if (!d) return '';
  const date = new Date(d + 'T12:00:00');
  return `${date.getDate()} ${MESES_ES[date.getMonth()]}`;
}
function fechaLarga(d?: string | null) {
  if (!d) return '';
  const date = new Date(d + 'T12:00:00');
  return `${date.getDate()} ${MESES_ES[date.getMonth()]} ${date.getFullYear()}`;
}
function fechaConDiaSemana(d?: string | null) {
  if (!d) return '';
  const date = new Date(d + 'T12:00:00');
  return `${DIAS_LARGOS[date.getDay()]} ${date.getDate()} de ${MESES_ES[date.getMonth()]}`;
}
function tiempoRelativo(iso?: string | null) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60000) return 'hace un momento';
  if (ms < 3600000) return `hace ${Math.floor(ms / 60000)} min`;
  if (ms < 86400000) return `hace ${Math.floor(ms / 3600000)} h`;
  return `hace ${Math.floor(ms / 86400000)} días`;
}
function estimarRondas(desde: string, hasta: string) {
  if (!desde || !hasta) return 156;
  const d1 = new Date(desde + 'T12:00:00');
  const d2 = new Date(hasta + 'T12:00:00');
  return Math.max(1, Math.floor((d2.getTime() - d1.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1);
}

const inputCls =
  'w-full rounded-lg border border-white/10 bg-[#141416] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25';

function SaveBadge({ status, savedAt, mini }: { status: SaveStatus; savedAt?: string | null; mini?: boolean }) {
  const map: Record<SaveStatus, { cls: string; text: string }> = {
    empty: { cls: 'bg-white/[0.06] text-white/40', text: 'Sin guardar' },
    saving: { cls: 'bg-amber-500/15 text-amber-400', text: 'Escribiendo…' },
    saved: { cls: 'bg-emerald-500/15 text-emerald-400', text: mini ? 'Guardado' : `Guardado · ${tiempoRelativo(savedAt)}` },
    error: { cls: 'bg-red-500/15 text-red-400', text: 'Error al guardar' },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {s.text}
    </span>
  );
}

/* ── Preguntas del ritual ───────────────────────────────────────────────── */
type CampoRitual = { key: keyof RitmoSemana; label: string; placeholder: string };
const CAMPOS_RITUAL: CampoRitual[] = [
  { key: 'ritual_retos', label: '¿Cuáles son los retos de esta semana?', placeholder: 'Lo que el equipo enfrenta de aquí al próximo ritual…' },
  { key: 'ritual_actividades', label: '¿Qué actividades clave no podemos dejar pasar?', placeholder: 'Lo innegociable de la semana…' },
  { key: 'ritual_metricas', label: '¿Qué métricas nos dirán si avanzamos?', placeholder: 'Los números que miden esta semana…' },
  { key: 'ritual_ajustes', label: '¿Qué ajustamos respecto a la semana pasada?', placeholder: 'Lo aprendido de la semana anterior…' },
];

type View = 'loading' | 'onboarding' | 'semana' | 'empty';
type FiltroTareas = 'todas' | 'plan' | 'impulso';

export function SemanalView({ orgId }: { orgId: string | null }) {
  const [view, setView] = useState<View>('loading');
  const [vector, setVector] = useState<VectorActivo | null>(null);
  const [semana, setSemana] = useState<RitmoSemana | null>(null);
  const [tareas, setTareas] = useState<RitmoTarea[]>([]);
  const [historial, setHistorial] = useState<RitmoHistorialSemana[]>([]);
  const [conteoHistorial, setConteoHistorial] = useState<Record<string, { total: number; hechas: number }>>({});
  const [filtroTareas, setFiltroTareas] = useState<FiltroTareas>('todas');
  const [historialOpen, setHistorialOpen] = useState(false);
  const [addTareaInput, setAddTareaInput] = useState('');
  const [cerrando, setCerrando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [regenerando, setRegenerando] = useState(false);

  // Onboarding form
  const [onbDesde, setOnbDesde] = useState('');
  const [onbHasta, setOnbHasta] = useState('');
  const [onbDiaInicio, setOnbDiaInicio] = useState(1);

  // Indicadores de guardado por campo
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const cargarYRenderSemana = useCallback(async (org: string) => {
    const supabase = createClient();
    const { data: semanaCursoData } = await supabase
      .rpc('ritmo_semana_en_curso', { p_organizacion_id: org });
    const row = Array.isArray(semanaCursoData) ? semanaCursoData[0] : semanaCursoData;
    if (!row || !row.id) {
      setSemana(null);
      setView('empty');
      return;
    }

    const { data: semanaFull } = await supabase
      .from('ritmo_semanas')
      .select('*, vector_trimestres(numero, anio, trimestre_anio)')
      .eq('id', row.id).single();
    const semanaFinal = (semanaFull ?? row) as RitmoSemana;
    setSemana(semanaFinal);

    const { data: tareasData } = await supabase
      .from('ritmo_tareas').select('*')
      .eq('semana_id', semanaFinal.id)
      .order('orden', { ascending: true })
      .order('created_at', { ascending: true });
    setTareas((tareasData ?? []) as RitmoTarea[]);

    // Historial (no bloqueante)
    supabase
      .from('ritmo_semanas')
      .select('id, numero_ronda, fecha_inicio, fecha_fin, objetivo, estado, cruza_de_mes')
      .eq('organizacion_id', org)
      .lt('fecha_inicio', new Date().toISOString().split('T')[0])
      .order('numero_ronda', { ascending: false })
      .limit(50)
      .then(async ({ data: histData }) => {
        const hist = ((histData ?? []) as RitmoHistorialSemana[]).filter((s) => s.id !== semanaFinal.id);
        setHistorial(hist);
        if (hist.length) {
          const { data: conteoData } = await supabase
            .from('ritmo_tareas').select('semana_id, completada')
            .in('semana_id', hist.map((s) => s.id));
          const c: Record<string, { total: number; hechas: number }> = {};
          for (const t of (conteoData ?? []) as { semana_id: string; completada: boolean }[]) {
            if (!c[t.semana_id]) c[t.semana_id] = { total: 0, hechas: 0 };
            c[t.semana_id].total++;
            if (t.completada) c[t.semana_id].hechas++;
          }
          setConteoHistorial(c);
        }
      });

    // Indicadores iniciales
    const initStatus: Record<string, SaveStatus> = {};
    const camposConValor: [string, string | null][] = [
      ['objetivo', semanaFinal.objetivo],
      ['ritual_retos', semanaFinal.ritual_retos],
      ['ritual_actividades', semanaFinal.ritual_actividades],
      ['ritual_metricas', semanaFinal.ritual_metricas],
      ['ritual_ajustes', semanaFinal.ritual_ajustes],
    ];
    for (const [key, val] of camposConValor) {
      initStatus[key] = val && semanaFinal.updated_at ? 'saved' : 'empty';
    }
    setSaveStatus(initStatus);

    setView('semana');
  }, []);

  useEffect(() => {
    (async () => {
      if (!orgId) { setView('empty'); return; }
      const supabase = createClient();
      const [{ data: vectorData }, { data: tieneSemanas }] = await Promise.all([
        supabase.from('vector_estrategicos')
          .select('id, meta, nombre, fecha_inicio, fecha_fin')
          .eq('organizacion_id', orgId).eq('estado', 'activo').maybeSingle(),
        supabase.rpc('ritmo_org_tiene_semanas', { p_organizacion_id: orgId }),
      ]);
      setVector((vectorData as VectorActivo) ?? null);

      if (!tieneSemanas) {
        // Prefill onboarding
        if (vectorData) {
          setOnbDesde(vectorData.fecha_inicio);
          setOnbHasta(vectorData.fecha_fin);
        } else {
          const hoy = new Date();
          const en3 = new Date(hoy.getFullYear() + 3, hoy.getMonth(), hoy.getDate());
          setOnbDesde(hoy.toISOString().split('T')[0]);
          setOnbHasta(en3.toISOString().split('T')[0]);
        }
        setView('onboarding');
      } else {
        await cargarYRenderSemana(orgId);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function onGenerarPrimerVez() {
    if (!orgId || !onbDesde || !onbHasta || onbHasta <= onbDesde) return;
    setGenerando(true);
    const supabase = createClient();
    await supabase.from('ritmo_config').upsert({ organizacion_id: orgId, dia_inicio_semana: onbDiaInicio });
    const { data: creadas, error } = await supabase.rpc('ritmo_generar_semanas', {
      p_organizacion_id: orgId, p_fecha_desde: onbDesde, p_fecha_hasta: onbHasta,
      p_vector_id: vector ? vector.id : null,
    });
    setGenerando(false);
    if (error || !creadas) {
      alert('No se pudieron generar las semanas. Si ya tienes semanas previas, usa Admin → Regenerar.');
      return;
    }
    setView('loading');
    await cargarYRenderSemana(orgId);
  }

  /* ── Autosave por campo ── */
  const scheduleFieldSave = useCallback((key: string, column: string, value: string) => {
    if (!semana) return;
    setSaveStatus((s) => ({ ...s, [key]: 'saving' }));
    clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(async () => {
      const supabase = createClient();
      const payload: Record<string, string | null> = { [column]: value.trim() || null };
      const { data, error } = await supabase.from('ritmo_semanas').update(payload).eq('id', semana.id).select('*').single();
      if (!error && data) {
        setSemana((s) => (s ? { ...s, ...data } : s));
        setSaveStatus((s) => ({ ...s, [key]: 'saved' }));
      } else {
        setSaveStatus((s) => ({ ...s, [key]: 'error' }));
      }
    }, 900);
  }, [semana]);

  async function onCerrarRitual() {
    if (!semana) return;
    if (!semana.objetivo || !semana.objetivo.trim()) {
      alert('Antes de cerrar el ritual, escribe el objetivo de esta semana.');
      return;
    }
    setCerrando(true);
    const supabase = createClient();
    const { data, error } = await supabase.from('ritmo_semanas')
      .update({ estado: 'completado' }).eq('id', semana.id).select('*').single();
    setCerrando(false);
    if (error || !data) { alert('No se pudo cerrar el ritual. Reintenta.'); return; }
    setSemana((s) => (s ? { ...s, ...data } : s));
  }

  async function onReabrirRitual() {
    if (!semana) return;
    if (!confirm('¿Reabrir el ritual de esta semana? Podrás editar las respuestas de nuevo.')) return;
    const supabase = createClient();
    const { data, error } = await supabase.from('ritmo_semanas')
      .update({ estado: 'pendiente' }).eq('id', semana.id).select('*').single();
    if (!error && data) setSemana((s) => (s ? { ...s, ...data } : s));
  }

  /* ── Tareas ── */
  async function onAgregarTarea() {
    const titulo = addTareaInput.trim();
    if (!titulo || !semana || !orgId) return;
    const supabase = createClient();
    const { data, error } = await supabase.from('ritmo_tareas').insert({
      organizacion_id: orgId, semana_id: semana.id, titulo, origen: 'plan', orden: tareas.length,
    }).select('*').single();
    if (error || !data) return;
    setTareas((t) => [...t, data as RitmoTarea]);
    setAddTareaInput('');
  }
  async function onToggleTarea(id: string) {
    const t = tareas.find((x) => x.id === id);
    if (!t) return;
    const nuevo = !t.completada;
    setTareas((prev) => prev.map((x) => (x.id === id ? { ...x, completada: nuevo } : x)));
    const supabase = createClient();
    const { error } = await supabase.from('ritmo_tareas').update({ completada: nuevo }).eq('id', id);
    if (error) setTareas((prev) => prev.map((x) => (x.id === id ? { ...x, completada: !nuevo } : x)));
  }
  async function onEliminarTarea(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from('ritmo_tareas').delete().eq('id', id);
    if (!error) setTareas((prev) => prev.filter((t) => t.id !== id));
  }

  /* ── Admin: regenerar semanas ── */
  async function onAdminRegenerar() {
    if (!orgId) return;
    const ok = confirm(
      'ATENCIÓN: Regenerar las semanas borrará TODAS tus semanas actuales y sus tareas.\n\n' +
      'Esto solo se usa si configuraste mal el horizonte o el día de inicio.\n\n¿Continuar?',
    );
    if (!ok) return;
    const desdeActual = semana?.fecha_inicio || vector?.fecha_inicio || new Date().toISOString().split('T')[0];
    const desde = prompt('Fecha de inicio (YYYY-MM-DD):', desdeActual);
    if (!desde) return;
    const hastaDefault = vector?.fecha_fin || new Date(new Date().getFullYear() + 3, 0, 1).toISOString().split('T')[0];
    const hasta = prompt('Fecha de fin (YYYY-MM-DD):', hastaDefault);
    if (!hasta) return;

    setRegenerando(true);
    const supabase = createClient();
    const { data: creadas, error } = await supabase.rpc('ritmo_regenerar_semanas', {
      p_organizacion_id: orgId, p_fecha_desde: desde, p_fecha_hasta: hasta,
      p_vector_id: vector ? vector.id : null,
    });
    setRegenerando(false);
    if (error) { alert('No se pudieron regenerar las semanas. Revisa la consola.'); return; }
    alert(`Listo: ${creadas} semanas regeneradas.`);
    setSemana(null);
    setTareas([]);
    setView('loading');
    await cargarYRenderSemana(orgId);
  }

  if (view === 'loading') {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-white/40" /></div>;
  }

  /* ══════════════════ ONBOARDING ══════════════════ */
  if (view === 'onboarding') {
    const rondas = estimarRondas(onbDesde, onbHasta);
    return (
      <div className="flex items-center justify-center py-10">
        <div className="relative max-w-xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-white shadow-lg shadow-[#1aab99]/20">
            <Play className="h-7 w-7" />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#1aab99]">Bienvenido al Ritmo</p>
          <h2 className="mb-3 text-2xl font-extrabold text-white">Vamos a generar tus rondas</h2>
          <p className="mb-6 text-sm leading-relaxed text-white/60">
            El Ritmo arranca generando todas las semanas reales del calendario sobre las que vas a planear,
            ejecutar y evaluar. Cada semana es una <strong className="text-white">ronda</strong> de 7 días.
            En 3 años son ~150 rondas — el músculo que vas a construir.
          </p>

          {vector ? (
            <div className="mb-4 rounded-xl border border-[#3533cd]/40 bg-gradient-to-br from-[#3533cd]/10 to-transparent p-4 text-left">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8b8bf0]">Vector activo · horizonte</div>
              <div className="mt-1 font-bold text-white">{vector.meta}</div>
              <div className="text-xs text-white/50">{fechaLarga(vector.fecha_inicio)} → {fechaLarga(vector.fecha_fin)}</div>
              <div className="mt-2 text-xs italic text-white/40">Las fechas se heredan del Vector — son tu compromiso fundacional y no se editan aquí.</div>
            </div>
          ) : (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-left text-xs text-white/60">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
              <span>Aún no tienes un Vector activo. No hay problema: el Ritmo funciona igual. Definiremos un horizonte de 3 años desde hoy.</span>
            </div>
          )}

          <div className="mb-4 rounded-xl border border-white/10 bg-[#141416] p-5 text-left">
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/40">Desde</label>
                <input type="date" value={onbDesde} readOnly={!!vector} onChange={(e) => setOnbDesde(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/40">Hasta</label>
                <input type="date" value={onbHasta} readOnly={!!vector} onChange={(e) => setOnbHasta(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/40">¿Qué día arranca tu semana?</label>
              <select value={onbDiaInicio} onChange={(e) => setOnbDiaInicio(parseInt(e.target.value, 10))} className={inputCls}>
                {DIAS_SEMANA.map((d) => <option key={d.v} value={d.v}>{d.label}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-left text-xs text-white/60">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
            <span><strong className="text-amber-400">Solo se hace una vez.</strong> Las semanas se generan al inicio del Vector. Si necesitas regenerarlas, hay un botón Admin en la parte superior con la advertencia correspondiente.</span>
          </div>

          <button onClick={onGenerarPrimerVez} disabled={generando || !onbDesde || !onbHasta || onbHasta <= onbDesde}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-6 py-4 text-base font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
            {generando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
            {generando ? 'Generando rondas…' : `Generar mis ${rondas} rondas`}
          </button>
        </div>
      </div>
    );
  }

  /* ══════════════════ EMPTY (entre vectores) ══════════════════ */
  if (view === 'empty' || !semana) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-16 text-center">
        <h2 className="text-xl font-bold text-white">No hay una semana en curso para hoy</h2>
        <p className="mt-2 text-white/50">Puede que tu horizonte ya haya terminado o aún no haya comenzado.</p>
        <button onClick={onAdminRegenerar} disabled={regenerando}
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white">
          <MoreHorizontal className="h-4 w-4" /> Admin — regenerar semanas
        </button>
      </div>
    );
  }

  /* ══════════════════ VISTA SEMANA ══════════════════ */
  const firmado = semana.estado === 'completado' || semana.estado === 'cerrada';
  const tareasFiltradas = tareas.filter((t) => (filtroTareas === 'todas' ? true : t.origen === filtroTareas));
  const hechas = tareas.filter((t) => t.completada).length;
  const completadasHistorial = historial.filter((s) => s.estado === 'completado' || s.estado === 'cerrada').length;

  return (
    <div>
      {/* Admin */}
      <div className="mb-4 flex justify-end">
        <button onClick={onAdminRegenerar} disabled={regenerando}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/60 hover:bg-white/[0.08] hover:text-white">
          <MoreHorizontal className="h-3.5 w-3.5" /> Admin
        </button>
      </div>

      {/* Chips */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {semana.vector_trimestres && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#3533cd]/15 px-3 py-1 text-[11.5px] font-bold text-[#8b8bf0]">
            Round {semana.vector_trimestres.numero} · Q{semana.vector_trimestres.trimestre_anio} Año {semana.vector_trimestres.anio}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1aab99]/15 px-3 py-1 text-[11.5px] font-bold text-[#1aab99]">
          <GitCommit className="h-3 w-3" /> Ronda {semana.numero_ronda}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-[11.5px] font-bold text-white/50">
          <Calendar className="h-3 w-3" /> {fechaCorta(semana.fecha_inicio)} – {fechaCorta(semana.fecha_fin)}
        </span>
        {semana.cruza_de_mes && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[11.5px] font-bold text-amber-400">
            <AlertTriangle className="h-3 w-3" /> Cruza de mes
          </span>
        )}
      </div>

      {/* Banner protagonista */}
      {firmado ? (
        <div className="mb-5 flex items-center gap-4 rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.07] to-transparent p-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <Check className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-emerald-400">
              Ritual completado el {fechaConDiaSemana((semana.ritual_completado_en || '').split('T')[0])}
            </div>
            <div className="text-xs text-white/40">
              La semana corre del {fechaCorta(semana.fecha_inicio)} al {fechaCorta(semana.fecha_fin)}.
            </div>
          </div>
          <button onClick={onReabrirRitual}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/60 hover:bg-white/[0.06] hover:text-white">
            <RotateCcw className="h-3.5 w-3.5" /> Reabrir
          </button>
        </div>
      ) : (
        <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-amber-500/[0.02] p-6 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="mb-1 text-lg font-extrabold text-white">Tienes el ritual semanal pendiente</div>
            <div className="max-w-lg text-sm text-white/60">
              Tómate 15 minutos para responder las 4 preguntas y fijar el objetivo de los próximos 7 días.
              Es el acto que abre tu semana.
            </div>
          </div>
          <a href="#objetivo-card"
            className="flex flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-4 py-3 text-sm font-bold text-white transition hover:opacity-90">
            <ArrowDown className="h-4 w-4" /> Hacer el ritual
          </a>
        </div>
      )}

      {/* Objetivo */}
      <div id="objetivo-card" className="mb-5 rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#1aab99]">
            <Target className="h-3.5 w-3.5" /> El objetivo de esta semana
          </div>
          <SaveBadge status={saveStatus.objetivo ?? 'empty'} savedAt={semana.updated_at} />
        </div>
        <textarea
          rows={2}
          disabled={firmado}
          defaultValue={semana.objetivo ?? ''}
          onChange={(e) => scheduleFieldSave('objetivo', 'objetivo', e.target.value)}
          placeholder="Una sola cosa clara. ¿Qué resultado específico debe lograrse en estos 7 días?"
          className="w-full resize-none rounded-lg border border-white/10 bg-[#141416] px-4 py-3 text-xl font-extrabold leading-snug text-white outline-none transition placeholder:text-white/25 focus:border-[#1aab99] disabled:opacity-70"
        />
        <p className="mt-2 text-xs italic text-white/40">Una sola cosa clara. Si la semana termina y esto se logró, la semana valió.</p>
      </div>

      {/* 4 preguntas */}
      <div className="mb-4 flex items-center gap-2 text-[17px] font-extrabold text-white">
        <ClipboardList className="h-4 w-4 text-[#1aab99]" /> El ritual — 4 preguntas, siempre las mismas
      </div>
      <div className="grid gap-3.5 md:grid-cols-2">
        {CAMPOS_RITUAL.map((c, i) => (
          <div key={c.key} className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-xs font-extrabold text-white">
                  {i + 1}
                </span>
                <span className="text-sm font-bold leading-snug text-white">{c.label}</span>
              </div>
              <SaveBadge status={saveStatus[c.key as string] ?? 'empty'} savedAt={semana.updated_at} mini />
            </div>
            <textarea
              disabled={firmado}
              defaultValue={(semana[c.key] as string) ?? ''}
              onChange={(e) => scheduleFieldSave(c.key as string, c.key as string, e.target.value)}
              placeholder={c.placeholder}
              className="min-h-[90px] w-full resize-y rounded-lg border border-white/10 bg-[#141416] px-3.5 py-3 text-[13.5px] leading-relaxed text-white outline-none transition placeholder:text-white/25 focus:border-[#1aab99] disabled:opacity-70"
            />
          </div>
        ))}
      </div>

      {/* Cierre explícito */}
      {!firmado && (
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
          <div className="min-w-[220px] flex-1">
            <div className="mb-0.5 text-sm font-bold text-white">Cierra el ritual cuando termines de responder</div>
            <div className="text-xs leading-relaxed text-white/40">
              Esto marca el ritual como completado. A partir de aquí, la semana corre — y los impulsos del Pulso se sumarán a las tareas.
            </div>
          </div>
          <button onClick={onCerrarRitual} disabled={cerrando}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50">
            {cerrando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {cerrando ? 'Cerrando…' : 'Cerrar el ritual de esta semana'}
          </button>
        </div>
      )}

      {/* Tareas — solo tras cerrar el ritual */}
      {firmado && (
        <div className="mt-8">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[17px] font-extrabold text-white">
            <ListChecks className="h-4 w-4 text-[#1aab99]" /> Tareas de la semana
            <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs font-bold text-white/50">
              {tareas.length} tarea{tareas.length === 1 ? '' : 's'} · {hechas} hechas
            </span>
          </div>
          <div className="mb-3.5 inline-flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
            {([
              { id: 'todas', label: 'Todas', icon: Layers },
              { id: 'plan', label: 'Del plan', icon: ClipboardCheck },
              { id: 'impulso', label: 'Impulsos del día', icon: Zap },
            ] as const).map((f) => {
              const Icon = f.icon;
              const active = filtroTareas === f.id;
              return (
                <button key={f.id} onClick={() => setFiltroTareas(f.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11.5px] font-bold transition ${
                    active ? 'bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-white' : 'text-white/40 hover:text-white/70'
                  }`}>
                  <Icon className="h-3 w-3" /> {f.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2.5">
            {tareasFiltradas.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/15 bg-[#1c1c1e] p-5 text-center text-sm text-white/40">
                {filtroTareas === 'impulso' ? 'Aún no hay impulsos del día. Surgirán del Pulso (la reunión diaria).'
                  : filtroTareas === 'plan' ? 'Aún no hay tareas del plan. Agrega la primera abajo.'
                    : 'Aún no hay tareas esta semana. Agrega la primera abajo.'}
              </div>
            )}
            {tareasFiltradas.map((t) => {
              const esImpulso = t.origen === 'impulso';
              return (
                <div key={t.id} className={`flex items-start gap-3.5 rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4 ${esImpulso ? 'border-l-2 border-l-amber-400' : 'border-l-2 border-l-[#1aab99]'}`}>
                  <button onClick={() => onToggleTarea(t.id)}
                    className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition ${
                      t.completada ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-white/20 bg-[#141416]'
                    }`}>
                    {t.completada && <Check className="h-3 w-3" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide ${esImpulso ? 'bg-amber-500/15 text-amber-400' : 'bg-[#1aab99]/15 text-[#1aab99]'}`}>
                        {esImpulso ? 'Impulso del día' : 'Del plan'}
                      </span>
                      <span className={`text-sm font-bold ${t.completada ? 'text-white/40 line-through' : 'text-white'}`}>{t.titulo}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-3.5 text-xs text-white/40">
                      {t.responsable && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {t.responsable}</span>}
                      {t.fecha_objetivo && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {fechaCorta(t.fecha_objetivo)}</span>}
                    </div>
                  </div>
                  <button onClick={() => onEliminarTarea(t.id)}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/30 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex gap-2.5">
            <input
              value={addTareaInput}
              onChange={(e) => setAddTareaInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onAgregarTarea(); }}
              placeholder="Agregar una tarea del plan a esta semana…"
              className="flex-1 rounded-lg border border-white/10 bg-[#141416] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#1aab99]"
            />
            <button onClick={onAgregarTarea}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90">
              <Plus className="h-4 w-4" /> Agregar
            </button>
          </div>
        </div>
      )}

      {/* Historial colapsable */}
      <div className="mt-9 border-t border-white/[0.08] pt-6">
        <button onClick={() => setHistorialOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-4 px-5 text-left transition hover:bg-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] text-white/40">
              <History className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Rondas anteriores</div>
              <div className="text-xs text-white/40">
                {historial.length === 0
                  ? 'Aún no hay rondas anteriores. Tu primera ronda es la semana en curso.'
                  : `${completadasHistorial} rondas completadas — el músculo que llevas construido`}
              </div>
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${historialOpen ? 'rotate-180' : ''}`} />
        </button>
        {historialOpen && (
          <div className="mt-2.5 flex flex-col gap-2">
            {historial.map((s) => {
              const c = conteoHistorial[s.id];
              return (
                <div key={s.id} className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-3.5 px-4">
                  <div className="min-w-[86px] flex-shrink-0 text-sm font-extrabold text-[#1aab99]">Ronda {s.numero_ronda}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-white/70">
                      {s.objetivo || <span className="text-white/30">Sin objetivo definido</span>}
                    </div>
                    <div className="mt-0.5 text-[11px] text-white/30">
                      {fechaCorta(s.fecha_inicio)} – {fechaCorta(s.fecha_fin)}{s.cruza_de_mes ? ' · cruza de mes' : ''}
                    </div>
                  </div>
                  {s.estado === 'pendiente' ? (
                    <span className="flex flex-shrink-0 items-center gap-1.5 text-xs font-semibold text-amber-400">
                      <CircleDashed className="h-3 w-3" /> Sin ritual
                    </span>
                  ) : (
                    <span className="flex flex-shrink-0 items-center gap-1.5 text-xs font-semibold text-white/40">
                      <CheckCircle2 className="h-3 w-3" /> {c && c.total > 0 ? `${c.hechas}/${c.total} tareas` : 'Ritual hecho'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
