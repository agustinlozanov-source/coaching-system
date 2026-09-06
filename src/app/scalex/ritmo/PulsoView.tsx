'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity, Play, Clock, CalendarDays, Users, Globe, AlertTriangle, User, X, Plus,
  Megaphone, Edit3, Timer, Zap, CheckCircle2, RotateCcw, Moon, Settings, Loader2,
  Target, GitCommit, Calendar, PlayCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type {
  RitmoCirculoPersona, RitmoPulso, RitmoPulsosConfig, RitmoSemana, RitmoTarea, SaveStatus, StripDia, StrikesRecientes,
} from './types';

/* ── Helpers (fieles al portal) ─────────────────────────────────────────── */
const MESES_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS_LABELS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_CHIPS = [
  { v: 1, l: 'L' }, { v: 2, l: 'M' }, { v: 3, l: 'M' }, { v: 4, l: 'J' }, { v: 5, l: 'V' }, { v: 6, l: 'S' }, { v: 7, l: 'D' },
];
const TIMEZONES = [
  { v: 'America/Mexico_City', l: 'América/CDMX (UTC-6)' },
  { v: 'America/Monterrey', l: 'América/Monterrey (UTC-6)' },
  { v: 'America/Bogota', l: 'América/Bogotá (UTC-5)' },
  { v: 'America/Lima', l: 'América/Lima (UTC-5)' },
  { v: 'America/Santiago', l: 'América/Santiago (UTC-3)' },
  { v: 'America/Argentina/Buenos_Aires', l: 'América/Buenos Aires (UTC-3)' },
];

function fechaCorta(d?: string | null) {
  if (!d) return '';
  const date = new Date(d + 'T12:00:00');
  return `${date.getDate()} ${MESES_ES[date.getMonth()]}`;
}
function formatHHMM(t?: string | null) {
  if (!t) return '00:00';
  return t.substring(0, 5);
}
function calcularSegundosHastaPactada(horaPactada: string, ahora: Date) {
  const [h, m] = horaPactada.split(':').map(Number);
  const objetivo = new Date(ahora);
  objetivo.setHours(h, m, 0, 0);
  return Math.floor((objetivo.getTime() - ahora.getTime()) / 1000);
}
function formatDuracion(segundos: number) {
  if (segundos < 0) segundos = 0;
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function formatDeltaMin(deltaMin?: number | null) {
  if (deltaMin == null) return '';
  if (deltaMin === 0) return 'puntual';
  if (deltaMin > 0) return `+${deltaMin} min`;
  return `${deltaMin} min`;
}
function deltaClass(deltaMin?: number | null) {
  if (deltaMin == null) return 'bg-[var(--sx-card-hover)] text-[var(--sx-text-dim)]';
  if (deltaMin < -1) return 'bg-[#3533cd]/15 text-[#8b8bf0]';
  if (deltaMin <= 1) return 'bg-emerald-500/15 text-emerald-400';
  return 'bg-amber-500/15 text-amber-400';
}

const inputCls =
  'w-full rounded-lg border border-[var(--sx-border)] bg-[var(--sx-input)] px-3 py-2 text-sm text-[var(--sx-text)] outline-none transition placeholder:text-[var(--sx-text-faint)] focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25';

function SaveBadge({ status }: { status: SaveStatus }) {
  const map: Record<SaveStatus, { cls: string; text: string }> = {
    empty: { cls: 'bg-[var(--sx-card-hover)] text-[var(--sx-text-dim)]', text: 'Sin guardar' },
    saving: { cls: 'bg-amber-500/15 text-amber-400', text: 'Escribiendo…' },
    saved: { cls: 'bg-emerald-500/15 text-emerald-400', text: 'Guardado' },
    error: { cls: 'bg-red-500/15 text-red-400', text: 'Error' },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {s.text}
    </span>
  );
}

function RolCard({ label, icon: Icon, persona }: { label: string; icon: any; persona: RitmoCirculoPersona | undefined }) {
  return (
    <div className="flex flex-1 min-w-[160px] items-center gap-3 rounded-xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-3.5">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--sx-card-hover)] text-[var(--sx-text-muted)]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--sx-text-dim)]">{label}</div>
        <div className="truncate text-sm font-bold text-[var(--sx-text)]">{persona?.nombre || '— sin asignar —'}</div>
      </div>
    </div>
  );
}

