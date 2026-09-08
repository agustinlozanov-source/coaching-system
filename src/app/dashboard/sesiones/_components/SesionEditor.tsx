'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Plus, Trash2, CheckCircle2, Circle, ListChecks,
  ClipboardCheck, ListTodo, AlertCircle,
} from 'lucide-react';
import {
  getSesion, guardarSesion, listTareas, crearTarea, actualizarTarea, NOTAS_VACIAS,
  type Sesion, type AgendaItem, type NotasSesion, type Acuerdo, type EstadoAcuerdo,
  type EstadoSesion, type Tarea, type EstadoTarea,
} from '@/lib/teamx/sesiones';
import { getEmpleadoById } from '@/hooks/useEmpleados';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
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
const ORIGEN_LABEL: Record<AgendaItem['origen'], string> = {
  aspecto_bajo: 'Bajó vs. anterior', dimension_baja: 'Dimensión débil',
  tarea_pendiente: 'Tarea pendiente', manual: 'Agregado a mano',
};
const ORIGEN_BADGE: Record<AgendaItem['origen'], 'destructive' | 'warning' | 'info' | 'muted'> = {
  aspecto_bajo: 'destructive', dimension_baja: 'warning', tarea_pendiente: 'info', manual: 'muted',
};

const NOTAS_CAMPOS: { key: keyof NotasSesion; label: string; placeholder: string }[] = [
  { key: 'revision', label: 'Revisión', placeholder: '¿Qué se revisó de la sesión y tareas anteriores?' },
  { key: 'observaciones', label: 'Observaciones', placeholder: 'Observaciones del coach durante la sesión.' },
  { key: 'acuerdos', label: 'Acuerdos', placeholder: 'Resumen narrativo de lo acordado.' },
  { key: 'proximosPasos', label: 'Próximos pasos', placeholder: '¿Qué sigue antes de la próxima sesión?' },
  { key: 'reflexionCoachee', label: 'Reflexión del coachee', placeholder: 'En palabras del coachee.' },
];

