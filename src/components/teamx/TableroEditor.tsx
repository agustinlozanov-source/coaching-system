'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from 'recharts';
import { ArrowLeft, Check, Loader2, CircleDot } from 'lucide-react';
import {
  Dimension, Escala, Evaluacion, Respuestas,
  pctDimension, progresoDimension, promedioGeneral,
} from '@/types/teamx';
import { getEvaluacion, getUltimaEvaluacion, guardarEvaluacion } from '@/lib/teamx/evaluacion';
import { getEmpleadoById } from '@/hooks/useEmpleados';
import { Button } from '@/components/ui/button';

type Status = 'idle' | 'saving' | 'saved' | 'error';

/** % por dimensión de una evaluación previa, para comparar. */
function pctPorDimAnterior(ev: Evaluacion | null): Record<string, number> {
  if (!ev) return {};
  const out: Record<string, number> = {};
  for (const d of ev.configSnapshot.dimensiones ?? []) {
    const p = pctDimension(d, ev.respuestas);
    if (p !== null) out[d.id] = p;
  }
  return out;
}

export function TableroEditor({ evaluacionId }: { evaluacionId: string }) {
  const router = useRouter();
  const [ev, setEv] = useState<Evaluacion | null>(null);
  const [empleado, setEmpleado] = useState<{ nombre: string; cargo?: string } | null>(null);
  const [anteriorPct, setAnteriorPct] = useState<Record<string, number>>({});
  const [anteriorResp, setAnteriorResp] = useState<Respuestas>({});
  const [respuestas, setRespuestas] = useState<Respuestas>({});
  const [selDim, setSelDim] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      const e = await getEvaluacion(evaluacionId);
      if (!e) { setStatus('error'); return; }
      setEv(e);
      setRespuestas(e.respuestas ?? {});
      const comp = (e.configSnapshot.dimensiones ?? []).filter((d) => d.naturaleza === 'competencia');
      setSelDim(comp[0]?.id ?? null);
      const [emp, anterior] = await Promise.all([
        getEmpleadoById(e.empleadoId).catch(() => null),
        e.evalAnteriorId ? getUltimaEvaluacion(e.empleadoId, e.id) : Promise.resolve(null),
      ]);
      if (emp) setEmpleado({ nombre: emp.nombre, cargo: emp.cargo });
      setAnteriorPct(pctPorDimAnterior(anterior));
      setAnteriorResp(anterior?.respuestas ?? {});
      loaded.current = true;
      setStatus('saved');
    })();
  }, [evaluacionId]);

  const dims = ev?.configSnapshot.dimensiones ?? [];
  const escala: Escala | undefined = ev?.configSnapshot.escala;
  const competencias = useMemo(() => dims.filter((d) => d.naturaleza === 'competencia'), [dims]);

  const resumen = useMemo(() => {
    const out: Record<string, { pct: number; anterior: number | null; cambio: number | null }> = {};
    for (const d of competencias) {
      const pct = pctDimension(d, respuestas);
      const ant = anteriorPct[d.id] ?? null;
      out[d.id] = { pct: pct ?? 0, anterior: ant, cambio: pct !== null && ant !== null ? pct - ant : null };
    }
    return out;
  }, [competencias, respuestas, anteriorPct]);

  const general = useMemo(() => promedioGeneral(dims, respuestas), [dims, respuestas]);

  const radarData = useMemo(
    () => competencias.map((d) => ({ dim: d.nombre.length > 14 ? d.nombre.slice(0, 13) + '…' : d.nombre, pct: pctDimension(d, respuestas) ?? 0 })),
    [competencias, respuestas],
  );

  /* Autosave */
  const scheduleSave = useCallback((next: Respuestas) => {
    if (!loaded.current) return;
    setStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const res: Record<string, any> = {};
        for (const d of competencias) {
          const pct = pctDimension(d, next);
          res[d.id] = { pct: pct ?? 0, anterior: anteriorPct[d.id] ?? null };
        }
        await guardarEvaluacion(evaluacionId, { respuestas: next, resumen: res, promedioGeneral: promedioGeneral(dims, next) });
        setStatus('saved');
      } catch { setStatus('error'); }
    }, 900);
  }, [competencias, dims, anteriorPct, evaluacionId]);

  function setValor(aspectoId: string, valor: number | null, na = false) {
    setRespuestas((prev) => {
      const cur = prev[aspectoId];
      // toggle off si vuelve a hacer clic en el mismo
      const same = na ? cur?.na : cur?.valor === valor && !cur?.na;
      const next = { ...prev, [aspectoId]: same ? { valor: null, na: false, nota: cur?.nota } : { valor: na ? null : valor, na, nota: cur?.nota } };
      scheduleSave(next);
      return next;
    });
  }
  function setNota(aspectoId: string, nota: string) {
    setRespuestas((prev) => {
      const next = { ...prev, [aspectoId]: { ...(prev[aspectoId] ?? { valor: null }), nota } };
      scheduleSave(next);
      return next;
    });
  }

  if (status === 'error' && !ev) {
    return <div className="py-16 text-center text-muted-foreground">No se pudo cargar la evaluación.</div>;
  }
  if (!ev || !escala) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const dim = competencias.find((d) => d.id === selDim) ?? competencias[0];
  const statusText: Record<Status, string> = { idle: '', saving: 'Guardando…', saved: 'Guardado', error: 'Error al guardar' };

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/evaluaciones')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Tablero de evaluación · Semana {ev.semana ?? '—'}</p>
            <h1 className="text-2xl font-bold">{empleado?.nombre ?? 'Evaluación'}</h1>
            <p className="text-sm text-muted-foreground">{empleado?.cargo || '—'} · {ev.fecha}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-3xl font-extrabold tabular-nums">{general ?? 0}%</div>
            <div className="text-xs uppercase text-muted-foreground">General</div>
          </div>
          <span className={`flex items-center gap-1.5 text-sm ${status === 'error' ? 'text-red-600' : status === 'saving' ? 'text-amber-600' : 'text-emerald-600'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status === 'error' ? 'bg-red-500' : status === 'saving' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            {statusText[status]}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Sidebar dimensiones + radar */}
        <div className="space-y-4">
          <div className="space-y-1 rounded-xl border bg-card p-2">
            {competencias.map((d) => {
              const pct = pctDimension(d, respuestas);
              const prog = progresoDimension(d, respuestas);
              const active = d.id === dim?.id;
              return (
                <button key={d.id} onClick={() => setSelDim(d.id)}
                  className={`w-full rounded-lg p-3 text-left transition ${active ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{d.nombre}</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: d.color }}>{pct ?? 0}%</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${pct ?? 0}%`, backgroundColor: d.color }} />
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{prog.done}/{prog.total} aspectos</div>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border bg-card p-3">
            <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Perfil (radar)</div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid />
                <PolarAngleAxis dataKey="dim" tick={{ fontSize: 10 }} />
                <Radar dataKey="pct" stroke="#1aab99" fill="#1aab99" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Contenido: aspectos de la dimensión */}
        <div>
          {dim && (
            <div className="rounded-xl border bg-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: dim.color }} />
                <h2 className="text-lg font-bold">{dim.nombre}</h2>
                <span className="ml-auto text-sm font-bold" style={{ color: dim.color }}>{pctDimension(dim, respuestas) ?? 0}%</span>
              </div>

              <div className="space-y-3">
                {dim.aspectos.map((a) => {
                  const r = respuestas[a.id];
                  const antR = anteriorResp[a.id];
                  const cambio = r && !r.na && r.valor !== null && antR && !antR.na && antR.valor !== null
                    ? (r.valor > antR.valor ? 'up' : r.valor < antR.valor ? 'down' : 'same')
                    : (r && (r.na || r.valor !== null) && !antR ? 'nuevo' : null);
                  return (
                    <div key={a.id} className="rounded-lg border p-3">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">{a.nombre}</span>
                        {cambio && (
                          <span className={`flex-shrink-0 text-xs font-bold ${cambio === 'up' ? 'text-emerald-600' : cambio === 'down' ? 'text-red-600' : cambio === 'nuevo' ? 'text-blue-600' : 'text-muted-foreground'}`}>
                            {cambio === 'up' ? '↑' : cambio === 'down' ? '↓' : cambio === 'nuevo' ? '● nuevo' : '→'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {escala.niveles.map((n) => {
                          const sel = r && !r.na && r.valor === n.valor;
                          return (
                            <button key={n.key} onClick={() => setValor(a.id, n.valor)}
                              className="rounded-full border px-3 py-1 text-xs font-semibold transition"
                              style={sel ? { backgroundColor: n.color, borderColor: n.color, color: '#fff' } : { color: n.color, borderColor: n.color + '55' }}>
                              {n.label}
                            </button>
                          );
                        })}
                        {escala.permiteNa && (
                          <button onClick={() => setValor(a.id, null, true)}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${r?.na ? 'border-slate-400 bg-slate-200 text-slate-700' : 'border-slate-300 text-slate-500'}`}>
                            N/A
                          </button>
                        )}
                      </div>
                      <input
                        value={r?.nota ?? ''}
                        onChange={(e) => setNota(a.id, e.target.value)}
                        placeholder="Nota: ¿qué observaste?"
                        className="mt-2 w-full rounded-md border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-emerald-500"
                      />
                    </div>
                  );
                })}
                {dim.aspectos.length === 0 && (
                  <div className="py-6 text-center text-sm text-muted-foreground">Esta dimensión no tiene aspectos configurados.</div>
                )}
              </div>
            </div>
          )}

          {/* Resumen */}
          <div className="mt-6 rounded-xl border bg-card p-5">
            <h3 className="mb-3 text-sm font-bold">Resumen por dimensión</h3>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr><th className="p-2.5 text-left">Dimensión</th><th className="p-2.5 text-right">%</th><th className="p-2.5 text-right">Anterior</th><th className="p-2.5 text-right">Cambio</th></tr>
                </thead>
                <tbody>
                  {competencias.map((d) => {
                    const r = resumen[d.id];
                    return (
                      <tr key={d.id} className="border-t">
                        <td className="p-2.5 font-medium">{d.nombre}</td>
                        <td className="p-2.5 text-right font-bold tabular-nums">{r.pct}%</td>
                        <td className="p-2.5 text-right tabular-nums text-muted-foreground">{r.anterior ?? '—'}%</td>
                        <td className={`p-2.5 text-right font-semibold tabular-nums ${r.cambio == null ? 'text-muted-foreground' : r.cambio > 0 ? 'text-emerald-600' : r.cambio < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {r.cambio == null ? '—' : r.cambio > 0 ? `↑ +${r.cambio}` : r.cambio < 0 ? `↓ ${r.cambio}` : '→ 0'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CircleDot className="h-3.5 w-3.5" />
              Seguimiento a efectividad, eficiencia y firmas llegan en la siguiente fase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
