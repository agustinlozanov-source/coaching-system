'use client';

// PersonalidadView.tsx — SCALEx · ADN · Paso 1 · Perfil de Personalidad Empresarial
// Tablas: adn_paso1_respuestas, adn_sesiones (paso_1_*), adn_agendas
// RPC: adn_completar_paso_1

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Sparkles, Loader2, CheckCircle2, CalendarCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Sesion } from './AdnApp';
import {
  PREGUNTAS_PASO_1, RASGOS, DIMENSIONES, RASGO_COLORES, NOMBRES_RASGO, HIBRIDOS,
  obtenerHibrido, Rasgo, RespuestaTipo,
} from './catalog';
import { AgendasForStep } from './AgendasPanel';
import { SaveIndicator, SaveState } from './SaveIndicator';

type RespuestaLocal = { tipo: RespuestaTipo | null; notas: string; pesos: Partial<Record<Rasgo, number>> };

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function PersonalidadView({
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
  const [completado, setCompletado] = useState(sesion.paso_1_estado === 'completado');
  const [nombreHibrido, setNombreHibrido] = useState<string | null>(sesion.paso_1_nombre_hibrido ?? null);
  const [completing, setCompleting] = useState(false);

  const notesTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const paso0Completado = sesion.paso_0_estado === 'completado';

  useEffect(() => {
    if (!paso0Completado) { setLoading(false); return; }
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('adn_paso1_respuestas')
        .select('pregunta_numero, respuesta_tipo, pesos_rasgos, notas_consultor')
        .eq('sesion_id', sesionId);

      const map: Record<number, RespuestaLocal> = {};
      (data ?? []).forEach((r: any) => {
        map[r.pregunta_numero] = { tipo: r.respuesta_tipo, notas: r.notas_consultor || '', pesos: r.pesos_rasgos || {} };
      });
      setRespuestas(map);
      setLoading(false);
    })();
  }, [sesionId, paso0Completado]);

  function flashSaved() {
    setSaveState('saved');
    setTimeout(() => setSaveState('idle'), 2500);
  }

  async function guardarRespuesta(num: number, tipo: RespuestaTipo, pesos: Partial<Record<Rasgo, number>>, notas: string) {
    setSaveState('saving');
    const supabase = createClient();
    const pregunta = PREGUNTAS_PASO_1.find((p) => p.numero === num);
    const { error } = await supabase
      .from('adn_paso1_respuestas')
      .upsert(
        {
          sesion_id: sesionId,
          pregunta_numero: num,
          dimension: pregunta?.dimension || '',
          respuesta_tipo: tipo,
          pesos_rasgos: pesos,
          notas_consultor: notas,
        },
        { onConflict: 'sesion_id,pregunta_numero' },
      );
    if (error) { setSaveState('error'); return; }
    flashSaved();
  }

  function seleccionarRespuesta(num: number, tipo: RespuestaTipo, pesos: Partial<Record<Rasgo, number>>) {
    setRespuestas((prev) => {
      const next = { ...prev, [num]: { tipo, pesos, notas: prev[num]?.notas ?? '' } };
      guardarRespuesta(num, tipo, pesos, next[num].notas);
      return next;
    });
  }

  function cambiarNotas(num: number, notas: string) {
    setRespuestas((prev) => ({ ...prev, [num]: { tipo: prev[num]?.tipo ?? null, pesos: prev[num]?.pesos ?? {}, notas } }));
    if (notesTimers.current[num]) clearTimeout(notesTimers.current[num]);
    notesTimers.current[num] = setTimeout(() => {
      const actual = respuestas[num];
      if (!actual?.tipo) return;
      guardarRespuesta(num, actual.tipo, actual.pesos, notas);
    }, 900);
  }

  function calcularMix(): Record<string, number> {
    const totales: Record<string, number> = {};
    RASGOS.forEach((r) => { totales[r] = 0; });
    Object.values(respuestas).forEach((resp) => {
      if (!resp.tipo || !resp.pesos) return;
      Object.entries(resp.pesos).forEach(([rasgo, peso]) => {
        if (totales[rasgo] !== undefined) totales[rasgo] += peso as number;
      });
    });
    const suma = Object.values(totales).reduce((a, b) => a + b, 0);
    if (suma === 0) return RASGOS.reduce((obj, r) => { obj[r] = 0; return obj; }, {} as Record<string, number>);
    const mix: Record<string, number> = {};
    RASGOS.forEach((r) => { mix[r] = Math.round((totales[r] / suma) * 100); });
    return mix;
  }

  async function generarAgendas(hibridoNombre: string, rasgosAExplorar: string[]) {
    const supabase = createClient();
    const contenido7 = `Comparte el resultado del Perfil de Personalidad (${hibridoNombre}) con el equipo directivo. Reacción y resonancia.`;
    const contenido30 = `Identifica 1-2 iniciativas concretas que activen los rasgos a explorar: ${rasgosAExplorar.slice(0, 2).join(' / ')}`;
    const contenido90 = 'Revisión: ¿cómo ha evolucionado el perfil? ¿Qué rasgos se han fortalecido o debilitado? Conectar con el Mapa ADN del Paso 2.';
    const filas = [
      { sesion_id: sesionId, paso: 'paso_1', horizonte: '7_dias', contenido: contenido7 },
      { sesion_id: sesionId, paso: 'paso_1', horizonte: '30_dias', contenido: contenido30 },
      { sesion_id: sesionId, paso: 'paso_1', horizonte: '90_dias', contenido: contenido90 },
    ];
    await supabase.from('adn_agendas').delete().eq('sesion_id', sesionId).eq('paso', 'paso_1');
    await supabase.from('adn_agendas').insert(filas);
  }

  async function completarPaso1() {
    const mix = calcularMix();
    const resultado = obtenerHibrido(mix);
    if (!resultado.hibrido) return;

    setCompleting(true);
    const supabase = createClient();
    const { error } = await supabase.rpc('adn_completar_paso_1', {
      p_sesion_id: sesionId,
      p_nombre_hibrido: resultado.hibrido.nombre,
    });
    if (error) { setCompleting(false); return; }

    await generarAgendas(resultado.hibrido.nombre, resultado.hibrido.rasgos_a_explorar);
    setNombreHibrido(resultado.hibrido.nombre);
    setCompletado(true);
    setCompleting(false);
    flashSaved();
    onCompleted();
  }

  if (!paso0Completado) {
    return (
      <div>
        <div className="mb-6 flex items-center gap-3">
          <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition hover:bg-white/[0.06] hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">ADN · Paso 1</p>
            <h1 className="text-2xl font-bold text-white">Perfil de Personalidad</h1>
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-10 text-center text-white/50">
          Completa primero el Paso 0 · Diagnóstico de Pirámide.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  const total = PREGUNTAS_PASO_1.length;
  const respondidas = Object.values(respuestas).filter((r) => r.tipo).length;
  const mix = calcularMix();
  const ordenados = RASGOS.slice().sort((a, b) => (mix[b] || 0) - (mix[a] || 0));
  const preview = respondidas >= 5 ? obtenerHibrido(mix) : null;
  const puedeCompletar = respondidas === total && !completado;

  const hibridoFinal = completado && nombreHibrido
    ? Object.values(HIBRIDOS).find((h) => h.nombre === nombreHibrido) ?? null
    : null;
  const hibridoFinalEntry = completado ? obtenerHibrido(mix) : null;

  let ultimaDim: string | null = null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition hover:bg-white/[0.06] hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">ADN · Paso 1</p>
            <h1 className="text-2xl font-bold text-white">Perfil de Personalidad</h1>
          </div>
        </div>
        <SaveIndicator state={saveState} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Columna izquierda — preguntas */}
        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-600 transition-all duration-500" style={{ width: `${(respondidas / total) * 100}%` }} />
            </div>
            <span className="whitespace-nowrap text-xs font-semibold text-white/40">{respondidas} / {total}</span>
          </div>

          <div className="flex flex-col gap-4">
            {PREGUNTAS_PASO_1.map((pregunta) => {
              const showDim = pregunta.dimension !== ultimaDim;
              ultimaDim = pregunta.dimension;
              const saved = respuestas[pregunta.numero] ?? { tipo: null, notas: '', pesos: {} };
              return (
                <div key={pregunta.numero}>
                  {showDim && (
                    <div className="mb-2 mt-2 text-[11px] font-bold uppercase tracking-wide text-white/30">
                      {DIMENSIONES[pregunta.dimension] || pregunta.dimension}
                    </div>
                  )}
                  <div
                    className={`rounded-2xl border bg-[#1c1c1e] p-5 transition ${saved.tipo ? 'border-purple-500/30' : 'border-white/[0.08]'}`}
                  >
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-purple-400">Pregunta {pregunta.numero}</div>
                    <div className="mb-2.5 text-[15px] font-bold text-white">{pregunta.titulo}</div>
                    <div className="mb-4 rounded-lg border-l-2 border-purple-500 bg-white/[0.03] p-3 text-[13px] leading-relaxed text-white/60">
                      {pregunta.detonante}
                    </div>

                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/30">Notas del consultor</div>
                    <textarea
                      value={saved.notas}
                      onChange={(e) => cambiarNotas(pregunta.numero, e.target.value)}
                      placeholder="Anota lo relevante de la respuesta…"
                      rows={2}
                      className="mb-3 w-full resize-y rounded-lg border border-white/10 bg-[#141416] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25"
                    />

                    <div className="flex flex-col gap-2">
                      {pregunta.respuestas.map((r) => {
                        const selected = saved.tipo === r.tipo;
                        return (
                          <label
                            key={r.tipo}
                            className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition ${
                              selected ? 'border-purple-500/50 bg-purple-500/[0.08]' : 'border-white/10 bg-white/[0.02] hover:border-purple-500/30'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`pregunta-${pregunta.numero}`}
                              className="hidden"
                              checked={selected}
                              onChange={() => seleccionarRespuesta(pregunta.numero, r.tipo, r.pesos)}
                            />
                            <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[11px] font-extrabold ${selected ? 'bg-purple-500 text-white' : 'bg-white/[0.06] text-white/40'}`}>
                              {r.tipo}
                            </span>
                            <span className="pt-0.5 text-[12.5px] leading-relaxed text-white/65">{r.descripcion}</span>
                          </label>
                        );
                      })}
                    </div>
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
              <Sparkles className="h-4 w-4 text-purple-400" /> Mix de rasgos
            </div>
            {respondidas === 0 ? (
              <div className="py-2 text-center text-xs text-white/30">Responde preguntas para ver el mix</div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {ordenados.map((rasgo) => {
                  const pct = mix[rasgo] || 0;
                  const color = RASGO_COLORES[rasgo];
                  return (
                    <div key={rasgo}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-white/60">{NOMBRES_RASGO[rasgo]}</span>
                        <span className="font-bold" style={{ color }}>{pct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {preview?.hibrido && !completado && (
            <div className="rounded-2xl border border-purple-500/25 bg-purple-500/[0.06] p-4 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-white/30">Vista previa del híbrido</div>
              <div className="mt-1 text-base font-extrabold text-white">{preview.hibrido.nombre}</div>
              <div className="mt-0.5 text-xs text-white/40">{capitalize(preview.rasgos_dominantes[0])} + {capitalize(preview.rasgos_dominantes[1])}</div>
            </div>
          )}

          {completado && hibridoFinal && hibridoFinalEntry && (
            <div className="rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-500/[0.08] to-pink-500/[0.06] p-5">
              <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 px-2.5 py-1 text-xs font-bold text-purple-300">
                <Sparkles className="h-3 w-3" />
                {capitalize(hibridoFinalEntry.rasgos_dominantes[0] || '')} + {capitalize(hibridoFinalEntry.rasgos_dominantes[1] || '')}
              </div>
              <div className="mb-2 text-base font-extrabold text-white">{hibridoFinal.nombre}</div>
              <p className="mb-3 text-[12.5px] leading-relaxed text-white/60">{hibridoFinal.esencia}</p>
              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-white/[0.04] p-3">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-white/30">Fortaleza</div>
                  <div className="text-xs leading-relaxed text-white/60">{hibridoFinal.fortaleza}</div>
                </div>
                <div className="rounded-lg bg-white/[0.04] p-3">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-white/30">Tensión natural</div>
                  <div className="text-xs leading-relaxed text-white/60">{hibridoFinal.debilidad}</div>
                </div>
              </div>
              <div className="text-xs text-white/60">
                <strong className="text-white/80">Rasgos a explorar:</strong>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {hibridoFinal.rasgos_a_explorar.map((r) => (
                    <li key={r} className="flex gap-1.5"><span className="text-purple-400">·</span> {r}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {completado && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                <CalendarCheck className="h-4 w-4 text-purple-400" /> Agenda 7 / 30 / 90
              </div>
              <AgendasForStep sesionId={sesionId} paso="paso_1" />
            </div>
          )}

          {puedeCompletar && (
            <button
              onClick={completarPaso1}
              disabled={completing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {completing ? 'Calculando…' : 'Completar Paso 1'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
