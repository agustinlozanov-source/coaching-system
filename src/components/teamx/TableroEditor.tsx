'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from 'recharts';
import { ArrowLeft, Loader2, Plus, Trash2, Lock } from 'lucide-react';
import {
  Dimension, Escala, EstadoEvaluacion, Evaluacion, Respuestas,
  pctDimension, progresoDimension, promedioGeneral,
} from '@/types/teamx';
import { getEvaluacion, getUltimaEvaluacion, guardarEvaluacion } from '@/lib/teamx/evaluacion';
import { getEmpleadoById } from '@/hooks/useEmpleados';
import { Button } from '@/components/ui/button';
import { SignaturePad } from '@/components/teamx/SignaturePad';

type KpiSeguimiento = { nombre: string; unidad: string; meta: number | ''; logro: number | '' };
type Eficiencia = { meta: number | ''; logro: number | '' };

/** Semáforo de eficiencia (umbrales por defecto; configurables después). */
function semaforo(logro: number): { color: string; label: string } {
  if (logro > 95) return { color: '#16a34a', label: 'Verde' };
  if (logro >= 85) return { color: '#f59e0b', label: 'Amarillo' };
  return { color: '#ef4444', label: 'Rojo' };
}

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
  const [seguimiento, setSeguimiento] = useState<KpiSeguimiento[]>([]);
  const [eficiencia, setEficiencia] = useState<Eficiencia>({ meta: '', logro: '' });
  const [firmas, setFirmas] = useState<Record<string, { data: string; at: string }>>({});
  const [estado, setEstado] = useState<EstadoEvaluacion>('borrador');
  const [selDim, setSelDim] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const extrasTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);

  const readOnly = estado === 'cofirmada' || estado === 'bloqueada';

  useEffect(() => {
    (async () => {
      const e = await getEvaluacion(evaluacionId);
      if (!e) { setStatus('error'); return; }
      setEv(e);
      setRespuestas(e.respuestas ?? {});
      setSeguimiento(Array.isArray(e.seguimiento) ? e.seguimiento : []);
      setEficiencia({ meta: e.eficiencia?.meta ?? '', logro: e.eficiencia?.logro ?? '' });
      setFirmas(e.firmas ?? {});
      setEstado(e.estado);
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

  /* Guardado de seguimiento + eficiencia (debounce) */
  function persistExtras(seg: KpiSeguimiento[], efi: Eficiencia) {
    if (!loaded.current) return;
    setStatus('saving');
    if (extrasTimer.current) clearTimeout(extrasTimer.current);
    extrasTimer.current = setTimeout(async () => {
      try {
        await guardarEvaluacion(evaluacionId, {
          seguimiento: seg,
          eficiencia: { meta: efi.meta === '' ? null : Number(efi.meta), logro: efi.logro === '' ? null : Number(efi.logro) },
        });
        setStatus('saved');
      } catch { setStatus('error'); }
    }, 900);
  }
  function updateSeguimiento(next: KpiSeguimiento[]) { setSeguimiento(next); persistExtras(next, eficiencia); }
  function updateEficiencia(next: Eficiencia) { setEficiencia(next); persistExtras(seguimiento, next); }

  /* Firma y estados (guardado inmediato) */
  async function firmar(rol: 'coach' | 'coachee', dataUrl: string) {
    const nf = { ...firmas, [rol]: { data: dataUrl, at: new Date().toISOString() } };
    setFirmas(nf);
    const nuevoEstado: EstadoEvaluacion = nf.coach && nf.coachee ? 'cofirmada' : 'firmada';
    setEstado(nuevoEstado);
    setStatus('saving');
    try { await guardarEvaluacion(evaluacionId, { firmas: nf, estado: nuevoEstado }); setStatus('saved'); }
    catch { setStatus('error'); }
  }
  async function cambiarEstado(nuevo: EstadoEvaluacion) {
    setEstado(nuevo); setStatus('saving');
    try { await guardarEvaluacion(evaluacionId, { estado: nuevo }); setStatus('saved'); }
    catch { setStatus('error'); }
  }

  function setValor(aspectoId: string, valor: number | null, na = false) {
    if (readOnly) return;
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
    if (readOnly) return;
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
                            <button key={n.key} onClick={() => setValor(a.id, n.valor)} disabled={readOnly}
                              className="rounded-full border px-3 py-1 text-xs font-semibold transition disabled:opacity-60"
                              style={sel ? { backgroundColor: n.color, borderColor: n.color, color: '#fff' } : { color: n.color, borderColor: n.color + '55' }}>
                              {n.label}
                            </button>
                          );
                        })}
                        {escala.permiteNa && (
                          <button onClick={() => setValor(a.id, null, true)} disabled={readOnly}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition disabled:opacity-60 ${r?.na ? 'border-slate-400 bg-slate-200 text-slate-700' : 'border-slate-300 text-slate-500'}`}>
                            N/A
                          </button>
                        )}
                      </div>
                      <input
                        value={r?.nota ?? ''}
                        onChange={(e) => setNota(a.id, e.target.value)}
                        disabled={readOnly}
                        placeholder="Nota: ¿qué observaste?"
                        className="mt-2 w-full rounded-md border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-emerald-500 disabled:opacity-70"
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
          </div>
        </div>
      </div>

      {/* Seguimiento a efectividad */}
      <div className="mt-6 rounded-xl border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold">Seguimiento a efectividad</h3>
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={() => updateSeguimiento([...seguimiento, { nombre: '', unidad: '#', meta: '', logro: '' }])}>
              <Plus className="mr-1.5 h-4 w-4" /> Indicador
            </Button>
          )}
        </div>
        {seguimiento.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">Sin indicadores. Agrega los KPIs tácticos (llamadas, citas, cierres…) con su meta y logro semanal.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground"><tr>
                <th className="p-2 text-left">Indicador</th><th className="w-20 p-2 text-left">Unidad</th>
                <th className="w-24 p-2 text-right">Meta</th><th className="w-24 p-2 text-right">Logro</th>
                <th className="w-20 p-2 text-right">Dif.</th><th className="w-8"></th>
              </tr></thead>
              <tbody>
                {seguimiento.map((k, i) => {
                  const dif = (Number(k.logro) || 0) - (Number(k.meta) || 0);
                  const upd = (patch: Partial<KpiSeguimiento>) => updateSeguimiento(seguimiento.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
                  return (
                    <tr key={i} className="border-t">
                      <td className="p-1.5"><input value={k.nombre} disabled={readOnly} onChange={(e) => upd({ nombre: e.target.value })} placeholder="Ej: Llamadas" className="w-full rounded border px-2 py-1 disabled:opacity-70" /></td>
                      <td className="p-1.5"><input value={k.unidad} disabled={readOnly} onChange={(e) => upd({ unidad: e.target.value })} className="w-16 rounded border px-2 py-1 disabled:opacity-70" /></td>
                      <td className="p-1.5"><input type="number" value={k.meta} disabled={readOnly} onChange={(e) => upd({ meta: e.target.value === '' ? '' : Number(e.target.value) })} className="w-20 rounded border px-2 py-1 text-right disabled:opacity-70" /></td>
                      <td className="p-1.5"><input type="number" value={k.logro} disabled={readOnly} onChange={(e) => upd({ logro: e.target.value === '' ? '' : Number(e.target.value) })} className="w-20 rounded border px-2 py-1 text-right disabled:opacity-70" /></td>
                      <td className={`p-2 text-right font-semibold tabular-nums ${dif > 0 ? 'text-emerald-600' : dif < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{dif > 0 ? `+${dif}` : dif}</td>
                      <td className="p-1.5 text-right">{!readOnly && <button onClick={() => updateSeguimiento(seguimiento.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Eficiencia + semáforo */}
      <div className="mt-6 rounded-xl border bg-card p-5">
        <h3 className="mb-3 text-sm font-bold">Eficiencia</h3>
        <div className="flex flex-wrap items-end gap-6">
          <div><label className="mb-1 block text-xs uppercase text-muted-foreground">Meta %</label><input type="number" value={eficiencia.meta} disabled={readOnly} onChange={(e) => updateEficiencia({ ...eficiencia, meta: e.target.value === '' ? '' : Number(e.target.value) })} className="w-28 rounded border px-2 py-1.5 disabled:opacity-70" /></div>
          <div><label className="mb-1 block text-xs uppercase text-muted-foreground">Logro %</label><input type="number" value={eficiencia.logro} disabled={readOnly} onChange={(e) => updateEficiencia({ ...eficiencia, logro: e.target.value === '' ? '' : Number(e.target.value) })} className="w-28 rounded border px-2 py-1.5 disabled:opacity-70" /></div>
          {eficiencia.logro !== '' && (() => { const s = semaforo(Number(eficiencia.logro)); return (
            <div className="flex items-center gap-2"><span className="h-6 w-6 rounded-full" style={{ backgroundColor: s.color }} /><span className="font-semibold" style={{ color: s.color }}>{s.label}</span></div>
          ); })()}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">El acumulado del ciclo y el tablero de gladiadores llegan con la vista de equipo.</p>
      </div>

      {/* Firmas */}
      <div className="mt-6 rounded-xl border bg-card p-5">
        <h3 className="mb-1 text-sm font-bold">Firmas</h3>
        <p className="mb-4 text-xs text-muted-foreground">Ambas firmas completan la evaluación. Una vez co-firmada, queda bloqueada.</p>
        <div className="grid gap-6 sm:grid-cols-2">
          <SignaturePad label="Coach" value={firmas.coach?.data} firmadoEn={firmas.coach?.at} readOnly={readOnly} onSign={(d) => firmar('coach', d)} />
          <SignaturePad label="Coachee" value={firmas.coachee?.data} firmadoEn={firmas.coachee?.at} readOnly={readOnly} onSign={(d) => firmar('coachee', d)} />
        </div>
        {readOnly && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            <Lock className="h-4 w-4" /> Evaluación co-firmada y bloqueada. Si hay un error, crea una nueva evaluación.
          </div>
        )}
      </div>
    </div>
  );
}
