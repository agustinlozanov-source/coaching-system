'use client';

// AgendasPanel.tsx — SCALEx · ADN · Módulo compartido de Agendas 7/30/90
// Renderiza y gestiona las agendas interactivas de la tabla `adn_agendas`.

import { useEffect, useRef, useState } from 'react';
import {
  Calendar, CalendarDays, CalendarRange, CalendarCheck, Check, PencilLine, RefreshCw, Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AGENDAS_PASO_0, AGENDA_PASO_2_RECTOR_TEMPLATE, RECTORES, TipoPiramideCodigo } from './catalog';

export type Horizonte = '7_dias' | '30_dias' | '90_dias';

export type AgendaRow = {
  id: string;
  sesion_id: string;
  paso: string;
  horizonte: Horizonte;
  contenido: string;
  estado: string;
  notas_consultor: string | null;
};

export const HORIZONTE_CONFIG: Record<Horizonte, { label: string; color: string; icon: any }> = {
  '7_dias': { label: '7 días', color: '#ec4899', icon: Calendar },
  '30_dias': { label: '30 días', color: '#f59e0b', icon: CalendarDays },
  '90_dias': { label: '90 días', color: '#14b8a6', icon: CalendarRange },
};

export const PASO_CONFIG: Record<string, { label: string; color: string }> = {
  paso_0: { label: 'P0 · Pirámide', color: '#ec4899' },
  paso_1: { label: 'P1 · Personalidad', color: '#7c3aed' },
  paso_2_rector: { label: 'P2 · Rectores', color: '#0ea5e9' },
};

/* ── Regenerar agendas de toda la sesión (usado por el hub) ──────────────── */
export async function regenerarAgendasSesion(sesionId: string, sesionData?: any) {
  const supabase = createClient();
  let sesion = sesionData;
  if (!sesion) {
    const { data } = await supabase.from('adn_sesiones').select('*').eq('id', sesionId).maybeSingle();
    sesion = data;
  }
  if (!sesion) return;

  const filas: any[] = [];

  if (sesion.paso_0_estado === 'completado' && sesion.paso_0_tipo_piramide) {
    const ag = AGENDAS_PASO_0[sesion.paso_0_tipo_piramide as TipoPiramideCodigo];
    if (ag) {
      filas.push(
        { sesion_id: sesionId, paso: 'paso_0', horizonte: '7_dias', contenido: ag['7_dias'] },
        { sesion_id: sesionId, paso: 'paso_0', horizonte: '30_dias', contenido: ag['30_dias'] },
        { sesion_id: sesionId, paso: 'paso_0', horizonte: '90_dias', contenido: ag['90_dias'] },
      );
    }
  }

  if (sesion.paso_1_estado === 'completado' && sesion.paso_1_nombre_hibrido) {
    const n = sesion.paso_1_nombre_hibrido;
    filas.push(
      { sesion_id: sesionId, paso: 'paso_1', horizonte: '7_dias', contenido: `Comparte el resultado del Perfil de Personalidad (${n}) con el equipo directivo. Reacción y resonancia.` },
      { sesion_id: sesionId, paso: 'paso_1', horizonte: '30_dias', contenido: `Identifica 1-2 iniciativas concretas que activen los rasgos secundarios del perfil ${n}.` },
      { sesion_id: sesionId, paso: 'paso_1', horizonte: '90_dias', contenido: `Revisión: ¿cómo ha evolucionado el perfil ${n}? ¿Qué rasgos se han fortalecido o debilitado? Conectar con el Mapa ADN del Paso 2.` },
    );
  }

  const filasRectores: any[] = [];
  if (sesion.paso_2_estado === 'completado') {
    const { data: rdata } = await supabase
      .from('adn_paso2_rectores')
      .select('id, rector_codigo, ano_construccion, estado_actual')
      .eq('sesion_id', sesionId)
      .eq('ano_construccion', 1)
      .neq('estado_actual', 'operativo');
    for (const r of rdata ?? []) {
      const info = RECTORES.find((rec) => rec.codigo === r.rector_codigo);
      const nombre = info?.nombre || r.rector_codigo;
      filasRectores.push(
        { sesion_id: sesionId, paso: 'paso_2_rector', horizonte: '7_dias', contenido: `[${nombre}] ${AGENDA_PASO_2_RECTOR_TEMPLATE['7_dias']}`, referencia_id: r.id },
        { sesion_id: sesionId, paso: 'paso_2_rector', horizonte: '30_dias', contenido: `[${nombre}] ${AGENDA_PASO_2_RECTOR_TEMPLATE['30_dias']}`, referencia_id: r.id },
        { sesion_id: sesionId, paso: 'paso_2_rector', horizonte: '90_dias', contenido: `[${nombre}] ${AGENDA_PASO_2_RECTOR_TEMPLATE['90_dias']}`, referencia_id: r.id },
      );
    }
  }

  const todasFilas = [...filas, ...filasRectores];
  if (todasFilas.length === 0) return;

  await supabase.from('adn_agendas').delete().eq('sesion_id', sesionId);
  await supabase.from('adn_agendas').insert(todasFilas);
}

