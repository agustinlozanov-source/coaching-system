'use client';

// PiramideView.tsx — SCALEx · ADN · Paso 0 · Diagnóstico de Pirámide
// Tablas: adn_paso0_respuestas, adn_sesiones (paso_0_*), adn_agendas
// RPC: adn_completar_paso_0

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Grid3x3, BarChart2, Loader2, CalendarCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Sesion } from './AdnApp';
import {
  TESIS_PASO_0, PUNTAJE_RESPUESTA, RANGOS_PIRAMIDE, PIRAMIDES, AGENDAS_PASO_0,
  RespuestaTipo, TipoPiramideCodigo,
} from './catalog';
import { AgendasForStep } from './AgendasPanel';
import { SaveIndicator, SaveState } from './SaveIndicator';

type RespuestaLocal = { tipo: RespuestaTipo | null; notas: string };

export function PiramideView({
  sesionId, sesion, onBack, onCompleted,
}: {
  sesionId: string;
  sesion: Sesion;
  onBack: () => void;
  onCompleted: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [respuestas, setRespuestas] = useState<Record<number, RespuestaLocal>>({});
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const [completado, setCompletado] = useState(sesion.paso_0_estado === 'completado');
  const [tipoPiramide, setTipoPiramide] = useState<TipoPiramideCodigo | null>(
    (sesion.paso_0_tipo_piramide as TipoPiramideCodigo) ?? null,
  );
  const [puntajeGuardado, setPuntajeGuardado] = useState<number | null>(sesion.paso_0_puntaje ?? null);
  const [completing, setCompleting] = useState(false);

  const notesTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('adn_paso0_respuestas')
        .select('tesis_numero, respuesta_tipo, notas_consultor')
        .eq('sesion_id', sesionId);

      const map: Record<number, RespuestaLocal> = {};
      (data ?? []).forEach((r: any) => {
        map[r.tesis_numero] = { tipo: r.respuesta_tipo, notas: r.notas_consultor || '' };
      });
      setRespuestas(map);
      setLoading(false);
    })();
  }, [sesionId]);

  function flashSaved() {
    setSaveState('saved');
    setTimeout(() => setSaveState('idle'), 2500);
  }

  async function guardarRespuesta(num: number, tipo: RespuestaTipo, notas: string) {
    setSaveState('saving');
    const supabase = createClient();
    const puntaje = PUNTAJE_RESPUESTA[tipo];
    const { error } = await supabase
      .from('adn_paso0_respuestas')
      .upsert(
        { sesion_id: sesionId, tesis_numero: num, respuesta_tipo: tipo, puntaje, notas_consultor: notas },
        { onConflict: 'sesion_id,tesis_numero' },
      );
    if (error) { setSaveState('error'); return; }
    flashSaved();
  }

  function seleccionarRespuesta(num: number, tipo: RespuestaTipo) {
    setRespuestas((prev) => {
      const next = { ...prev, [num]: { tipo, notas: prev[num]?.notas ?? '' } };
      guardarRespuesta(num, tipo, next[num].notas);
      return next;
    });
  }

  function cambiarNotas(num: number, notas: string) {
    setRespuestas((prev) => ({ ...prev, [num]: { tipo: prev[num]?.tipo ?? null, notas } }));
    if (notesTimers.current[num]) clearTimeout(notesTimers.current[num]);
    notesTimers.current[num] = setTimeout(() => {
      const tipo = respuestas[num]?.tipo;
      if (!tipo) return; // solo guardar notas si ya hay tipo elegido
      guardarRespuesta(num, tipo, notas);
    }, 900);
  }

  async function generarAgendas(tipo: TipoPiramideCodigo) {
    const supabase = createClient();
    const agendas = AGENDAS_PASO_0[tipo];
    if (!agendas) return;
    const filas = [
      { sesion_id: sesionId, paso: 'paso_0', horizonte: '7_dias', contenido: agendas['7_dias'] },
      { sesion_id: sesionId, paso: 'paso_0', horizonte: '30_dias', contenido: agendas['30_dias'] },
      { sesion_id: sesionId, paso: 'paso_0', horizonte: '90_dias', contenido: agendas['90_dias'] },
    ];
    await supabase.from('adn_agendas').delete().eq('sesion_id', sesionId).eq('paso', 'paso_0');
    await supabase.from('adn_agendas').insert(filas);
  }

  async function completarPaso0() {
    setCompleting(true);
    const supabase = createClient();
    const { error } = await supabase.rpc('adn_completar_paso_0', { p_sesion_id: sesionId });
    if (error) { setCompleting(false); return; }

    const { data: sesionActualizada } = await supabase
      .from('adn_sesiones')
      .select('paso_0_tipo_piramide, paso_0_puntaje')
      .eq('id', sesionId)
      .maybeSingle();

    if (sesionActualizada?.paso_0_tipo_piramide) {
      const tipo = sesionActualizada.paso_0_tipo_piramide as TipoPiramideCodigo;
      await generarAgendas(tipo);
      setTipoPiramide(tipo);
      setPuntajeGuardado(sesionActualizada.paso_0_puntaje ?? null);
    }
    setCompletado(true);
    setCompleting(false);
    flashSaved();
    onCompleted();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  const total = TESIS_PASO_0.length;
  const respondidas = Object.values(respuestas).filter((r) => r.tipo).length;
  const puntaje = Object.values(respuestas).reduce((sum, r) => sum + (r.tipo ? PUNTAJE_RESPUESTA[r.tipo] : 0), 0);
  const rango = RANGOS_PIRAMIDE.find((r) => puntaje >= r.min && puntaje <= r.max);
  const piramidePreview = rango ? PIRAMIDES[rango.codigo] : null;
  const puedeCompletar = respondidas === total && !completado;
  const piramideFinal = completado && tipoPiramide ? PIRAMIDES[tipoPiramide] : null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">ADN · Paso 0</p>
            <h1 className="text-2xl font-bold text-white">Diagnóstico de Pirámide</h1>
          </div>
        </div>
        <SaveIndicator state={saveState} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Columna izquierda — tesis */}
        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-600 transition-all duration-500" style={{ width: `${(respondidas / total) * 100}%` }} />
            </div>
            <span className="whitespace-nowrap text-xs font-semibold text-white/40">{respondidas} / {total}</span>
          </div>

          <div className="flex flex-col gap-4">
            {TESIS_PASO_0.map((tesis) => {
              const saved = respuestas[tesis.numero] ?? { tipo: null, notas: '' };
              return (
                <div
                  key={tesis.numero}
                  className={`rounded-2xl border bg-[#1c1c1e] p-5 transition ${saved.tipo ? 'border-pink-500/30' : 'border-white/[0.08]'}`}
                >
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-pink-400">
                    Tesis {tesis.numero} · {tesis.angulo}
                  </div>
                  <div className="mb-2.5 text-[15px] font-bold text-white">{tesis.titulo}</div>
                  <div className="mb-4 rounded-lg border-l-2 border-pink-500 bg-white/[0.03] p-3 text-[13px] leading-relaxed text-white/60">
                    {tesis.detonante}
                  </div>

                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/30">Notas del consultor</div>
                  <textarea
                    value={saved.notas}
                    onChange={(e) => cambiarNotas(tesis.numero, e.target.value)}
                    placeholder="Escribe aquí tus notas de la conversación…"
                    rows={2}
                    className="mb-3 w-full resize-y rounded-lg border border-white/10 bg-[#141416] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25"
                  />

                  <div className="flex flex-col gap-2">
                    {tesis.respuestas.map((r) => {
                      const selected = saved.tipo === r.tipo;
                      return (
                        <label
                          key={r.tipo}
                          className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition ${
                            selected ? 'border-pink-500/50 bg-pink-500/[0.08]' : 'border-white/10 bg-white/[0.02] hover:border-pink-500/30'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`tesis-${tesis.numero}`}
                            className="hidden"
                            checked={selected}
                            onChange={() => seleccionarRespuesta(tesis.numero, r.tipo)}
                          />
                          <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[11px] font-extrabold ${selected ? 'bg-pink-500 text-white' : 'bg-white/[0.06] text-white/40'}`}>
                            {r.tipo}
                          </span>
                          <span className="pt-0.5 text-[12.5px] leading-relaxed text-white/65">{r.descripcion}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna derecha — panel */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
              <BarChart2 className="h-4 w-4 text-pink-400" /> Puntaje acumulado
            </div>
            <div className="flex flex-col items-center gap-2">
              <ScoreRing puntaje={puntaje} max={80} color={piramidePreview?.color ?? '#ec4899'} />
              <div className="text-sm font-bold text-white">{respondidas === 0 ? '—' : piramidePreview?.nombre ?? 'Calculando…'}</div>
              <div className="text-[11px] text-white/40">{piramidePreview ? `${piramidePreview.rango} puntos` : 'Responde las tesis para calcular'}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
              <Grid3x3 className="h-4 w-4 text-pink-400" /> Mapa de tesis
            </div>
            <div className="grid grid-cols-10 gap-1">
              {TESIS_PASO_0.map((t) => (
                <div key={t.numero} className={`aspect-square rounded ${respuestas[t.numero]?.tipo ? 'bg-pink-500' : 'border border-white/10 bg-white/[0.03]'}`} />
              ))}
            </div>
          </div>

          {piramideFinal && (
            <div className="rounded-2xl border border-pink-500/25 bg-gradient-to-br from-pink-500/[0.08] to-purple-600/[0.08] p-5">
              <div
                className="mb-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
                style={{ background: `${piramideFinal.color}22`, color: piramideFinal.color }}
              >
                {puntajeGuardado ?? ''} puntos · {piramideFinal.rango}
              </div>
              <div className="mb-2 text-base font-extrabold text-white">{piramideFinal.nombre}</div>
              <p className="mb-3 text-[12.5px] leading-relaxed text-white/60">{piramideFinal.descripcion_larga}</p>
              <ul className="mb-3 flex flex-col gap-1.5">
                {piramideFinal.indicadores.map((ind) => (
                  <li key={ind} className="flex gap-1.5 text-xs text-white/45">
                    <span className="text-pink-400">·</span> {ind}
                  </li>
                ))}
              </ul>
              <div className="rounded-lg border-l-2 border-pink-500 bg-white/[0.04] p-3 text-xs leading-relaxed text-white/60">
                {piramideFinal.proximo_paso}
              </div>
            </div>
          )}

          {completado && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                <CalendarCheck className="h-4 w-4 text-pink-400" /> Agenda 7 / 30 / 90
              </div>
              <AgendasForStep sesionId={sesionId} paso="paso_0" />
            </div>
          )}

          {puedeCompletar && (
            <button
              onClick={completarPaso0}
              disabled={completing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {completing ? 'Calculando…' : 'Completar Paso 0'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreRing({ puntaje, max, color }: { puntaje: number; max: number; color: string }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, puntaje / max) : 0;
  const offset = c - pct * c;
  return (
    <div className="relative h-[100px] w-[100px]">
      <svg viewBox="0 0 100 100" width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold text-white">{puntaje}</span>
        <span className="text-[10px] text-white/30">/{max}</span>
      </div>
    </div>
  );
}