function DayChip({ icon: Icon, text, cls }: { icon: any; text: string; cls?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-bold ${cls ?? 'bg-[var(--sx-card-hover)] text-[var(--sx-text-muted)]'}`}>
      <Icon className="h-3 w-3" /> {text}
    </span>
  );
}

function StripSemana({ strip, strikes }: { strip: StripDia[]; strikes: StrikesRecientes | null }) {
  if (!strip.length) {
    return <div className="py-4 text-center text-xs text-[var(--sx-text-faint)]">Sin datos de la semana</div>;
  }
  const total = (strikes?.strikes_7d as number) ?? 0;
  const summaryCls = total === 0 ? 'border-[var(--sx-border)] bg-[var(--sx-card-hover)] text-[var(--sx-text-muted)]'
    : total <= 2 ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
      : 'border-red-500/30 bg-red-500/10 text-red-400';
  const summaryMsg = total === 0 ? '0 strikes en los últimos 7 días — el latido sostenido'
    : total === 1 ? '1 strike esta semana · 2 más y el sistema marca alerta'
      : total === 2 ? '2 strikes esta semana · 1 más y el sistema marca alerta'
        : `${total} strikes en 7 días · algo de fondo está mal`;
  return (
    <div className="mt-7 border-t border-[var(--sx-border)] pt-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--sx-text-dim)]">
        <Activity className="h-3.5 w-3.5 text-[#1aab99]" /> Esta semana
      </div>
      <div className="grid grid-cols-7 gap-2">
        {strip.map((d, i) => {
          const date = new Date(d.fecha + 'T12:00:00');
          const label = DIAS_LABELS[d.dia_iso] || '—';
          let cls = 'border-[var(--sx-border)] bg-[var(--sx-card)]';
          let statusCls = 'text-[var(--sx-text-dim)]';
          let txt = '—';
          switch (d.estado_dia) {
            case 'hecho': cls = 'border-emerald-500/50 bg-[var(--sx-card)]'; statusCls = 'text-emerald-400'; txt = 'Hecho'; break;
            case 'strike': cls = 'border-red-500/50 bg-red-500/10'; statusCls = 'text-red-400'; txt = 'Strike'; break;
            case 'en_curso': cls = 'border-amber-500/50 bg-amber-500/10'; statusCls = 'text-amber-400'; txt = 'En curso'; break;
            case 'hoy': cls = 'border-[#1aab99]/60 bg-[#1aab99]/10'; statusCls = 'text-[#1aab99]'; txt = 'Hoy'; break;
            case 'no_laborable': cls = 'border-[var(--sx-border)] bg-[var(--sx-card)] opacity-40'; statusCls = 'text-[var(--sx-text-faint)]'; txt = 'Libre'; break;
            default: txt = '—';
          }
          return (
            <div key={i} className={`rounded-lg border p-2.5 text-center ${cls}`}>
              <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--sx-text-dim)]">{label}</div>
              <div className="my-1 text-lg font-extrabold text-[var(--sx-text)]">{date.getDate()}</div>
              <div className={`text-[9.5px] font-bold uppercase tracking-wide ${statusCls}`}>{txt}</div>
            </div>
          );
        })}
      </div>
      {strikes && (
        <div className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs ${summaryCls}`}>
          <AlertTriangle className="h-3.5 w-3.5" /> <span dangerouslySetInnerHTML={{ __html: summaryMsg.replace(/^(\d+ strikes?)/, '<strong>$1</strong>') }} />
        </div>
      )}
    </div>
  );
}

type View = 'loading' | 'onboarding' | 'antes' | 'en_curso' | 'cerrado' | 'no_pulso';