/* ── Tarjeta individual de agenda (con checkbox + notas) ──────────────────── */
function AgendaCard({ agenda, onChange }: { agenda: AgendaRow; onChange: (next: AgendaRow) => void }) {
  const [showNotes, setShowNotes] = useState(!!agenda.notas_consultor);
  const [notes, setNotes] = useState(agenda.notas_consultor || '');
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const h = HORIZONTE_CONFIG[agenda.horizonte] ?? HORIZONTE_CONFIG['7_dias'];
  const Icon = h.icon;
  const isDone = agenda.estado === 'completada';

  async function toggle() {
    const supabase = createClient();
    const nextEstado = isDone ? 'pendiente' : 'completada';
    onChange({ ...agenda, estado: nextEstado });
    await supabase.from('adn_agendas').update({ estado: nextEstado }).eq('id', agenda.id);
  }

  function handleNotes(v: string) {
    setNotes(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const supabase = createClient();
      await supabase.from('adn_agendas').update({ notas_consultor: v }).eq('id', agenda.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 800);
  }

  return (
    <div className={`overflow-hidden rounded-xl border bg-[var(--sx-card)] transition ${isDone ? 'border-emerald-500/40 opacity-60' : 'border-[var(--sx-border)]'}`}>
      <div className="flex items-center justify-between border-b border-[var(--sx-border)] px-3 py-2">
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold" style={{ background: `${h.color}22`, color: h.color }}>
          <Icon className="h-3 w-3" /> {h.label}
        </span>
        <label className="flex cursor-pointer items-center" title={isDone ? 'Marcar pendiente' : 'Marcar completada'}>
          <input type="checkbox" checked={isDone} onChange={toggle} className="hidden" />
          <span className={`flex h-[17px] w-[17px] items-center justify-center rounded-[5px] border transition ${isDone ? 'border-emerald-500 bg-emerald-500' : 'border-[var(--sx-border-strong)] bg-[var(--sx-card-hover)]'}`}>
            {isDone && <Check className="h-3 w-3 text-white" />}
          </span>
        </label>
      </div>
      <div className="p-3.5">
        <div className={`text-[12.5px] leading-relaxed transition ${isDone ? 'text-[var(--sx-text-faint)] line-through' : 'text-[var(--sx-text-muted)]'}`}>{agenda.contenido}</div>
        <button type="button" onClick={() => setShowNotes((s) => !s)} className="mt-2 flex items-center gap-1 text-[11px] text-[var(--sx-text-faint)] transition hover:text-[var(--sx-text-muted)]">
          <PencilLine className="h-3 w-3" /> {notes.trim() ? 'Ver nota' : 'Agregar nota'}
        </button>
        {showNotes && (
          <>
            <textarea
              value={notes}
              onChange={(e) => handleNotes(e.target.value)}
              placeholder="Notas del consultor…"
              className="mt-1.5 min-h-[60px] w-full resize-none rounded-md border border-[var(--sx-border)] bg-[var(--sx-input)] p-2 text-xs text-[var(--sx-text-muted)] outline-none transition focus:border-[#1aab99]"
            />
            <div className={`mt-1 text-[10px] text-emerald-400 transition-opacity ${saved ? 'opacity-100' : 'opacity-0'}`}>Guardado ✓</div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Agendas de un solo paso (paso_0 / paso_1 / paso_2_rector) ────────────── */
export function AgendasForStep({ sesionId, paso }: { sesionId: string; paso: string }) {
  const [agendas, setAgendas] = useState<AgendaRow[] | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('adn_agendas')
        .select('*')
        .eq('sesion_id', sesionId)
        .eq('paso', paso)
        .order('horizonte');
      setAgendas((data ?? []) as AgendaRow[]);
    })();
  }, [sesionId, paso]);

  if (agendas === null) {
    return <div className="py-6 text-center text-xs text-[var(--sx-text-faint)]">Cargando…</div>;
  }
  if (agendas.length === 0) {
    return <div className="py-6 text-center text-xs text-[var(--sx-text-faint)]">No hay agendas generadas para este paso.</div>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {agendas.map((a) => (
        <AgendaCard key={a.id} agenda={a} onChange={(next) => setAgendas((prev) => (prev ?? []).map((x) => (x.id === next.id ? next : x)))} />
      ))}
    </div>
  );
}

/* ── Hub de agendas: todas, agrupadas por horizonte ───────────────────────── */
export function AgendasHub({ sesionId, sesion }: { sesionId: string; sesion: any }) {
  const [agendas, setAgendas] = useState<AgendaRow[] | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from('adn_agendas').select('*').eq('sesion_id', sesionId).order('horizonte');
    setAgendas((data ?? []) as AgendaRow[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesionId]);

  async function toggleAgenda(a: AgendaRow) {
    const supabase = createClient();
    const nextEstado = a.estado === 'completada' ? 'pendiente' : 'completada';
    setAgendas((prev) => (prev ?? []).map((x) => (x.id === a.id ? { ...x, estado: nextEstado } : x)));
    await supabase.from('adn_agendas').update({ estado: nextEstado }).eq('id', a.id);
  }

  async function regenerar() {
    setRegenerating(true);
    await regenerarAgendasSesion(sesionId, sesion);
    await load();
    setRegenerating(false);
  }

  const canRegen = !!sesion && (sesion.paso_0_estado === 'completado' || sesion.paso_1_estado === 'completado' || sesion.paso_2_estado === 'completado');

  if (agendas === null) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-10">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--sx-text-faint)]" />
      </div>
    );
  }

  if (agendas.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)]">
        <div className="flex items-center gap-3 border-b border-[var(--sx-border)] p-4">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-pink-500/10">
            <CalendarCheck className="h-4 w-4 text-pink-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--sx-text)]">Agenda ADN · 7 / 30 / 90 días</h3>
            <p className="text-[11.5px] text-[var(--sx-text-dim)]">
              {canRegen ? 'Sesión completada pero sin agendas. Pulsa para generarlas.' : 'Las acciones se generan automáticamente al completar cada paso.'}
            </p>
          </div>
        </div>
        <div className="p-6 text-center text-xs text-[var(--sx-text-faint)]">
          {canRegen ? (
            <>
              Los pasos están completados pero las agendas aún no fueron generadas.
              <div className="mt-3">
                <button
                  type="button"
                  onClick={regenerar}
                  disabled={regenerating}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--sx-border)] bg-[var(--sx-card-hover)] px-4 py-2 text-xs font-semibold text-[var(--sx-text-muted)] transition hover:border-[#1aab99] hover:text-[#1aab99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Regenerar agendas
                </button>
              </div>
            </>
          ) : (
            'Completa al menos el Paso 0 para ver tu agenda de implementación.'
          )}
        </div>
      </div>
    );
  }

  const grupos: Record<Horizonte, AgendaRow[]> = { '7_dias': [], '30_dias': [], '90_dias': [] };
  agendas.forEach((a) => { if (grupos[a.horizonte]) grupos[a.horizonte].push(a); });
  const pendienteTotal = agendas.filter((a) => a.estado !== 'completada').length;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)]">
      <div className="flex items-center gap-3 border-b border-[var(--sx-border)] p-4">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-pink-500/10">
          <CalendarCheck className="h-4 w-4 text-pink-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-[var(--sx-text)]">Agenda ADN · 7 / 30 / 90 días</h3>
          <p className="text-[11.5px] text-[var(--sx-text-dim)]">Acciones concretas por horizonte para implementar el diagnóstico.</p>
        </div>
        {pendienteTotal > 0 ? (
          <span className="rounded-full bg-pink-500/10 px-2.5 py-1 text-[11px] font-bold text-pink-400">{pendienteTotal} pendiente{pendienteTotal > 1 ? 's' : ''}</span>
        ) : (
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400">✓ Todo completado</span>
        )}
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-3">
        {(['7_dias', '30_dias', '90_dias'] as Horizonte[]).map((hz) => {
          const h = HORIZONTE_CONFIG[hz];
          const Icon = h.icon;
          const items = grupos[hz];
          return (
            <div key={hz} className="flex flex-col gap-2.5">
              <div className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold" style={{ background: `${h.color}11`, color: h.color, borderColor: `${h.color}33` }}>
                <Icon className="h-3.5 w-3.5" /> {h.label}
              </div>
              {items.length === 0 ? (
                <div className="py-4 text-center text-[11px] text-[var(--sx-text-faint)]">Sin acciones todavía.</div>
              ) : (
                items.map((a) => {
                  const paso = PASO_CONFIG[a.paso] || { label: a.paso, color: '#888' };
                  const isDone = a.estado === 'completada';
                  return (
                    <div key={a.id} className={`rounded-xl border bg-[var(--sx-input)] p-3 transition ${isDone ? 'border-emerald-500/30 opacity-60' : 'border-[var(--sx-border)]'}`}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: `${paso.color}22`, color: paso.color }}>{paso.label}</span>
                        <input type="checkbox" checked={isDone} onChange={() => toggleAgenda(a)} className="h-3.5 w-3.5 accent-emerald-500" />
                      </div>
                      <div className={`text-[12px] leading-relaxed ${isDone ? 'text-[var(--sx-text-faint)] line-through' : 'text-[var(--sx-text-muted)]'}`}>{a.contenido}</div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
