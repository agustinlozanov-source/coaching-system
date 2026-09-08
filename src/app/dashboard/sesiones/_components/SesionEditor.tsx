'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Plus, Trash2, ListChecks, AlertCircle, LayoutDashboard, History,
} from 'lucide-react';
import {
  getSesion, guardarSesion, listTareas, crearTarea, actualizarTarea, eliminarTarea, NOTAS_VACIAS,
  type Sesion, type NotasSesion, type EstadoSesion, type Tarea, type EstadoTarea,
} from '@/lib/teamx/sesiones';
import { getEvaluacion, getUltimaEvaluacion } from '@/lib/teamx/evaluacion';
import {
  Dimension, Escala, Evaluacion, pctDimension, promedioGeneral,
} from '@/types/teamx';
import { getEmpleadoById } from '@/hooks/useEmpleados';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { SesionTimer } from './SesionTimer';

type Status = 'idle' | 'saving' | 'saved' | 'error';
type GuardarPatch = Parameters<typeof guardarSesion>[1];

const ESTADO_LABEL: Record<EstadoSesion, string> = {
  programada: 'Programada', en_curso: 'En curso', completada: 'Completada', cancelada: 'Cancelada',
};
const ESTADO_BADGE: Record<EstadoSesion, 'secondary' | 'info' | 'success' | 'muted'> = {
  programada: 'secondary', en_curso: 'info', completada: 'success', cancelada: 'muted',
};
const TAREA_LABEL: Record<EstadoTarea, string> = {
  pendiente: 'Pendiente', en_progreso: 'En progreso', completada: 'Completada',
};
const SIN_DIM = '__sin__';

const NOTAS_CAMPOS: { key: keyof NotasSesion; label: string; placeholder: string }[] = [
  { key: 'revision', label: 'Revisión', placeholder: '¿Qué se revisó de la sesión anterior?' },
  { key: 'observaciones', label: 'Observaciones', placeholder: 'Observaciones del coach durante la sesión.' },
  { key: 'proximosPasos', label: 'Próximos pasos', placeholder: '¿Qué sigue antes de la próxima sesión?' },
  { key: 'reflexionCoachee', label: 'Reflexión del coachee', placeholder: 'En palabras del coachee.' },
];

function semaforoEfi(logro: number): { color: string; label: string } {
  if (logro > 95) return { color: '#16a34a', label: 'Verde' };
  if (logro >= 85) return { color: '#f59e0b', label: 'Amarillo' };
  return { color: '#ef4444', label: 'Rojo' };
}

/** Nivel de escala (label + color) de una respuesta. */
function nivelDe(escala: Escala | undefined, r?: { valor: number | null; na?: boolean }): { label: string; color: string } {
  if (!r || r.na) return { label: 'N/A', color: '#94a3b8' };
  if (r.valor === null || r.valor === undefined) return { label: 'Sin evaluar', color: '#cbd5e1' };
  const n = escala?.niveles.find((x) => x.valor === r.valor);
  return n ? { label: n.label, color: n.color } : { label: String(r.valor), color: '#64748b' };
}