export function PulsoView({ orgId }: { orgId: string | null }) {
  const [view, setView] = useState<View>('loading');
  const [config, setConfig] = useState<RitmoPulsosConfig | null>(null);
  const [circulo, setCirculo] = useState<RitmoCirculoPersona[]>([]);
  const [pulsoHoy, setPulsoHoy] = useState<RitmoPulso | null>(null);
  const [semanaActual, setSemanaActual] = useState<RitmoSemana | null>(null);
  const [strip, setStrip] = useState<StripDia[]>([]);
  const [strikes, setStrikes] = useState<StrikesRecientes | null>(null);
  const [impulsos, setImpulsos] = useState<RitmoTarea[]>([]);
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [tick, setTick] = useState(0); // fuerza refresco del cronómetro/cuenta regresiva
  const [adminOpen, setAdminOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Onboarding form
  const [onbHora, setOnbHora] = useState('07:55');
  const [onbDias, setOnbDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const [onbCirculo, setOnbCirculo] = useState<{ nombre: string; rol_descripcion: string }[]>([
    { nombre: '', rol_descripcion: '' }, { nombre: '', rol_descripcion: '' }, { nombre: '', rol_descripcion: '' },
  ]);
  const [onbTz, setOnbTz] = useState('America/Mexico_City');
  const [onbVentana, setOnbVentana] = useState(10);

  const [impulsoInput, setImpulsoInput] = useState('');
  const [impulsoResponsable, setImpulsoResponsable] = useState('');

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (TIMEZONES.some((t) => t.v === tz)) setOnbTz(tz);
    } catch { /* noop */ }
  }, []);

  const cargarYDecidirVista = useCallback(async (org: string) => {
    const supabase = createClient();
    await supabase.rpc('ritmo_marcar_omitidos', { p_organizacion_id: org });

    const [{ data: pulsoData }, { data: stripData }, { data: strikesData }, { data: semanaData }] = await Promise.all([
      supabase.rpc('ritmo_pulso_de_hoy', { p_organizacion_id: org }),
      supabase.rpc('ritmo_strip_semana', { p_organizacion_id: org }),
      supabase.rpc('ritmo_strikes_recientes', { p_organizacion_id: org, p_dias: 30 }),
      supabase.rpc('ritmo_semana_en_curso', { p_organizacion_id: org }),
    ]);

    const pulsoRow = Array.isArray(pulsoData) ? pulsoData[0] : pulsoData;
    const pulso = pulsoRow && pulsoRow.id ? (pulsoRow as RitmoPulso) : null;
    setPulsoHoy(pulso);
    setStrip((stripData ?? []) as StripDia[]);
    const strikesRow = Array.isArray(strikesData) ? strikesData[0] : strikesData;
    setStrikes((strikesRow as StrikesRecientes) ?? null);
    const semanaRow = Array.isArray(semanaData) ? semanaData[0] : semanaData;
    setSemanaActual(semanaRow && semanaRow.id ? (semanaRow as RitmoSemana) : null);

    if (!pulso) { setView('no_pulso'); return; }

    if (pulso.estado === 'programado') {
      setView('antes');
    } else if (pulso.estado === 'en_curso') {
      const { data: imp } = await supabase.from('ritmo_tareas').select('*')
        .eq('semana_id', semanaRow?.id).eq('origen_pulso_id', pulso.id).order('created_at', { ascending: true });
      setImpulsos((imp ?? []) as RitmoTarea[]);
      const initStatus: Record<string, SaveStatus> = {
        avanzo: pulso.lo_que_avanzo ? 'saved' : 'empty',
        numero: pulso.numero_de_hoy ? 'saved' : 'empty',
        traba: pulso.lo_que_traba ? 'saved' : 'empty',
      };
      setSaveStatus(initStatus);
      setView('en_curso');
    } else if (pulso.estado === 'cerrado') {
      const { data: imp } = await supabase.from('ritmo_tareas').select('*')
        .eq('semana_id', semanaRow?.id).eq('origen_pulso_id', pulso.id).order('created_at', { ascending: true });
      setImpulsos((imp ?? []) as RitmoTarea[]);
      setView('cerrado');
    } else {
      setView('no_pulso');
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (!orgId) { setView('no_pulso'); return; }
      const supabase = createClient();
      const [{ data: configData }, { data: circuloData }] = await Promise.all([
        supabase.from('ritmo_pulsos_config').select('*').eq('organizacion_id', orgId).maybeSingle(),
        supabase.from('ritmo_circulo').select('*').eq('organizacion_id', orgId).eq('activo', true).order('orden', { ascending: true }),
      ]);
      setConfig((configData as RitmoPulsosConfig) ?? null);
      setCirculo((circuloData ?? []) as RitmoCirculoPersona[]);

      if (!configData) { setView('onboarding'); return; }
      await cargarYDecidirVista(orgId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // Tick de 1s para cronómetro / cuenta regresiva
  useEffect(() => {
    if (view !== 'antes' && view !== 'en_curso') return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [view]);

  /* ── Onboarding ── */
  function toggleDia(v: number) {
    setOnbDias((d) => (d.includes(v) ? d.filter((x) => x !== v) : [...d, v].sort()));
  }
  function updateCirculoRow(i: number, field: 'nombre' | 'rol_descripcion', value: string) {
    setOnbCirculo((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }
  function addCirculoRow() {
    setOnbCirculo((rows) => [...rows, { nombre: '', rol_descripcion: '' }]);
  }
  function removeCirculoRow(i: number) {
    setOnbCirculo((rows) => rows.filter((_, idx) => idx !== i));
  }

  async function onActivarPulso() {
    if (!orgId) return;
    if (!/^[0-2][0-9]:[0-5][0-9]$/.test(onbHora)) { alert('Define una hora válida (formato HH:MM, ej: 07:55)'); return; }
    if (!onbDias.length) { alert('Marca al menos un día con Pulso'); return; }
    const personas = onbCirculo.map((p) => ({ nombre: p.nombre.trim(), rol_descripcion: p.rol_descripcion.trim() || null })).filter((p) => p.nombre);
    if (personas.length < 3) { alert('El círculo del Pulso necesita al menos 3 personas. Agrega más antes de activar.'); return; }

    setBusy(true);
    const supabase = createClient();
    const { data: cfg, error: e1 } = await supabase.from('ritmo_pulsos_config').upsert({
      organizacion_id: orgId, hora_pactada: onbHora, dias_con_pulso: onbDias, zona_horaria: onbTz, ventana_play_min: onbVentana,
    }).select('*').single();
    if (e1 || !cfg) { setBusy(false); alert('No se pudo guardar la configuración'); return; }

    await supabase.from('ritmo_circulo').delete().eq('organizacion_id', orgId);
    const rows = personas.map((p, i) => ({ organizacion_id: orgId, nombre: p.nombre, rol_descripcion: p.rol_descripcion, orden: i + 1 }));
    const { data: circuloGuardado, error: e2 } = await supabase.from('ritmo_circulo').insert(rows).select('*');
    setBusy(false);
    if (e2 || !circuloGuardado?.length) { alert('No se pudo guardar el círculo'); return; }

    setConfig(cfg as RitmoPulsosConfig);
    setCirculo(circuloGuardado as RitmoCirculoPersona[]);
    setView('loading');
    await cargarYDecidirVista(orgId);
  }

  /* ── Antes → iniciar ── */
  async function onStartPulso() {
    if (!pulsoHoy) return;
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('ritmo_iniciar_pulso', { p_pulso_id: pulsoHoy.id });
    setBusy(false);
    if (error || !data) { alert('No se pudo iniciar el Pulso'); return; }
    const row = Array.isArray(data) ? data[0] : data;
    setPulsoHoy(row as RitmoPulso);
    setSaveStatus({ avanzo: 'empty', numero: 'empty', traba: 'empty' });
    setView('en_curso');
  }

  /* ── En curso: autosave de bloques ── */
  const CAMPOS_BLOQUE: { key: 'avanzo' | 'numero' | 'traba'; column: keyof RitmoPulso }[] = [
    { key: 'avanzo', column: 'lo_que_avanzo' },
    { key: 'numero', column: 'numero_de_hoy' },
    { key: 'traba', column: 'lo_que_traba' },
  ];
  const scheduleBloqueSave = useCallback((key: 'avanzo' | 'numero' | 'traba', column: string, value: string) => {
    if (!pulsoHoy) return;
    setSaveStatus((s) => ({ ...s, [key]: 'saving' }));
    clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from('ritmo_pulsos')
        .update({ [column]: value.trim() || null }).eq('id', pulsoHoy.id).select('*').single();
      if (!error && data) {
        setPulsoHoy((p) => (p ? { ...p, ...data } : p));
        setSaveStatus((s) => ({ ...s, [key]: 'saved' }));
      } else {
        setSaveStatus((s) => ({ ...s, [key]: 'error' }));
      }
    }, 900);
  }, [pulsoHoy]);

  async function onAgregarImpulso() {
    const titulo = impulsoInput.trim();
    if (!titulo || !pulsoHoy || !semanaActual || !orgId) {
      if (!semanaActual) alert('No hay semana en curso para asociar este impulso. Crea el Ritual Semanal primero.');
      return;
    }
    const supabase = createClient();
    const hoy = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.from('ritmo_tareas').insert({
      organizacion_id: orgId, semana_id: semanaActual.id, titulo,
      responsable: impulsoResponsable.trim() || null, fecha_objetivo: hoy,
      origen: 'impulso', origen_pulso_id: pulsoHoy.id, orden: impulsos.length,
    }).select('*').single();
    if (error || !data) { alert('No se pudo crear el impulso'); return; }
    setImpulsos((prev) => [...prev, data as RitmoTarea]);
    setImpulsoInput(''); setImpulsoResponsable('');
  }
  async function onEliminarImpulso(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from('ritmo_tareas').delete().eq('id', id);
    if (!error) setImpulsos((prev) => prev.filter((i) => i.id !== id));
  }

  async function onCerrarPulso() {
    if (!pulsoHoy) return;
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('ritmo_cerrar_pulso', { p_pulso_id: pulsoHoy.id });
    setBusy(false);
    if (error || !data) { alert('No se pudo cerrar el Pulso'); return; }
    const row = Array.isArray(data) ? data[0] : data;
    setPulsoHoy(row as RitmoPulso);
    setView('cerrado');
  }

  async function onReabrirPulso() {
    if (!pulsoHoy) return;
    if (!confirm('¿Reabrir el Pulso? Volverás a la vista en curso para editar los bloques.')) return;
    const supabase = createClient();
    const { data, error } = await supabase.rpc('ritmo_reabrir_pulso', { p_pulso_id: pulsoHoy.id });
    if (error || !data) { alert(error?.message || 'No se pudo reabrir'); return; }
    const row = Array.isArray(data) ? data[0] : data;
    setPulsoHoy(row as RitmoPulso);
    setSaveStatus({
      avanzo: row.lo_que_avanzo ? 'saved' : 'empty',
      numero: row.numero_de_hoy ? 'saved' : 'empty',
      traba: row.lo_que_traba ? 'saved' : 'empty',
    });
    setView('en_curso');
  }

  /* ── Admin de pruebas (RPCs ritmo_test_*) ── */
  async function onAdminSaltar() {
    if (!orgId) return;
    setAdminOpen(false);
    const supabase = createClient();
    const { error } = await supabase.rpc('ritmo_test_saltar_a_ahora', { p_organizacion_id: orgId });
    if (error) { alert('No se pudo: ' + error.message); return; }
    setView('loading');
    await cargarYDecidirVista(orgId);
  }
  async function onAdminCambiarHora() {
    if (!orgId) return;
    setAdminOpen(false);
    const nueva = prompt('Nueva hora pactada (HH:MM, 24h):', config?.hora_pactada || '07:55');
    if (!nueva) return;
    if (!/^[0-2][0-9]:[0-5][0-9]$/.test(nueva)) { alert('Formato inválido. Usa HH:MM (ej: 07:55)'); return; }
    const supabase = createClient();
    const { error } = await supabase.rpc('ritmo_test_cambiar_hora', { p_organizacion_id: orgId, p_nueva_hora: nueva });
    if (error) { alert('No se pudo: ' + error.message); return; }
    setView('loading');
    await cargarYDecidirVista(orgId);
  }
  async function onAdminResetPulso() {
    if (!orgId) return;
    setAdminOpen(false);
    if (!confirm('¿Borrar el Pulso de hoy y sus impulsos? La config y el círculo se conservan.')) return;
    const supabase = createClient();
    const { error } = await supabase.rpc('ritmo_test_reset_pulso', { p_organizacion_id: orgId });
    if (error) { alert('No se pudo: ' + error.message); return; }
    setView('loading');
    await cargarYDecidirVista(orgId);
  }
  async function onAdminResetTodo() {
    if (!orgId) return;
    setAdminOpen(false);
    if (!confirm('¿Borrar config + círculo + Pulso de hoy? Volverás al onboarding. Los Pulsos históricos NO se borran.')) return;
    const supabase = createClient();
    const { error } = await supabase.rpc('ritmo_test_reset_dia', { p_organizacion_id: orgId });
    if (error) { alert('No se pudo: ' + error.message); return; }
    setConfig(null); setCirculo([]); setPulsoHoy(null);
    setView('onboarding');
  }

  /* ══════════════════════ RENDER ══════════════════════ */

  if (view === 'loading') {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[var(--sx-text-dim)]" /></div>;
  }

  const AdminMenu = config && (
    <div className="relative">
      <button onClick={() => setAdminOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-[var(--sx-border)] bg-[var(--sx-card-hover)] px-3 py-1.5 text-xs font-semibold text-[var(--sx-text-muted)] hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)]">
        <Settings className="h-3.5 w-3.5" /> Config
      </button>
      {adminOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAdminOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-3 shadow-2xl">
            <p className="mb-2 px-2 text-[11px] leading-relaxed text-[var(--sx-text-dim)]">
              Atajos para probar el Pulso sin las restricciones de tiempo real.
            </p>
            <button onClick={onAdminSaltar} className="mb-1.5 w-full rounded-xl border border-[#1aab99]/40 bg-[#1aab99]/10 p-3 text-left text-[#1aab99] transition hover:bg-[#1aab99]/15">
              <div className="flex items-center gap-1.5 text-[13px] font-bold"><Zap className="h-3.5 w-3.5" /> Saltar a la hora actual</div>
              <div className="mt-0.5 text-[11px] text-[var(--sx-text-muted)]">Activa el botón Play de inmediato.</div>
            </button>
            <button onClick={onAdminCambiarHora} className="mb-1.5 w-full rounded-xl border border-[var(--sx-border)] bg-[var(--sx-card-hover)] p-3 text-left text-[var(--sx-text)] transition hover:bg-[var(--sx-card-hover)]">
              <div className="flex items-center gap-1.5 text-[13px] font-bold"><Clock className="h-3.5 w-3.5" /> Cambiar la hora de hoy</div>
              <div className="mt-0.5 text-[11px] text-[var(--sx-text-dim)]">Pide una hora HH:MM y actualiza el Pulso.</div>
            </button>
            <button onClick={onAdminResetPulso} className="mb-1.5 w-full rounded-xl border border-[var(--sx-border)] bg-[var(--sx-card-hover)] p-3 text-left text-[var(--sx-text)] transition hover:bg-[var(--sx-card-hover)]">
              <div className="flex items-center gap-1.5 text-[13px] font-bold"><RotateCcw className="h-3.5 w-3.5" /> Reiniciar el Pulso de hoy</div>
              <div className="mt-0.5 text-[11px] text-[var(--sx-text-dim)]">Conserva config y círculo.</div>
            </button>
            <button onClick={onAdminResetTodo} className="w-full rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-left text-red-400 transition hover:bg-red-500/15">
              <div className="flex items-center gap-1.5 text-[13px] font-bold"><AlertTriangle className="h-3.5 w-3.5" /> Reconfigurar todo</div>
              <div className="mt-0.5 text-[11px] text-[var(--sx-text-muted)]">Vuelves al onboarding completo.</div>
            </button>
          </div>
        </>
      )}
    </div>
  );

  /* ══════════════════ ONBOARDING ══════════════════ */
  if (view === 'onboarding') {
    return (
      <div className="flex justify-center py-6">
        <div className="w-full max-w-2xl rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-9">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-white shadow-lg shadow-[#1aab99]/20">
            <Activity className="h-7 w-7" />
          </div>
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-[#1aab99]">Bienvenido al Pulso</p>
          <h2 className="mb-4 text-center text-2xl font-extrabold text-[var(--sx-text)]">Define el latido de tu empresa</h2>
          <p className="mb-6 text-center text-sm leading-relaxed text-[var(--sx-text-muted)]">
            El Pulso es la reunión diaria que sostiene la semana. Breve, fija, inexorable.
            No es para castigo — es para <strong className="text-[var(--sx-text)]">encontrar el enfoque del día</strong> antes de que el día te lo robe.
          </p>
          <div className="mb-6 rounded-r-lg border-l-2 border-amber-400 bg-gradient-to-r from-amber-500/[0.06] to-transparent p-4 text-sm italic leading-relaxed text-[var(--sx-text-muted)]">
            "Reunirse diariamente ya es un reto. Con estructura, es un reto mayor. Con estructura, resultados y cultura, ya es todo un concepto. ¿Para qué hacerlo más complejo?"
          </div>

          {/* Hora pactada */}
          <div className="mb-4 rounded-xl border border-[var(--sx-border)] bg-[var(--sx-input)] p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--sx-text)]"><Clock className="h-4 w-4 text-[#1aab99]" /> Hora pactada</div>
            <p className="mb-3 text-xs leading-relaxed text-[var(--sx-text-dim)]">
              Una hora rara, específica, fija. <strong className="text-[var(--sx-text-muted)]">7:55, 6:43, 8:17.</strong> La rareza la vuelve memorable; la fijeza la vuelve sagrada.
            </p>
            <input type="time" value={onbHora} onChange={(e) => setOnbHora(e.target.value)}
              className="w-full rounded-lg border border-[var(--sx-border)] bg-[var(--sx-card)] px-4 py-3 text-center font-mono text-2xl font-extrabold text-[var(--sx-text)] outline-none focus:border-[#1aab99]" />
            <p className="mt-2 text-xs italic text-[var(--sx-text-dim)]">El Pulso siempre será a esta hora. Si la cambias después, todo el equipo lo verá.</p>
          </div>

          {/* Días con Pulso */}
          <div className="mb-4 rounded-xl border border-[var(--sx-border)] bg-[var(--sx-input)] p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--sx-text)]"><CalendarDays className="h-4 w-4 text-[#1aab99]" /> Días con Pulso</div>
            <p className="mb-3 text-xs leading-relaxed text-[var(--sx-text-dim)]">Marca los días en que tu equipo se reúne. Los demás días no esperarán Pulso ni contarán como strike.</p>
            <div className="flex flex-wrap gap-1.5">
              {DIAS_CHIPS.map((d) => (
                <button key={d.v} onClick={() => toggleDia(d.v)}
                  className={`rounded-full border px-3.5 py-2 text-xs font-bold transition ${
                    onbDias.includes(d.v) ? 'border-[#1aab99] bg-[#1aab99] text-white' : 'border-[var(--sx-border-strong)] bg-[var(--sx-card)] text-[var(--sx-text-dim)] hover:border-[#1aab99]/50'
                  }`}>{d.l}</button>
              ))}
            </div>
            <p className="mt-2 text-xs italic text-[var(--sx-text-dim)]">Default: lunes a viernes. Tu empresa decide.</p>
          </div>

          {/* Círculo */}
          <div className="mb-4 rounded-xl border border-[var(--sx-border)] bg-[var(--sx-input)] p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--sx-text)]"><Users className="h-4 w-4 text-[#1aab99]" /> El círculo del Pulso</div>
            <p className="mb-3 text-xs leading-relaxed text-[var(--sx-text-dim)]">
              Las personas que asisten al Pulso. Líder + círculo cercano. Los <strong className="text-[var(--sx-text-muted)]">3 roles rotativos</strong> (dirige · apunta · facilita el tiempo) se asignan automáticamente cada día.
            </p>
            <div className="flex flex-col gap-2">
              {onbCirculo.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--sx-card-hover)] text-[var(--sx-text-dim)]"><User className="h-3.5 w-3.5" /></div>
                  <input value={row.nombre} onChange={(e) => updateCirculoRow(i, 'nombre', e.target.value)} placeholder="Nombre" className={inputCls} />
                  <input value={row.rol_descripcion} onChange={(e) => updateCirculoRow(i, 'rol_descripcion', e.target.value)} placeholder="Rol (opcional)" className={inputCls} />
                  <button onClick={() => removeCirculoRow(i)} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--sx-border)] text-[var(--sx-text-faint)] hover:border-red-500/50 hover:text-red-400">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addCirculoRow}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--sx-border-strong)] py-2.5 text-xs text-[var(--sx-text-dim)] hover:border-[#1aab99]/50 hover:text-[#1aab99]">
              <Plus className="h-3.5 w-3.5" /> Agregar otra persona al círculo
            </button>
            <p className="mt-2 text-xs italic text-[var(--sx-text-dim)]">Mínimo 3 personas para que la rotación de los 3 roles tenga sentido.</p>
          </div>

          {/* Zona horaria + ventana */}
          <div className="mb-6 rounded-xl border border-[var(--sx-border)] bg-[var(--sx-input)] p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--sx-text)]"><Globe className="h-4 w-4 text-[#1aab99]" /> Zona horaria y ventana del Play</div>
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="mb-1.5 block text-xs text-[var(--sx-text-dim)]">Zona horaria</label>
                <select value={onbTz} onChange={(e) => setOnbTz(e.target.value)} className={inputCls}>
                  {TIMEZONES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-[var(--sx-text-dim)]">Min antes para activar Play</label>
                <input type="number" min={0} max={60} value={onbVentana} onChange={(e) => setOnbVentana(parseInt(e.target.value, 10) || 0)} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-[var(--sx-text-muted)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
            <span><strong className="text-amber-400">El Pulso no es para castigo.</strong> Si un día no se hizo, el sistema marca strike del sistema — no del líder. Tres strikes seguidos significa que algo está mal de fondo: páralo y revisa.</span>
          </div>

          <button onClick={onActivarPulso} disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-6 py-4 text-base font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
            {busy ? 'Activando…' : 'Activar el Pulso'}
          </button>
        </div>
      </div>
    );
  }

  /* Header de contexto del día (chips) */
  const dayHeader = (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <DayChip icon={Calendar} text={`${DIAS_LARGOS[new Date().getDay()]} ${new Date().getDate()} de ${MESES_ES[new Date().getMonth()]}`} />
        {semanaActual && <DayChip icon={GitCommit} text={`Ronda ${semanaActual.numero_ronda}`} cls="bg-[#1aab99]/15 text-[#1aab99]" />}
        {semanaActual?.objetivo && (
          <DayChip icon={Target} text={`Objetivo: ${semanaActual.objetivo.length > 60 ? semanaActual.objetivo.substring(0, 60) + '…' : semanaActual.objetivo}`} cls="bg-[#3533cd]/15 text-[#8b8bf0]" />
        )}
      </div>
      {AdminMenu}
    </div>
  );

  /* ══════════════════ NO PULSO ══════════════════ */
  if (view === 'no_pulso') {
    let proximoTxt = 'Calculando…';
    if (config) {
      const hoy = new Date();
      for (let i = 1; i <= 14; i++) {
        const fecha = new Date(hoy);
        fecha.setDate(hoy.getDate() + i);
        const proxDow = ((fecha.getDay() + 6) % 7) + 1;
        if (config.dias_con_pulso.includes(proxDow)) {
          proximoTxt = `${DIAS_LARGOS[fecha.getDay()]} ${fecha.getDate()} a las ${formatHHMM(config.hora_pactada)}`;
          break;
        }
      }
    }
    return (
      <div>
        {dayHeader}
        <div className="flex min-h-[45vh] items-center justify-center py-10">
          <div className="max-w-md rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-9 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--sx-card-hover)] text-[var(--sx-text-dim)]"><Moon className="h-6 w-6" /></div>
            <h2 className="mb-2.5 text-xl font-extrabold text-[var(--sx-text)]">Hoy no hay Pulso</h2>
            <p className="mb-5 text-sm leading-relaxed text-[var(--sx-text-muted)]">
              Configuraste que tu empresa no tiene Pulso hoy. <strong className="text-[var(--sx-text-muted)]">No es strike.</strong> Sin Pulso, sin obligación.
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--sx-card-hover)] px-4 py-2 text-xs text-[var(--sx-text-muted)]">
              <Clock className="h-3.5 w-3.5 text-[#1aab99]" /> Siguiente Pulso: <strong className="text-[var(--sx-text)]">{proximoTxt}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════ ANTES ══════════════════ */
  if (view === 'antes' && pulsoHoy && config) {
    void tick; // fuerza recálculo cada segundo
    const ahora = new Date();
    const segundosHasta = calcularSegundosHastaPactada(pulsoHoy.hora_pactada, ahora);
    const ventanaSeg = (config.ventana_play_min || 10) * 60;
    const horaAhora = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    let cuentaTxt: React.ReactNode;
    let btnDisabled = true;
    if (segundosHasta > ventanaSeg) {
      cuentaTxt = <>Faltan <strong className="text-[var(--sx-text)]">{Math.ceil(segundosHasta / 60)} min</strong> · son las {horaAhora}</>;
    } else if (segundosHasta > 0) {
      cuentaTxt = <>Listos · faltan <strong className="text-[var(--sx-text)]">{Math.ceil(segundosHasta / 60)} min</strong> · son las {horaAhora}</>;
      btnDisabled = false;
    } else {
      const minTarde = Math.floor(-segundosHasta / 60);
      cuentaTxt = minTarde === 0
        ? <><strong className="text-[var(--sx-text)]">Es la hora</strong> · son las {horaAhora}</>
        : <>Pasaron <strong className="text-[var(--sx-text)]">{minTarde} min</strong> de la hora pactada · son las {horaAhora}</>;
      btnDisabled = false;
    }
    const dirige = circulo.find((p) => p.id === pulsoHoy.rol_dirige_id);
    const apunta = circulo.find((p) => p.id === pulsoHoy.rol_apuntador_id);
    const tiempo = circulo.find((p) => p.id === pulsoHoy.rol_tiempo_id);

    return (
      <div>
        {dayHeader}
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-10 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#1aab99]">Hora pactada del Pulso</p>
          <div className="mb-1.5 bg-gradient-to-br from-[#1aab99] to-[#3533cd] bg-clip-text text-6xl font-black tracking-tight text-transparent">
            {formatHHMM(pulsoHoy.hora_pactada)}
          </div>
          <p className="mb-6 text-xs text-[var(--sx-text-dim)]">hora rara, fija, inexorable</p>
          <p className="mb-6 text-sm text-[var(--sx-text-muted)]">{cuentaTxt}</p>
          <button onClick={onStartPulso} disabled={btnDisabled || busy}
            className="mx-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-9 py-4 text-base font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />} Empezar el Pulso
          </button>
          <p className="mt-3 text-xs text-[var(--sx-text-faint)]">El botón se activa minutos antes de la hora pactada</p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2.5">
          <RolCard label="Dirige hoy" icon={Megaphone} persona={dirige} />
          <RolCard label="Apunta hoy" icon={Edit3} persona={apunta} />
          <RolCard label="Facilita el tiempo" icon={Timer} persona={tiempo} />
        </div>

        <StripSemana strip={strip} strikes={strikes} />
      </div>
    );
  }

  /* ══════════════════ EN CURSO ══════════════════ */
  if (view === 'en_curso' && pulsoHoy) {
    void tick;
    const dirige = circulo.find((p) => p.id === pulsoHoy.rol_dirige_id);
    const apunta = circulo.find((p) => p.id === pulsoHoy.rol_apuntador_id);
    const tiempo = circulo.find((p) => p.id === pulsoHoy.rol_tiempo_id);
    const cronoSeg = pulsoHoy.hora_real_inicio ? Math.floor((Date.now() - new Date(pulsoHoy.hora_real_inicio).getTime()) / 1000) : 0;
    const horaInicio = pulsoHoy.hora_real_inicio
      ? `${String(new Date(pulsoHoy.hora_real_inicio).getHours()).padStart(2, '0')}:${String(new Date(pulsoHoy.hora_real_inicio).getMinutes()).padStart(2, '0')}`
      : '--:--';

    return (
      <div>
        {dayHeader}
        <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-emerald-500/50 bg-gradient-to-br from-emerald-500/10 to-[#1aab99]/[0.03] p-5">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white">
            <Activity className="h-5 w-5" />
          </div>
          <div className="min-w-[200px] flex-1">
            <div className="mb-1 text-lg font-extrabold text-[var(--sx-text)]">Pulso en curso</div>
            <div className="flex flex-wrap items-center gap-3.5 text-xs text-[var(--sx-text-muted)]">
              <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-emerald-400" /> Pactado <strong className="text-[var(--sx-text)]">{formatHHMM(pulsoHoy.hora_pactada)}</strong></span>
              <span className="inline-flex items-center gap-1.5"><PlayCircle className="h-3.5 w-3.5 text-emerald-400" /> Inició <strong className="text-[var(--sx-text)]">{horaInicio}</strong></span>
              {pulsoHoy.delta_minutos != null && (
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${deltaClass(pulsoHoy.delta_minutos)}`}>{formatDeltaMin(pulsoHoy.delta_minutos)}</span>
              )}
            </div>
          </div>
          <div className="min-w-[100px] flex-shrink-0 rounded-2xl bg-[var(--sx-card-hover)] px-4 py-1 text-center font-mono text-2xl font-extrabold text-[var(--sx-text)]">
            {formatDuracion(cronoSeg)}
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2.5">
          <RolCard label="Dirige hoy" icon={Megaphone} persona={dirige} />
          <RolCard label="Apunta hoy" icon={Edit3} persona={apunta} />
          <RolCard label="Facilita el tiempo" icon={Timer} persona={tiempo} />
        </div>

        <div className="flex flex-col gap-3.5">
          {/* Bloque 1 */}
          <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-sm font-extrabold text-white">1</span>
                <div><div className="text-[15px] font-extrabold text-[var(--sx-text)]">Lo que avanzó</div><div className="text-xs text-[var(--sx-text-dim)]">¿Qué progreso real hubo desde ayer?</div></div>
              </div>
              <SaveBadge status={saveStatus.avanzo ?? 'empty'} />
            </div>
            <textarea defaultValue={pulsoHoy.lo_que_avanzo ?? ''} onChange={(e) => scheduleBloqueSave('avanzo', 'lo_que_avanzo', e.target.value)}
              placeholder="Ej: Diana cerró Madero. Mario terminó el onboarding del cliente nuevo."
              className="min-h-[80px] w-full resize-y rounded-lg border border-[var(--sx-border)] bg-[var(--sx-input)] px-3.5 py-3 text-[13.5px] leading-relaxed text-[var(--sx-text)] outline-none focus:border-[#1aab99]" />
          </div>

          {/* Bloque 2: número */}
          <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-sm font-extrabold text-white">2</span>
                <div><div className="text-[15px] font-extrabold text-[var(--sx-text)]">El número de hoy</div><div className="text-xs text-[var(--sx-text-dim)]">UN solo número que mida si hoy nos acerca al objetivo semanal</div></div>
              </div>
              <SaveBadge status={saveStatus.numero ?? 'empty'} />
            </div>
            <input type="text" defaultValue={pulsoHoy.numero_de_hoy ?? ''} onChange={(e) => scheduleBloqueSave('numero', 'numero_de_hoy', e.target.value)}
              placeholder="ej: 14 leads · $45,000 · 3 cierres"
              className="w-full rounded-lg border border-[var(--sx-border)] bg-[var(--sx-input)] px-4 py-3.5 text-2xl font-black tracking-tight text-[var(--sx-text)] outline-none focus:border-[#1aab99]" />
            {semanaActual?.objetivo && (
              <div className="mt-2.5 flex items-center gap-2 text-xs text-[var(--sx-text-dim)]">
                <Target className="h-3.5 w-3.5 text-[#8b8bf0]" /> <span>Objetivo semanal: <strong className="text-[var(--sx-text-muted)]">{semanaActual.objetivo}</strong></span>
              </div>
            )}
          </div>

          {/* Bloque 3: lo que traba + impulsos */}
          <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-sm font-extrabold text-white">3</span>
                <div><div className="text-[15px] font-extrabold text-[var(--sx-text)]">Lo que traba</div><div className="text-xs text-[var(--sx-text-dim)]">El obstáculo, no la persona. ¿Qué impide avanzar hoy?</div></div>
              </div>
              <SaveBadge status={saveStatus.traba ?? 'empty'} />
            </div>
            <textarea defaultValue={pulsoHoy.lo_que_traba ?? ''} onChange={(e) => scheduleBloqueSave('traba', 'lo_que_traba', e.target.value)}
              placeholder="Ej: El CRM se cayó anoche. Diana sin acceso a leads históricos."
              className="min-h-[80px] w-full resize-y rounded-lg border border-[var(--sx-border)] bg-[var(--sx-input)] px-3.5 py-3 text-[13.5px] leading-relaxed text-[var(--sx-text)] outline-none focus:border-[#1aab99]" />

            <div className="mt-3.5 rounded-xl border border-dashed border-amber-400/50 bg-gradient-to-r from-amber-500/[0.06] to-transparent p-4">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-400"><Zap className="h-3.5 w-3.5" /> Impulsos del día</span>
                <span className="text-[11px] text-[var(--sx-text-dim)]">Tareas catalizadoras — irán a tu semana en ámbar</span>
              </div>
              <div className="mb-2.5 flex flex-col gap-2">
                {impulsos.length === 0 && <div className="text-[11.5px] italic text-[var(--sx-text-faint)]">Aún no hay impulsos. Los acuerdos catalizadores del Pulso aparecen aquí.</div>}
                {impulsos.map((imp) => (
                  <div key={imp.id} className="flex items-center gap-2.5 rounded-lg border border-[var(--sx-border)] bg-[var(--sx-input)] p-2.5">
                    <Zap className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
                    <span className="flex-1 text-sm text-[var(--sx-text)]">{imp.titulo}</span>
                    <span className="whitespace-nowrap text-[11px] text-[var(--sx-text-faint)]">{imp.responsable ? `${imp.responsable} · ` : ''}{imp.fecha_objetivo ? fechaCorta(imp.fecha_objetivo) : 'hoy'}</span>
                    <button onClick={() => onEliminarImpulso(imp.id)} className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border border-[var(--sx-border)] text-[var(--sx-text-faint)] hover:border-red-500/50 hover:text-red-400">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-[1fr_130px_auto] gap-2">
                <input value={impulsoInput} onChange={(e) => setImpulsoInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') onAgregarImpulso(); }}
                  placeholder="Agregar un impulso del día…"
                  className="rounded-lg border border-dashed border-[var(--sx-border-strong)] bg-[var(--sx-input)] px-3 py-2 text-xs text-[var(--sx-text)] outline-none focus:border-amber-400" />
                <input value={impulsoResponsable} onChange={(e) => setImpulsoResponsable(e.target.value)}
                  placeholder="Responsable"
                  className="rounded-lg border border-dashed border-[var(--sx-border-strong)] bg-[var(--sx-input)] px-3 py-2 text-xs text-[var(--sx-text)] outline-none focus:border-amber-400" />
                <button onClick={onAgregarImpulso} className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:opacity-90">
                  <Plus className="h-3.5 w-3.5" /> Agregar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-5">
          <div className="min-w-[220px] flex-1">
            <div className="mb-0.5 text-sm font-bold text-[var(--sx-text)]">Cierra el Pulso cuando terminen</div>
            <div className="text-xs leading-relaxed text-[var(--sx-text-dim)]">Esto sella el Pulso de hoy y los impulsos del día se quedan vinculados a tu Ritual Semanal.</div>
          </div>
          <button onClick={onCerrarPulso} disabled={busy}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Cerrar el Pulso de hoy
          </button>
        </div>
      </div>
    );
  }

  /* ══════════════════ CERRADO ══════════════════ */
  if (view === 'cerrado' && pulsoHoy) {
    const dur = pulsoHoy.duracion_segundos ? formatDuracion(pulsoHoy.duracion_segundos) : '—';
    const horaInicio = pulsoHoy.hora_real_inicio
      ? new Date(pulsoHoy.hora_real_inicio).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      : '—';
    const hoyIso = new Date().toISOString().split('T')[0];
    const puedeReabrir = pulsoHoy.fecha === hoyIso;

    return (
      <div>
        {dayHeader}
        <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.07] to-transparent p-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400"><CheckCircle2 className="h-4 w-4" /></div>
          <div className="min-w-[200px] flex-1">
            <div className="text-sm font-extrabold text-[var(--sx-text)]">Pulso cerrado · duró {dur}</div>
            <div className="text-xs text-[var(--sx-text-dim)]">Inició {horaInicio} ({formatDeltaMin(pulsoHoy.delta_minutos)} de la hora pactada)</div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-center">
              <div className="text-xl font-extrabold text-[var(--sx-text)]">{impulsos.length}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--sx-text-dim)]">Impulsos</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-extrabold text-[var(--sx-text)]">{pulsoHoy.numero_de_hoy || '—'}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--sx-text-dim)]">Número de hoy</div>
            </div>
          </div>
          {puedeReabrir && (
            <button onClick={onReabrirPulso} className="flex items-center gap-1.5 rounded-lg border border-[var(--sx-border)] px-3 py-1.5 text-xs font-semibold text-[var(--sx-text-muted)] hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)]">
              <RotateCcw className="h-3.5 w-3.5" /> Reabrir
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {[
            { n: 1, t: 'Lo que avanzó', v: pulsoHoy.lo_que_avanzo },
            { n: 2, t: 'El número de hoy', v: pulsoHoy.numero_de_hoy, isNum: true },
            { n: 3, t: 'Lo que traba', v: pulsoHoy.lo_que_traba },
          ].map((b) => (
            <div key={b.n} className="rounded-xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-4">
              <div className="mb-2 flex items-center gap-2.5">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-[11px] font-extrabold text-white">{b.n}</span>
                <span className="text-[13px] font-bold text-[var(--sx-text)]">{b.t}</span>
              </div>
              {b.isNum ? (
                <div className="flex items-baseline gap-2 pl-8 text-2xl font-black text-[var(--sx-text)]">
                  {b.v || '—'}
                  {semanaActual?.objetivo && <span className="text-xs font-medium text-[var(--sx-text-dim)]">objetivo: {semanaActual.objetivo}</span>}
                </div>
              ) : (
                <div className="whitespace-pre-wrap pl-8 text-sm leading-relaxed text-[var(--sx-text-muted)]">{b.v || '— sin notas —'}</div>
              )}
            </div>
          ))}
        </div>

        <StripSemana strip={strip} strikes={strikes} />
      </div>
    );
  }

  return null;
}
