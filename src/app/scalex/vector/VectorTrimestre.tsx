'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Activity, Calendar, ChevronDown, ChevronLeft, ChevronRight, Edit2, Hash, LayoutGrid,
  Loader2, Plus, Repeat, Trash2, TrendingDown, TrendingUp, User, Zap,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Perfil, VectorFactorX, VectorIndicador, VectorMedicion, VectorTrimestre as TVectorTrimestre } from './types';
import {
  calcularSemaforo, calcularSemanaDelAnio, formatFechaCorta, formatFechaMini,
  SEMAFORO_BADGE, SEMAFORO_BORDER, SEMAFORO_DOT, SEMAFORO_LABELS, todayISO,
} from './helpers';
import { IndicadorModal, type IndicadorPayload } from './IndicadorModal';

const ESTADO_LABELS: Record<string, string> = { pendiente: 'PENDIENTE', activo: 'EN CURSO', completado: 'COMPLETADO' };

type Hermano = { id: string; numero: number; titulo: string | null; estado: string };
type VectorInfo = { id: string; meta: string; nombre: string | null; fecha_inicio: string };
type TrimestreConVector = TVectorTrimestre & { vector_estrategicos?: VectorInfo };

type Toast = { msg: string; type: 'success' | 'error' } | null;

export function VectorTrimestre({
  orgId, profile, trimestreId, onBackNorte, onNavigateTrimestre,
}: {
  orgId: string | null;
  profile: Perfil | null;
  trimestreId: string;
  onBackNorte: () => void;
  onNavigateTrimestre: (id: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [trimestre, setTrimestre] = useState<TrimestreConVector | null>(null);
  const [hermanos, setHermanos] = useState<Hermano[]>([]);
  const [factorX, setFactorX] = useState<VectorFactorX | null>(null);
  const [indicadores, setIndicadores] = useState<VectorIndicador[]>([]);
  const [medicionesPorIndicador, setMedicionesPorIndicador] = useState<Record<string, VectorMedicion[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndicador, setEditingIndicador] = useState<VectorIndicador | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  // Hero editable
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  // Factor X editable
  const [complemento, setComplemento] = useState('');
  const [metaDesc, setMetaDesc] = useState('');
  const [resultado, setResultado] = useState('');

  const loaded = useRef(false);
  const tituloTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loaded.current = false;
    (async () => {
      setLoading(true);
      const supabase = createClient();

      const { data: t } = await supabase
        .from('vector_trimestres')
        .select('*, vector_estrategicos(id, meta, nombre, fecha_inicio)')
        .eq('id', trimestreId)
        .single();

      if (!t) {
        setLoading(false);
        return;
      }
      const trim = t as TrimestreConVector;
      setTrimestre(trim);
      setTitulo(trim.titulo ?? '');
      setDescripcion(trim.descripcion ?? '');

      const vectorId = trim.vector_estrategicos?.id ?? trim.vector_id;
      const { data: herm } = await supabase
        .from('vector_trimestres')
        .select('id, numero, titulo, estado')
        .eq('vector_id', vectorId)
        .order('numero', { ascending: true });
      setHermanos((herm ?? []) as Hermano[]);

      const { data: fx } = await supabase.from('vector_factor_x').select('*').eq('trimestre_id', trimestreId).maybeSingle();
      setFactorX(fx as VectorFactorX | null);
      setComplemento(fx?.complemento ?? '');
      setMetaDesc(fx?.meta_descripcion ?? '');
      setResultado(fx?.resultado_real ?? '');

      const { data: inds } = await supabase
        .from('vector_indicadores_criticos')
        .select('*')
        .eq('trimestre_id', trimestreId)
        .order('orden', { ascending: true })
        .order('created_at', { ascending: true });
      const indicadoresList = (inds ?? []) as VectorIndicador[];
      setIndicadores(indicadoresList);

      const ids = indicadoresList.map((i) => i.id);
      if (ids.length) {
        const { data: meds } = await supabase
          .from('vector_mediciones')
          .select('*')
          .in('indicador_id', ids)
          .order('fecha', { ascending: false })
          .order('created_at', { ascending: false });
        const map: Record<string, VectorMedicion[]> = {};
        (meds ?? []).forEach((m: VectorMedicion) => {
          if (!map[m.indicador_id]) map[m.indicador_id] = [];
          map[m.indicador_id].push(m);
        });
        setMedicionesPorIndicador(map);
      } else {
        setMedicionesPorIndicador({});
      }

      setExpanded({});
      setLoading(false);
      // pequeño delay para no disparar autosave con los valores recién cargados
      setTimeout(() => { loaded.current = true; }, 0);
    })();
  }, [trimestreId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── Autosave título / descripción ── */
  useEffect(() => {
    if (!loaded.current || !trimestre) return;
    if (tituloTimer.current) clearTimeout(tituloTimer.current);
    tituloTimer.current = setTimeout(async () => {
      const supabase = createClient();
      const { error } = await supabase.from('vector_trimestres').update({ titulo: titulo.trim() || null }).eq('id', trimestreId);
      if (!error) setToast({ msg: 'Título guardado', type: 'success' });
    }, 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulo]);

  useEffect(() => {
    if (!loaded.current || !trimestre) return;
    if (descTimer.current) clearTimeout(descTimer.current);
    descTimer.current = setTimeout(async () => {
      const supabase = createClient();
      const { error } = await supabase.from('vector_trimestres').update({ descripcion: descripcion.trim() || null }).eq('id', trimestreId);
      if (!error) setToast({ msg: 'Descripción guardada', type: 'success' });
    }, 1200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descripcion]);

  /* ── Autosave Factor X ── */
  useEffect(() => {
    if (!loaded.current) return;
    if (!complemento.trim()) return; // espejo del portal: sin complemento no se guarda
    if (fxTimer.current) clearTimeout(fxTimer.current);
    fxTimer.current = setTimeout(async () => {
      const supabase = createClient();
      const payload = {
        complemento: complemento.trim(),
        meta_descripcion: metaDesc.trim() || null,
        resultado_real: resultado.trim() || null,
      };
      if (factorX) {
        const { data, error } = await supabase.from('vector_factor_x').update(payload).eq('id', factorX.id).select('*').single();
        if (!error && data) { setFactorX(data as VectorFactorX); setToast({ msg: 'Factor X guardado', type: 'success' }); }
      } else if (orgId) {
        const { data, error } = await supabase
          .from('vector_factor_x')
          .insert({ ...payload, trimestre_id: trimestreId, organizacion_id: orgId })
          .select('*')
          .single();
        if (!error && data) { setFactorX(data as VectorFactorX); setToast({ msg: 'Factor X guardado', type: 'success' }); }
      }
    }, 900);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complemento, metaDesc, resultado]);

  /* ── Indicadores CRUD ── */
  async function submitIndicador(payload: IndicadorPayload) {
    const supabase = createClient();
    if (editingIndicador) {
      const { data, error } = await supabase.from('vector_indicadores_criticos').update(payload).eq('id', editingIndicador.id).select('*').single();
      if (!error && data) {
        setIndicadores((prev) => prev.map((i) => (i.id === editingIndicador.id ? (data as VectorIndicador) : i)));
        setToast({ msg: 'Indicador actualizado', type: 'success' });
        setModalOpen(false);
        setEditingIndicador(null);
      } else {
        setToast({ msg: 'Error al guardar', type: 'error' });
      }
    } else if (orgId) {
      const { data, error } = await supabase
        .from('vector_indicadores_criticos')
        .insert({ ...payload, trimestre_id: trimestreId, organizacion_id: orgId, orden: indicadores.length })
        .select('*')
        .single();
      if (!error && data) {
        const ind = data as VectorIndicador;
        setIndicadores((prev) => [...prev, ind]);
        setMedicionesPorIndicador((prev) => ({ ...prev, [ind.id]: [] }));
        setExpanded((prev) => ({ ...prev, [ind.id]: true }));
        setToast({ msg: 'Indicador creado', type: 'success' });
        setModalOpen(false);
        setEditingIndicador(null);
      } else {
        setToast({ msg: 'Error al guardar', type: 'error' });
      }
    }
  }

  async function deleteIndicador(ind: VectorIndicador) {
    if (!window.confirm(`Eliminar "${ind.nombre}"? Se borrarán también todas sus mediciones.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from('vector_indicadores_criticos').delete().eq('id', ind.id);
    if (error) { setToast({ msg: 'Error al eliminar', type: 'error' }); return; }
    setIndicadores((prev) => prev.filter((i) => i.id !== ind.id));
    setMedicionesPorIndicador((prev) => { const next = { ...prev }; delete next[ind.id]; return next; });
    setToast({ msg: 'Indicador eliminado', type: 'success' });
  }

  async function addMedicion(ind: VectorIndicador, valorStr: string, fecha: string) {
    const valor = parseFloat(valorStr);
    if (Number.isNaN(valor)) { setToast({ msg: 'Ingresa un número válido', type: 'error' }); return; }
    const semaforo = calcularSemaforo(valor, ind.umbrales, ind.direccion) as VectorMedicion['semaforo'];
    const supabase = createClient();
    const { data, error } = await supabase
      .from('vector_mediciones')
      .insert({ indicador_id: ind.id, valor, semaforo, fecha, organizacion_id: orgId, capturado_por: profile?.id ?? null })
      .select('*')
      .single();
    if (error || !data) { setToast({ msg: 'Error al registrar', type: 'error' }); return; }
    setMedicionesPorIndicador((prev) => {
      const list = [data as VectorMedicion, ...(prev[ind.id] ?? [])];
      list.sort((a, b) => (a.fecha !== b.fecha ? b.fecha.localeCompare(a.fecha) : b.created_at.localeCompare(a.created_at)));
      return { ...prev, [ind.id]: list };
    });
    setToast({ msg: `Medición registrada · ${SEMAFORO_LABELS[semaforo]}`, type: 'success' });
  }

  async function deleteMedicion(indId: string, medId: string) {
    if (!window.confirm('Eliminar esta medición?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('vector_mediciones').delete().eq('id', medId);
    if (error) { setToast({ msg: 'Error al eliminar', type: 'error' }); return; }
    setMedicionesPorIndicador((prev) => ({ ...prev, [indId]: (prev[indId] ?? []).filter((m) => m.id !== medId) }));
    setToast({ msg: 'Medición eliminada', type: 'success' });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--sx-text-dim)]" />
      </div>
    );
  }

  if (!trimestre) {
    return (
      <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-16 text-center">
        <h2 className="text-xl font-bold text-[var(--sx-text)]">Round no encontrado</h2>
        <button onClick={onBackNorte} className="mt-3 text-sm font-semibold text-[#1aab99]">Volver al tablero</button>
      </div>
    );
  }

  const idx = hermanos.findIndex((h) => h.id === trimestreId);
  const prev = idx > 0 ? hermanos[idx - 1] : null;
  const next = idx >= 0 && idx < hermanos.length - 1 ? hermanos[idx + 1] : null;
  const anioCal = new Date(trimestre.fecha_inicio + 'T12:00:00').getFullYear();

  return (
    <div>
      {/* HERO */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] p-7 text-white">
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10" />
        <div className="relative z-10 mb-3 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-white/20 px-3.5 py-1.5 text-sm font-extrabold">ROUND {trimestre.numero} · Q{trimestre.trimestre_anio} {anioCal}</span>
          <span className="flex items-center gap-1.5 text-xs opacity-90"><Calendar className="h-3.5 w-3.5" /> {formatFechaCorta(trimestre.fecha_inicio)} – {formatFechaCorta(trimestre.fecha_fin)}</span>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-wide ${trimestre.estado === 'completado' ? 'bg-emerald-500/40' : trimestre.estado === 'activo' ? 'bg-white/30' : 'bg-white/20'}`}>
            {ESTADO_LABELS[trimestre.estado] ?? trimestre.estado}
          </span>
        </div>

        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          maxLength={200}
          placeholder="Define el título de este round (ej: Atraer nuevos clientes)"
          className="mb-3 w-full border-b-2 border-dashed border-white/25 bg-transparent py-1 text-3xl font-extrabold tracking-tight text-white outline-none placeholder:text-white/40 focus:border-white/70"
        />

        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={1000}
          placeholder="Describe la temática y enfoque de este trimestre..."
          className="mb-4 min-h-[50px] w-full max-w-2xl resize-none rounded-lg bg-white/10 p-3 text-sm leading-relaxed text-white/95 outline-none transition placeholder:text-white/50 focus:bg-white/[0.16]"
        />

        <div className="flex flex-wrap gap-2.5 border-t border-white/20 pt-4">
          <button onClick={onBackNorte} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-white/25">
            <LayoutGrid className="h-3 w-3" /> Ver tablero del Vector
          </button>
          {prev && (
            <button onClick={() => onNavigateTrimestre(prev.id)} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-white/25">
              <ChevronLeft className="h-3 w-3" /> R{prev.numero}
            </button>
          )}
          {next && (
            <button onClick={() => onNavigateTrimestre(next.id)} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-white/25">
              R{next.numero} <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* FACTOR X */}
      <div className="mb-1 flex items-center gap-2 text-base font-extrabold text-[var(--sx-text)]">
        <Zap className="h-4 w-4 text-[#1aab99]" /> Factor X · La métrica que define si ganamos
      </div>
      <p className="mb-4 ml-6 text-sm text-[var(--sx-text-muted)]">
        El Factor X siempre se formula igual: <strong className="text-[var(--sx-text-muted)]">utilidad por…</strong>. Conecta la meta del trimestre con la rentabilidad real.
      </p>

      <div className="mb-6 rounded-2xl border-[1.5px] border-[#1aab99] bg-gradient-to-br from-[#1aab99]/10 to-[#3533cd]/10 p-6">
        <div className="mb-3 text-[11px] font-extrabold uppercase tracking-wide text-[#1aab99]">FÓRMULA DEL FACTOR X</div>
        <div className="mb-4 flex flex-wrap items-baseline gap-3">
          <span className="text-2xl font-extrabold tracking-tight text-[var(--sx-text)]">Utilidad por</span>
          <input
            value={complemento}
            onChange={(e) => setComplemento(e.target.value)}
            maxLength={100}
            placeholder="ej: nuevo cliente, sesión, vendedor..."
            className="min-w-[220px] flex-1 rounded-lg border-2 border-[#1aab99] bg-[var(--sx-input)] px-4 py-2.5 text-xl font-extrabold text-[var(--sx-text)] outline-none placeholder:text-[var(--sx-text-faint)]"
          />
        </div>
        <div className="grid gap-3.5 md:grid-cols-2">
          <div>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--sx-text-muted)]">Meta del trimestre</div>
            <input value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} placeholder="¿Qué quieres lograr concretamente?" className="w-full rounded-lg border border-[var(--sx-border)] bg-[var(--sx-input)] px-3.5 py-2.5 text-sm font-semibold text-[var(--sx-text)] outline-none focus:border-[#1aab99]" />
          </div>
          <div>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--sx-text-muted)]">Resultado real (al cierre)</div>
            <input value={resultado} onChange={(e) => setResultado(e.target.value)} placeholder="Se llena cuando termine el round" className="w-full rounded-lg border border-[var(--sx-border)] bg-[var(--sx-input)] px-3.5 py-2.5 text-sm font-semibold text-[var(--sx-text)] outline-none focus:border-[#1aab99]" />
          </div>
        </div>
      </div>

      {/* INDICADORES */}
      <div className="mb-1 flex items-center gap-2 text-base font-extrabold text-[var(--sx-text)]">
        <Activity className="h-4 w-4 text-[#1aab99]" /> Indicadores críticos · El semáforo diario
      </div>
      <p className="mb-4 ml-6 text-sm text-[var(--sx-text-muted)]">
        Los indicadores muestran si las acciones del día a día sostienen el Factor X. Cada uno tiene 4 umbrales:{' '}
        <strong className="text-emerald-400">verde alto</strong>, <strong className="text-lime-400">verde bajo</strong>,{' '}
        <strong className="text-amber-400">amarillo</strong>, <strong className="text-red-400">rojo</strong>.
      </p>

      <div className="flex flex-col gap-3.5">
        {indicadores.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--sx-border-strong)] bg-[var(--sx-card)] p-9 text-center">
            <Activity className="mx-auto mb-2.5 h-8 w-8 text-[var(--sx-text-faint)]" />
            <p className="text-sm text-[var(--sx-text-muted)]">Aún no has definido indicadores críticos para este round.</p>
            <p className="mt-1 text-xs text-[var(--sx-text-dim)]">Los indicadores son las métricas semanales o mensuales que sostienen tu Factor X.</p>
          </div>
        )}

        {indicadores.map((ind) => (
          <IndicadorCard
            key={ind.id}
            ind={ind}
            mediciones={medicionesPorIndicador[ind.id] ?? []}
            expanded={!!expanded[ind.id]}
            onToggle={() => setExpanded((prev) => ({ ...prev, [ind.id]: !prev[ind.id] }))}
            onEdit={() => { setEditingIndicador(ind); setModalOpen(true); }}
            onDelete={() => deleteIndicador(ind)}
            onAddMedicion={(valor, fecha) => addMedicion(ind, valor, fecha)}
            onDeleteMedicion={(medId) => deleteMedicion(ind.id, medId)}
          />
        ))}

        <button
          onClick={() => { setEditingIndicador(null); setModalOpen(true); }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-[var(--sx-border-strong)] py-4 text-sm font-bold text-[var(--sx-text-muted)] transition hover:border-[#1aab99] hover:bg-[#1aab99]/10 hover:text-[#1aab99]"
        >
          <Plus className="h-4 w-4" /> Agregar indicador crítico
        </button>
      </div>

      {modalOpen && (
        <IndicadorModal
          editing={editingIndicador}
          onClose={() => { setModalOpen(false); setEditingIndicador(null); }}
          onSubmit={submitIndicador}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border px-5 py-2.5 text-sm font-semibold shadow-lg ${
          toast.type === 'success' ? 'border-emerald-500 bg-[var(--sx-card)] text-emerald-400' : 'border-red-500 bg-[var(--sx-card)] text-red-400'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════ INDICADOR CARD ══════════════════════════════════════ */
function IndicadorCard({
  ind, mediciones, expanded, onToggle, onEdit, onDelete, onAddMedicion, onDeleteMedicion,
}: {
  ind: VectorIndicador;
  mediciones: VectorMedicion[];
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddMedicion: (valor: string, fecha: string) => void;
  onDeleteMedicion: (medId: string) => void;
}) {
  const [valor, setValor] = useState('');
  const [fecha, setFecha] = useState(todayISO());

  const semaforo = mediciones.length ? mediciones[0].semaforo : 'sin_medir';
  const valorActual = mediciones.length ? mediciones[0] : null;
  const dirSimbolo = ind.direccion === 'mayor_es_mejor' ? '≥' : '≤';
  const unidad = ind.unidad ? ` ${ind.unidad}` : '';

  function submitMedicion() {
    if (!valor.trim()) return;
    onAddMedicion(valor, fecha || todayISO());
    setValor('');
  }

  return (
    <div className={`overflow-hidden rounded-2xl border bg-[var(--sx-card)] transition ${SEMAFORO_BORDER[semaforo]} border-l-4 ${expanded ? 'border-[var(--sx-border-strong)]' : 'border-[var(--sx-border)]'}`}>
      <div onClick={onToggle} className="grid cursor-pointer grid-cols-[auto_1fr_auto_auto] items-center gap-4 p-5 transition hover:bg-[var(--sx-card-hover)]">
        <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl ${SEMAFORO_DOT[semaforo]} ${semaforo === 'sin_medir' ? 'border border-[var(--sx-border)]' : ''}`}>
          <span className={`max-w-[50px] truncate text-lg font-extrabold ${semaforo === 'sin_medir' ? 'text-[var(--sx-text-faint)]' : 'text-[var(--sx-text)]'}`}>
            {valorActual ? valorActual.valor : '—'}
          </span>
        </div>
        <div className="min-w-0">
          <div className="mb-1 text-base font-extrabold leading-tight text-[var(--sx-text)]">{ind.nombre}</div>
          <div className="flex flex-wrap gap-1.5 text-xs text-[var(--sx-text-muted)]">
            {ind.responsable_nombre && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--sx-border)] bg-[var(--sx-card-hover)] px-2 py-0.5 font-semibold"><User className="h-2.5 w-2.5" />{ind.responsable_nombre}</span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--sx-border)] bg-[var(--sx-card-hover)] px-2 py-0.5 font-semibold"><Repeat className="h-2.5 w-2.5" />{ind.frecuencia === 'diaria' ? 'Diaria' : ind.frecuencia === 'mensual' ? 'Mensual' : 'Semanal'}</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--sx-border)] bg-[var(--sx-card-hover)] px-2 py-0.5 font-semibold">
              {ind.direccion === 'mayor_es_mejor' ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
              {ind.direccion === 'mayor_es_mejor' ? 'Mayor es mejor' : 'Menor es mejor'}
            </span>
            {ind.unidad && <span className="inline-flex items-center gap-1 rounded-full border border-[var(--sx-border)] bg-[var(--sx-card-hover)] px-2 py-0.5 font-semibold"><Hash className="h-2.5 w-2.5" />{ind.unidad}</span>}
          </div>
        </div>
        <div className="flex flex-shrink-0 flex-col items-end">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-wide ${SEMAFORO_BADGE[semaforo]}`}>{SEMAFORO_LABELS[semaforo]}</span>
          <span className="mt-1 text-[11px] text-[var(--sx-text-dim)]">{valorActual ? `Última: ${valorActual.valor} (${formatFechaMini(valorActual.fecha)})` : 'Primera medición pendiente'}</span>
        </div>
        <button className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--sx-border)] bg-[var(--sx-card-hover)] text-[var(--sx-text-muted)] transition ${expanded ? 'rotate-180 text-[#1aab99]' : ''}`}>
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-[var(--sx-border)]">
          <div className="grid gap-6 p-5 md:grid-cols-2">
            {/* Umbrales */}
            <div>
              <div className="mb-2.5 text-[11px] font-extrabold uppercase tracking-wide text-[var(--sx-text-dim)]">Umbrales</div>
              <div className="flex flex-col gap-1.5">
                {([
                  ['verde_alto' as const, 'Verde alto', 'bg-emerald-500', 'text-emerald-400', ind.umbrales.verde_alto],
                  ['verde_bajo' as const, 'Verde bajo', 'bg-lime-500', 'text-lime-400', ind.umbrales.verde_bajo],
                  ['amarillo' as const, 'Amarillo', 'bg-amber-500', 'text-amber-400', ind.umbrales.amarillo],
                ]).map(([key, label, dot, text, val]) => (
                  <div key={key} className="flex items-center justify-between rounded-lg border border-[var(--sx-border)] bg-[var(--sx-input)] px-3.5 py-2.5">
                    <span className={`flex items-center gap-2 text-xs font-bold ${text}`}><span className={`h-2.5 w-2.5 rounded-full ${dot}`} />{label}</span>
                    <span className="text-sm font-extrabold text-[var(--sx-text)]">{dirSimbolo} {val}{unidad}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-lg border border-[var(--sx-border)] bg-[var(--sx-input)] px-3.5 py-2.5">
                  <span className="flex items-center gap-2 text-xs font-bold text-red-400"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />Rojo</span>
                  <span className="text-sm font-extrabold text-[var(--sx-text)]">{ind.direccion === 'mayor_es_mejor' ? '<' : '>'} {ind.umbrales.amarillo}{unidad}</span>
                </div>
              </div>
            </div>

            {/* Mediciones */}
            <div>
              <div className="mb-2.5 text-[11px] font-extrabold uppercase tracking-wide text-[var(--sx-text-dim)]">Mediciones recientes</div>
              <div className="mb-3 grid grid-cols-[1fr_auto_auto] gap-1.5" onClick={(e) => e.stopPropagation()}>
                <input
                  type="number" step="any" value={valor} onChange={(e) => setValor(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitMedicion(); } }}
                  placeholder="Nuevo valor"
                  className="rounded-lg border border-[var(--sx-border)] bg-[var(--sx-input)] px-3 py-2 text-sm font-bold text-[var(--sx-text)] outline-none focus:border-[#1aab99]"
                />
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-[140px] rounded-lg border border-[var(--sx-border)] bg-[var(--sx-input)] px-2.5 py-2 text-sm font-bold text-[var(--sx-text)] outline-none focus:border-[#1aab99]" />
                <button onClick={submitMedicion} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-3.5 py-2 text-xs font-bold text-white">
                  <Plus className="h-3.5 w-3.5" /> Registrar
                </button>
              </div>

              {mediciones.length === 0 ? (
                <div className="rounded-lg bg-[var(--sx-card-hover)] p-3.5 text-center text-xs italic text-[var(--sx-text-dim)]">Sin mediciones aún</div>
              ) : (
                <div className="flex max-h-[280px] flex-col gap-1 overflow-y-auto">
                  {mediciones.slice(0, 10).map((m) => (
                    <div key={m.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2.5 rounded-lg border border-[var(--sx-border)] bg-[var(--sx-input)] px-3 py-2 text-sm">
                      <span className={`h-2.5 w-2.5 rounded-full ${SEMAFORO_DOT[m.semaforo]}`} />
                      <span className="text-[var(--sx-text-muted)]">{formatFechaMini(m.fecha)} <span className="text-[11px] text-[var(--sx-text-faint)]">({calcularSemanaDelAnio(m.fecha)})</span></span>
                      <span className="font-extrabold text-[var(--sx-text)]">{m.valor}</span>
                      <button onClick={(e) => { e.stopPropagation(); onDeleteMedicion(m.id); }} className="text-[var(--sx-text-faint)] transition hover:text-red-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {mediciones.length > 10 && (
                    <div className="py-1.5 text-center text-[11px] italic text-[var(--sx-text-faint)]">+ {mediciones.length - 10} mediciones anteriores</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-[var(--sx-border)] px-5 py-3.5">
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="flex items-center gap-1.5 rounded-full border border-[var(--sx-border)] bg-[var(--sx-card-hover)] px-3.5 py-1.5 text-xs font-bold text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)]">
              <Edit2 className="h-3 w-3" /> Editar
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="flex items-center gap-1.5 rounded-full border border-[var(--sx-border)] bg-[var(--sx-card-hover)] px-3.5 py-1.5 text-xs font-bold text-[var(--sx-text-muted)] transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400">
              <Trash2 className="h-3 w-3" /> Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