export function SesionEditor({ sesionId }: { sesionId: string }) {
  const { toast } = useToast();

  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [empleado, setEmpleado] = useState<{ nombre: string; cargo?: string } | null>(null);
  const [prevEval, setPrevEval] = useState<Evaluacion | null>(null);
  const [evalDims, setEvalDims] = useState<Dimension[]>([]);
  const [escala, setEscala] = useState<Escala | undefined>(undefined);
  const [panelDim, setPanelDim] = useState<string>('');

  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [status, setStatus] = useState<Status>('idle');

  const [fecha, setFecha] = useState('');
  const [estado, setEstado] = useState<EstadoSesion>('programada');
  const [duracionInicialSec, setDuracionInicialSec] = useState(0);
  const [notas, setNotas] = useState<NotasSesion>(NOTAS_VACIAS);

  const [nuevaTarea, setNuevaTarea] = useState('');
  const [nuevaDim, setNuevaDim] = useState<string>(SIN_DIM);
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [creando, setCreando] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      const s = await getSesion(sesionId);
      if (!s) { setNotFound(true); setLoading(false); return; }
      setSesion(s);
      setFecha(s.fecha);
      setEstado(s.estado);
      setNotas(s.notas);
      setDuracionInicialSec((s.duracionMin ?? 0) * 60);

      const [emp, ev, tareasEmp] = await Promise.all([
        getEmpleadoById(s.empleadoId).catch(() => null),
        (s.evaluacionId ? getEvaluacion(s.evaluacionId) : getUltimaEvaluacion(s.empleadoId)).catch(() => null),
        listTareas({ empleadoId: s.empleadoId }).catch(() => []),
      ]);
      if (emp) setEmpleado({ nombre: emp.nombre, cargo: emp.cargo });
      if (ev) {
        setPrevEval(ev);
        const comp = (ev.configSnapshot?.dimensiones ?? []).filter((d) => d.naturaleza === 'competencia');
        setEvalDims(comp);
        setEscala(ev.configSnapshot?.escala);
        setPanelDim(comp[0]?.id ?? '');
      }
      setTareas(tareasEmp);
      loaded.current = true;
      setLoading(false);
      setStatus('saved');
    })();
  }, [sesionId]);

  const persist = useCallback((patch: GuardarPatch) => {
    if (!loaded.current) return;
    setStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { await guardarSesion(sesionId, patch); setStatus('saved'); } catch { setStatus('error'); }
    }, 900);
  }, [sesionId]);

  const persistNow = useCallback(async (patch: GuardarPatch) => {
    if (!loaded.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setStatus('saving');
    try { await guardarSesion(sesionId, patch); setStatus('saved'); } catch { setStatus('error'); }
  }, [sesionId]);

  function editarNota(key: keyof NotasSesion, value: string) {
    const next = { ...notas, [key]: value };
    setNotas(next);
    persist({ notas: next });
  }
  async function cambiarEstadoSesion(nuevo: EstadoSesion) { setEstado(nuevo); await persistNow({ estado: nuevo }); }
  function cambiarFecha(v: string) { setFecha(v); persist({ fecha: v }); }
  const onPersistDuracion = useCallback((elapsedSec: number) => { persist({ duracionMin: Math.round(elapsedSec / 60) }); }, [persist]);

  /* ── Agenda y acuerdos = tareas anidadas a dimensión ─────────────────── */
  async function agregarTarea() {
    const desc = nuevaTarea.trim();
    if (!desc || !sesion) return;
    setCreando(true);
    try {
      const dimId = nuevaDim === SIN_DIM ? null : nuevaDim;
      const id = await crearTarea({
        empleadoId: sesion.empleadoId, sesionId: sesion.id, evaluacionId: sesion.evaluacionId,
        dimensionId: dimId, descripcion: desc, fechaLimite: nuevaFecha || null,
      });
      setTareas((prev) => [{
        id, organizacionId: sesion.organizacionId, empleadoId: sesion.empleadoId,
        evaluacionId: sesion.evaluacionId, sesionId: sesion.id, dimensionId: dimId, aspectoId: null,
        descripcion: desc, responsable: null, fechaLimite: nuevaFecha || null, estado: 'pendiente',
      }, ...prev]);
      setNuevaTarea(''); setNuevaFecha(''); setNuevaDim(SIN_DIM);
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear el compromiso.', variant: 'destructive' });
    } finally { setCreando(false); }
  }
  function patchTareaLocal(id: string, patch: Partial<Tarea>) {
    setTareas((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }
  async function guardarTarea(id: string, patch: Parameters<typeof actualizarTarea>[1]) {
    try { await actualizarTarea(id, patch); } catch { toast({ title: 'Error', description: 'No se pudo actualizar.', variant: 'destructive' }); }
  }
  async function quitarTarea(id: string) {
    setTareas((prev) => prev.filter((t) => t.id !== id));
    try { await eliminarTarea(id); } catch { /* noop */ }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (notFound || !sesion) {
    return (
      <Card><CardContent className="flex flex-col items-center py-16 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <h3 className="mt-3 font-bold">No se encontró la sesión</h3>
        <Link href="/dashboard/sesiones" className="mt-4"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Volver a sesiones</Button></Link>
      </CardContent></Card>
    );
  }

  const dimNombre = (id: string | null) => (id ? evalDims.find((d) => d.id === id)?.nombre : null);
  const tareasSesion = tareas.filter((t) => t.sesionId === sesion.id);
  const arrastradas = tareas.filter((t) => t.sesionId !== sesion.id && t.estado !== 'completada');
  const panel = evalDims.find((d) => d.id === panelDim);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/sesiones" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" /> Sesiones
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{empleado?.nombre ?? 'Sesión de coaching'}</h1>
          <p className="text-muted-foreground">{empleado?.cargo || 'Sesión de coaching'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {status === 'saving' && <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Guardando…</span>}
            {status === 'saved' && 'Guardado'}
            {status === 'error' && <span className="text-destructive">Error al guardar</span>}
          </span>
          <Badge variant={ESTADO_BADGE[estado]}>{ESTADO_LABEL[estado]}</Badge>
          <Select value={estado} onValueChange={(v) => cambiarEstadoSesion(v as EstadoSesion)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="programada">Programada</SelectItem>
              <SelectItem value="en_curso">En curso</SelectItem>
              <SelectItem value="completada">Completada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Fecha + timer */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-6 py-5">
          <div>
            <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Fecha</Label>
            <Input type="date" value={fecha} onChange={(e) => cambiarFecha(e.target.value)} className="w-44" />
          </div>
          <SesionTimer initialElapsedSec={duracionInicialSec} disabled={estado === 'cancelada'} onPersist={onPersistDuracion} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ── Columna sesión ── */}
        <div className="space-y-6">
          {/* Agenda y acuerdos (tareas anidadas a dimensión) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base"><ListChecks className="h-4 w-4 text-emerald-600" /> Agenda y acuerdos</CardTitle>
              <span className="text-xs text-muted-foreground">{tareasSesion.length} compromiso{tareasSesion.length !== 1 ? 's' : ''}</span>
            </CardHeader>
            <CardContent className="space-y-3">
              {tareasSesion.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Sin compromisos. Agrega uno abajo, anclado a una dimensión.</p>
              ) : (
                <div className="space-y-2">
                  {tareasSesion.map((t) => (
                    <div key={t.id} className="rounded-lg border p-2.5">
                      <div className="flex items-center gap-2">
                        <Select value={t.dimensionId ?? SIN_DIM} onValueChange={(v) => { const dv = v === SIN_DIM ? null : v; patchTareaLocal(t.id, { dimensionId: dv }); guardarTarea(t.id, { dimensionId: dv }); }}>
                          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Dimensión" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SIN_DIM}>Sin dimensión</SelectItem>
                            {evalDims.map((d) => <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={t.estado} onValueChange={(v) => { patchTareaLocal(t.id, { estado: v as EstadoTarea }); guardarTarea(t.id, { estado: v as EstadoTarea }); }}>
                          <SelectTrigger className="ml-auto h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendiente">{TAREA_LABEL.pendiente}</SelectItem>
                            <SelectItem value="en_progreso">{TAREA_LABEL.en_progreso}</SelectItem>
                            <SelectItem value="completada">{TAREA_LABEL.completada}</SelectItem>
                          </SelectContent>
                        </Select>
                        <button onClick={() => quitarTarea(t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <input
                        value={t.descripcion}
                        onChange={(e) => patchTareaLocal(t.id, { descripcion: e.target.value })}
                        onBlur={(e) => guardarTarea(t.id, { descripcion: e.target.value })}
                        className="mt-2 w-full rounded-md border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500"
                        placeholder="Tarea / compromiso…"
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Fecha compromiso:</span>
                        <input type="date" value={t.fechaLimite ?? ''} onChange={(e) => { patchTareaLocal(t.id, { fechaLimite: e.target.value || null }); guardarTarea(t.id, { fechaLimite: e.target.value || null }); }}
                          className="rounded-md border bg-background px-2 py-1 text-xs outline-none focus:border-emerald-500" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Nuevo compromiso */}
              <div className="grid gap-2 border-t pt-3 sm:grid-cols-[180px_1fr_auto]">
                <Select value={nuevaDim} onValueChange={setNuevaDim}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Dimensión" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_DIM}>Sin dimensión</SelectItem>
                    {evalDims.map((d) => <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Nueva tarea / compromiso…" value={nuevaTarea} onChange={(e) => setNuevaTarea(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') agregarTarea(); }} />
                <div className="flex gap-2">
                  <Input type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} className="w-40" />
                  <Button onClick={agregarTarea} disabled={!nuevaTarea.trim() || creando}>
                    {creando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Arrastradas */}
              {arrastradas.length > 0 && (
                <div className="border-t pt-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground"><History className="h-3.5 w-3.5" /> Arrastradas de sesiones anteriores</p>
                  <div className="space-y-1.5">
                    {arrastradas.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 rounded-md border bg-muted/30 p-2 text-sm">
                        <span className="min-w-0 flex-1 truncate">{t.descripcion}{dimNombre(t.dimensionId) ? ` · ${dimNombre(t.dimensionId)}` : ''}{t.fechaLimite ? ` · vence ${t.fechaLimite}` : ''}</span>
                        <Select value={t.estado} onValueChange={(v) => { patchTareaLocal(t.id, { estado: v as EstadoTarea }); guardarTarea(t.id, { estado: v as EstadoTarea }); }}>
                          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendiente">{TAREA_LABEL.pendiente}</SelectItem>
                            <SelectItem value="en_progreso">{TAREA_LABEL.en_progreso}</SelectItem>
                            <SelectItem value="completada">{TAREA_LABEL.completada}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notas */}
          <Card>
            <CardHeader><CardTitle className="text-base">Notas de la sesión</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {NOTAS_CAMPOS.map((c) => (
                <div key={c.key} className={c.key === 'observaciones' || c.key === 'reflexionCoachee' ? 'sm:col-span-2' : ''}>
                  <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">{c.label}</Label>
                  <Textarea value={notas[c.key]} placeholder={c.placeholder} onChange={(e) => editarNota(c.key, e.target.value)} className="min-h-[90px]" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ── Panel: tablero de la sesión anterior ── */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><LayoutDashboard className="h-4 w-4 text-emerald-600" /> Tablero anterior</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!prevEval ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Este empleado aún no tiene una evaluación para revisar.</p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">Semana {prevEval.semana ?? '—'} · {prevEval.fecha}</p>

                  {/* KPIs */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border p-2.5">
                      <div className="text-[10px] font-semibold uppercase text-muted-foreground">Avance general</div>
                      <div className="text-xl font-extrabold tabular-nums">{promedioGeneral(prevEval.configSnapshot?.dimensiones ?? [], prevEval.respuestas) ?? prevEval.promedioGeneral ?? 0}%</div>
                    </div>
                    <div className="rounded-lg border p-2.5">
                      <div className="text-[10px] font-semibold uppercase text-muted-foreground">Eficiencia</div>
                      {typeof prevEval.eficiencia?.logro === 'number' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xl font-extrabold tabular-nums">{prevEval.eficiencia.logro}%</span>
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: semaforoEfi(prevEval.eficiencia.logro).color }} />
                        </div>
                      ) : <div className="text-xl font-extrabold text-muted-foreground">—</div>}
                    </div>
                  </div>

                  {/* Seguimiento a efectividad */}
                  {Array.isArray(prevEval.seguimiento) && prevEval.seguimiento.length > 0 && (
                    <div>
                      <div className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">Seguimiento a efectividad</div>
                      <div className="space-y-1">
                        {prevEval.seguimiento.map((k: any, i: number) => {
                          const dif = (Number(k.logro) || 0) - (Number(k.meta) || 0);
                          return (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="truncate">{k.nombre || 'KPI'}</span>
                              <span className="tabular-nums text-muted-foreground">{k.logro}/{k.meta} <span className={dif >= 0 ? 'text-emerald-600' : 'text-red-600'}>({dif >= 0 ? '+' : ''}{dif})</span></span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* % por dimensión (selector) */}
                  <div>
                    <div className="mb-1.5 text-[11px] font-semibold uppercase text-muted-foreground">Por dimensión</div>
                    <div className="space-y-1">
                      {evalDims.map((d) => {
                        const pct = pctDimension(d, prevEval.respuestas) ?? 0;
                        const active = d.id === panelDim;
                        return (
                          <button key={d.id} onClick={() => setPanelDim(d.id)}
                            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition ${active ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                            <span className="min-w-0 flex-1 truncate font-medium">{d.nombre}</span>
                            <span className="tabular-nums font-bold" style={{ color: d.color }}>{pct}%</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Acciones/aspectos de la dimensión seleccionada */}
                  {panel && (
                    <div className="rounded-lg border p-2.5">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: panel.color }} /> {panel.nombre}
                      </div>
                      <div className="space-y-1.5">
                        {panel.aspectos.map((a) => {
                          const nv = nivelDe(escala, prevEval.respuestas?.[a.id]);
                          return (
                            <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
                              <span className="min-w-0 flex-1 truncate">{a.nombre}</span>
                              <span className="flex-shrink-0 rounded-full px-2 py-0.5 font-semibold text-white" style={{ backgroundColor: nv.color }}>{nv.label}</span>
                            </div>
                          );
                        })}
                        {panel.aspectos.length === 0 && <p className="text-xs text-muted-foreground">Sin aspectos.</p>}
                      </div>
                    </div>
                  )}

                  <Link href={`/dashboard/evaluaciones/${prevEval.id}/editar`} className="block">
                    <Button variant="outline" size="sm" className="w-full">Abrir el tablero completo</Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