export function SesionEditor({ sesionId }: { sesionId: string }) {
  const { toast } = useToast();

  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [empleado, setEmpleado] = useState<{ nombre: string; cargo?: string } | null>(null);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [status, setStatus] = useState<Status>('idle');

  const [fecha, setFecha] = useState('');
  const [estado, setEstado] = useState<EstadoSesion>('programada');
  const [duracionInicialSec, setDuracionInicialSec] = useState(0);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [notas, setNotas] = useState<NotasSesion>(NOTAS_VACIAS);
  const [acuerdos, setAcuerdos] = useState<Acuerdo[]>([]);
  const [nuevoPunto, setNuevoPunto] = useState('');
  const [nuevoAcuerdo, setNuevoAcuerdo] = useState('');

  const [tareaDesc, setTareaDesc] = useState('');
  const [tareaResp, setTareaResp] = useState('');
  const [tareaFecha, setTareaFecha] = useState('');
  const [creandoTarea, setCreandoTarea] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      const s = await getSesion(sesionId);
      if (!s) { setNotFound(true); setLoading(false); return; }
      setSesion(s);
      setFecha(s.fecha);
      setEstado(s.estado);
      setAgenda(s.agenda);
      setNotas(s.notas);
      setAcuerdos(s.acuerdos);
      setDuracionInicialSec((s.duracionMin ?? 0) * 60);
      const [emp, tareasEmp] = await Promise.all([
        getEmpleadoById(s.empleadoId).catch(() => null),
        listTareas({ empleadoId: s.empleadoId }).catch(() => []),
      ]);
      if (emp) setEmpleado({ nombre: emp.nombre, cargo: emp.cargo });
      setTareas(tareasEmp);
      loaded.current = true;
      setLoading(false);
      setStatus('saved');
    })();
  }, [sesionId]);

  /* Autosave (debounce) */
  const persist = useCallback((patch: GuardarPatch) => {
    if (!loaded.current) return;
    setStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { await guardarSesion(sesionId, patch); setStatus('saved'); }
      catch { setStatus('error'); }
    }, 900);
  }, [sesionId]);

  /* Guardado inmediato (cambios de estado) */
  const persistNow = useCallback(async (patch: GuardarPatch) => {
    if (!loaded.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setStatus('saving');
    try { await guardarSesion(sesionId, patch); setStatus('saved'); }
    catch { setStatus('error'); }
  }, [sesionId]);

  /* ── Agenda ──────────────────────────────────────────────────────────── */
  function actualizarAgenda(next: AgendaItem[]) { setAgenda(next); persist({ agenda: next }); }
  function toggleAgenda(id: string) {
    actualizarAgenda(agenda.map((a) => (a.id === id ? { ...a, hecho: !a.hecho } : a)));
  }
  function editarAgendaTexto(id: string, texto: string) {
    setAgenda((prev) => prev.map((a) => (a.id === id ? { ...a, texto } : a)));
  }
  function commitAgendaTexto() { persist({ agenda }); }
  function eliminarAgenda(id: string) { actualizarAgenda(agenda.filter((a) => a.id !== id)); }
  function agregarAgenda() {
    const texto = nuevoPunto.trim();
    if (!texto) return;
    actualizarAgenda([...agenda, { id: `manual-${Date.now()}`, texto, origen: 'manual', hecho: false }]);
    setNuevoPunto('');
  }

  /* ── Notas estructuradas ─────────────────────────────────────────────── */
  function editarNota(key: keyof NotasSesion, value: string) {
    const next = { ...notas, [key]: value };
    setNotas(next);
    persist({ notas: next });
  }

  /* ── Acuerdos / compromisos ──────────────────────────────────────────── */
  function actualizarAcuerdos(next: Acuerdo[]) { setAcuerdos(next); persist({ acuerdos: next }); }
  function agregarAcuerdo() {
    const texto = nuevoAcuerdo.trim();
    if (!texto) return;
    actualizarAcuerdos([...acuerdos, {
      id: `ac-${Date.now()}`, texto, estado: 'pendiente', fecha: new Date().toISOString().slice(0, 10),
    }]);
    setNuevoAcuerdo('');
  }
  function cambiarEstadoAcuerdo(id: string, nuevo: EstadoAcuerdo) {
    actualizarAcuerdos(acuerdos.map((a) => (a.id === id ? { ...a, estado: nuevo } : a)));
  }
  function eliminarAcuerdo(id: string) { actualizarAcuerdos(acuerdos.filter((a) => a.id !== id)); }

  /* ── Estado / fecha de la sesión ─────────────────────────────────────── */
  async function cambiarEstadoSesion(nuevo: EstadoSesion) {
    setEstado(nuevo);
    await persistNow({ estado: nuevo });
  }
  function cambiarFecha(v: string) { setFecha(v); persist({ fecha: v }); }

  /* ── Timer ───────────────────────────────────────────────────────────── */
  const onPersistDuracion = useCallback((elapsedSec: number) => {
    persist({ duracionMin: Math.round(elapsedSec / 60) });
  }, [persist]);

  /* ── Tareas del empleado ─────────────────────────────────────────────── */
  async function agregarTarea() {
    const desc = tareaDesc.trim();
    if (!desc || !sesion) return;
    setCreandoTarea(true);
    try {
      const id = await crearTarea({
        empleadoId: sesion.empleadoId,
        descripcion: desc,
        responsable: tareaResp.trim() || null,
        fechaLimite: tareaFecha || null,
        evaluacionId: sesion.evaluacionId,
      });
      setTareas((prev) => [{
        id, organizacionId: sesion.organizacionId, empleadoId: sesion.empleadoId,
        evaluacionId: sesion.evaluacionId, aspectoId: null, descripcion: desc,
        responsable: tareaResp.trim() || null, fechaLimite: tareaFecha || null, estado: 'pendiente',
      }, ...prev]);
      setTareaDesc(''); setTareaResp(''); setTareaFecha('');
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear la tarea.', variant: 'destructive' });
    } finally {
      setCreandoTarea(false);
    }
  }
  async function cambiarEstadoTarea(id: string, nuevo: EstadoTarea) {
    setTareas((prev) => prev.map((t) => (t.id === id ? { ...t, estado: nuevo } : t)));
    try { await actualizarTarea(id, { estado: nuevo }); }
    catch { toast({ title: 'Error', description: 'No se pudo actualizar la tarea.', variant: 'destructive' }); }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (notFound || !sesion) {
    return (
      <Card><CardContent className="flex flex-col items-center py-16 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <h3 className="mt-3 font-bold">No se encontró la sesión</h3>
        <Link href="/dashboard/sesiones" className="mt-4">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Volver a sesiones</Button>
        </Link>
      </CardContent></Card>
    );
  }

  const agendaDone = agenda.filter((a) => a.hecho).length;
  const pendientesEmpleado = tareas.filter((t) => t.estado !== 'completada');

  return (
    <div className="mx-auto max-w-5xl space-y-6">
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
          <SesionTimer
            initialElapsedSec={duracionInicialSec}
            disabled={estado === 'cancelada'}
            onPersist={onPersistDuracion}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Agenda */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4 text-emerald-600" /> Agenda de la sesión
            </CardTitle>
            <span className="text-xs text-muted-foreground">{agendaDone}/{agenda.length} listos</span>
          </CardHeader>
          <CardContent className="space-y-3">
            {agenda.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Sin puntos de agenda todavía. Se sugieren solos al crear la sesión desde evaluaciones y tareas pendientes.
              </p>
            ) : (
              <ul className="space-y-2">
                {agenda.map((a) => (
                  <li key={a.id} className="flex items-start gap-2 rounded-md border p-2">
                    <button type="button" onClick={() => toggleAgenda(a.id)} className="mt-0.5 shrink-0 text-emerald-600">
                      {a.hecho ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <input
                        value={a.texto}
                        onChange={(e) => editarAgendaTexto(a.id, e.target.value)}
                        onBlur={commitAgendaTexto}
                        className={`w-full border-none bg-transparent p-0 text-sm outline-none ${a.hecho ? 'text-muted-foreground line-through' : ''}`}
                      />
                      <Badge variant={ORIGEN_BADGE[a.origen]} className="mt-1">{ORIGEN_LABEL[a.origen]}</Badge>
                    </div>
                    <button type="button" onClick={() => eliminarAgenda(a.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2 pt-1">
              <Input
                placeholder="Agregar punto a la agenda…" value={nuevoPunto}
                onChange={(e) => setNuevoPunto(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') agregarAgenda(); }}
              />
              <Button variant="outline" onClick={agregarAgenda}><Plus className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>

        {/* Acuerdos / compromisos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-4 w-4 text-emerald-600" /> Acuerdos y compromisos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {acuerdos.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Aún no hay acuerdos registrados en esta sesión.</p>
            ) : (
              <ul className="space-y-2">
                {acuerdos.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 rounded-md border p-2">
                    <span className="min-w-0 flex-1 truncate text-sm" title={a.texto}>{a.texto}</span>
                    <Select value={a.estado} onValueChange={(v) => cambiarEstadoAcuerdo(a.id, v as EstadoAcuerdo)}>
                      <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="cumplido">Cumplido</SelectItem>
                        <SelectItem value="no_cumplido">No cumplido</SelectItem>
                      </SelectContent>
                    </Select>
                    <button type="button" onClick={() => eliminarAcuerdo(a.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2 pt-1">
              <Input
                placeholder="Nuevo acuerdo o compromiso…" value={nuevoAcuerdo}
                onChange={(e) => setNuevoAcuerdo(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') agregarAcuerdo(); }}
              />
              <Button variant="outline" onClick={agregarAcuerdo}><Plus className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notas estructuradas */}
      <Card>
        <CardHeader><CardTitle className="text-base">Notas de la sesión</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {NOTAS_CAMPOS.map((c) => (
            <div key={c.key} className={c.key === 'observaciones' || c.key === 'reflexionCoachee' ? 'sm:col-span-2' : ''}>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">{c.label}</Label>
              <Textarea
                value={notas[c.key]} placeholder={c.placeholder}
                onChange={(e) => editarNota(c.key, e.target.value)}
                className="min-h-[90px]"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tareas del empleado */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListTodo className="h-4 w-4 text-emerald-600" /> Tareas de {empleado?.nombre ?? 'este empleado'}
          </CardTitle>
          <span className="text-xs text-muted-foreground">{pendientesEmpleado.length} pendientes</span>
        </CardHeader>
        <CardContent className="space-y-4">
          {tareas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin tareas todavía. Crea la primera abajo.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left">Descripción</th>
                    <th className="p-2 text-left">Responsable</th>
                    <th className="p-2 text-left">Fecha límite</th>
                    <th className="p-2 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {tareas.map((t) => (
                    <tr key={t.id} className="border-b">
                      <td className="p-2">{t.descripcion}</td>
                      <td className="p-2 text-muted-foreground">{t.responsable || '—'}</td>
                      <td className="p-2 text-muted-foreground">{t.fechaLimite || '—'}</td>
                      <td className="p-2">
                        <Select value={t.estado} onValueChange={(v) => cambiarEstadoTarea(t.id, v as EstadoTarea)}>
                          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendiente">{TAREA_LABEL.pendiente}</SelectItem>
                            <SelectItem value="en_progreso">{TAREA_LABEL.en_progreso}</SelectItem>
                            <SelectItem value="completada">{TAREA_LABEL.completada}</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid gap-2 border-t pt-4 sm:grid-cols-[1fr_auto_auto_auto]">
            <Input placeholder="Nueva tarea…" value={tareaDesc} onChange={(e) => setTareaDesc(e.target.value)} />
            <Input placeholder="Responsable" value={tareaResp} onChange={(e) => setTareaResp(e.target.value)} className="sm:w-40" />
            <Input type="date" value={tareaFecha} onChange={(e) => setTareaFecha(e.target.value)} className="sm:w-40" />
            <Button onClick={agregarTarea} disabled={!tareaDesc.trim() || creandoTarea}>
              {creandoTarea ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
