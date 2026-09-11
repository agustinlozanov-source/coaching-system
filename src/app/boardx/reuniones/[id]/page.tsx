'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, Play, Pause, RotateCcw, Plus, Trash2, Check, ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { GlowButton } from '@/components/ui/glow-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  getOrCreateBoard, getReunion, actualizarReunion, listAsientos, listAcuerdos, crearAcuerdo,
} from '@/lib/boardx/data';
import {
  TIPO_ACUERDO, PRIORIDAD, CLASIFICACION, type AgendaItem, type Acuerdo, type Asiento,
  type Reunion, type Board, type TipoAcuerdo, type Prioridad, type Clasificacion,
} from '@/types/boardx';

export const dynamic = 'force-dynamic';

const fmt = (s: number) => {
  const neg = s < 0; const a = Math.abs(s);
  const m = Math.floor(a / 60), ss = a % 60;
  return `${neg ? '-' : ''}${m}:${ss.toString().padStart(2, '0')}`;
};

function Seccion({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-xs font-bold text-white">{n}</span>
        <h2 className="font-bold">{titulo}</h2>
      </div>
      {children}
    </section>
  );
}

export default function ReunionPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { toast } = useToast();
  const [board, setBoard] = useState<Board | null>(null);
  const [reunion, setReunion] = useState<Reunion | null>(null);
  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [acuerdos, setAcuerdos] = useState<Acuerdo[]>([]);
  const [loading, setLoading] = useState(true);

  // Agenda + temporizador
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevoMin, setNuevoMin] = useState('10');
  const [activo, setActivo] = useState<number | null>(null);
  const [restante, setRestante] = useState(0);
  const [corriendo, setCorriendo] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  // Nuevo acuerdo
  const [aTexto, setATexto] = useState('');
  const [aTipo, setATipo] = useState<TipoAcuerdo>('reunion');
  const [aPrioridad, setAPrioridad] = useState<Prioridad>('media');
  const [aClas, setAClas] = useState<Clasificacion | ''>('');
  const [aResp, setAResp] = useState('');
  const [guardandoAcuerdo, setGuardandoAcuerdo] = useState(false);

  useEffect(() => {
    (async () => {
      const [b, r] = await Promise.all([getOrCreateBoard(), getReunion(id)]);
      setBoard(b);
      setReunion(r);
      if (b) {
        const [as, ac] = await Promise.all([listAsientos(b.id), listAcuerdos(b.id)]);
        setAsientos(as);
        setAcuerdos(ac.filter((x) => x.reunionId === id));
      }
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (corriendo) {
      tick.current = setInterval(() => setRestante((s) => s - 1), 1000);
      return () => { if (tick.current) clearInterval(tick.current); };
    }
  }, [corriendo]);

  const readOnly = reunion?.estado === 'cerrada';

  async function patch(p: Partial<Reunion>) {
    if (!reunion) return;
    setReunion({ ...reunion, ...p });
    try { await actualizarReunion(reunion.id, p); } catch { toast({ title: 'Error al guardar', variant: 'destructive' }); }
  }

  function togglePresente(asientoId: string) {
    if (!reunion || readOnly) return;
    const cur = reunion.asistencia[asientoId]?.presente;
    const asistencia = { ...reunion.asistencia, [asientoId]: { presente: !cur, hora: new Date().toLocaleTimeString().slice(0, 5) } };
    patch({ asistencia });
  }

  function agregarItem() {
    if (!reunion || !nuevoTitulo.trim()) return;
    const item: AgendaItem = { id: crypto.randomUUID(), titulo: nuevoTitulo.trim(), minutos: Number(nuevoMin) || 10 };
    patch({ agenda: [...reunion.agenda, item] });
    setNuevoTitulo(''); setNuevoMin('10');
  }
  function quitarItem(itemId: string) {
    if (!reunion) return;
    patch({ agenda: reunion.agenda.filter((x) => x.id !== itemId) });
  }

  function iniciarTimer(idx: number) {
    if (!reunion) return;
    setActivo(idx);
    setRestante(reunion.agenda[idx].minutos * 60);
    setCorriendo(true);
  }

  async function agregarAcuerdo() {
    if (!board || !aTexto.trim() || !aClas) return;
    setGuardandoAcuerdo(true);
    try {
      await crearAcuerdo(board.id, {
        reunionId: id, texto: aTexto.trim(), tipo: aTipo, prioridad: aPrioridad,
        clasificacion: aClas, responsable: aResp.trim() || null,
      });
      const ac = await listAcuerdos(board.id);
      setAcuerdos(ac.filter((x) => x.reunionId === id));
      setATexto(''); setAResp(''); setAClas('');
    } catch {
      toast({ title: 'Error al agregar acuerdo', variant: 'destructive' });
    } finally {
      setGuardandoAcuerdo(false);
    }
  }

  const totalMin = useMemo(() => (reunion?.agenda ?? []).reduce((s, x) => s + x.minutos, 0), [reunion?.agenda]);

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;
  if (!reunion) return <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">Reunión no encontrada. <Link href="/boardx/reuniones" className="text-primary hover:underline">Volver</Link></div>;

  const presentes = Object.values(reunion.asistencia).filter((a) => a.presente).length;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/boardx/reuniones" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Reuniones</Link>
          <h1 className="mt-1 text-2xl font-bold">{reunion.nombre || `Round ${reunion.round ?? '—'}`}</h1>
          <div className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
            {reunion.round != null && <span>Round {reunion.round}</span>}
            {reunion.tematica && <span>· {reunion.tematica}</span>}
            {reunion.kpiPrincipal && <span>· KPI: {reunion.kpiPrincipal}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={reunion.estado === 'cerrada' ? 'muted' : reunion.estado === 'en_curso' ? 'info' : 'secondary'}>
            {reunion.estado === 'cerrada' ? 'Cerrada' : reunion.estado === 'en_curso' ? 'En curso' : 'Programada'}
          </Badge>
          {reunion.estado === 'programada' && <GlowButton onClick={() => patch({ estado: 'en_curso' })}>Iniciar reunión</GlowButton>}
          {reunion.estado === 'en_curso' && <Button variant="outline" onClick={() => patch({ estado: 'cerrada' })}>Cerrar reunión</Button>}
        </div>
      </div>

      {/* 1. Pase de lista */}
      <Seccion n={1} titulo={`Pase de lista · ${presentes}/${asientos.length} presentes`}>
        {asientos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay consejeros aún. Agrégalos en <Link href="/boardx/consejo" className="text-primary hover:underline">Consejo</Link>.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {asientos.map((a) => {
              const pres = reunion.asistencia[a.id]?.presente;
              return (
                <button key={a.id} onClick={() => togglePresente(a.id)} disabled={readOnly}
                  className={`flex items-center justify-between rounded-lg border p-3 text-left text-sm transition ${pres ? 'border-emerald-500 bg-emerald-500/10' : 'hover:bg-muted/50'}`}>
                  <div>
                    <div className="font-medium">{a.nombre}</div>
                    <div className="text-xs text-muted-foreground">{a.rol || a.especializacion || (a.tipo === 'interno' ? 'Interno' : 'Externo')}</div>
                  </div>
                  {pres && <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check className="h-4 w-4" />{reunion.asistencia[a.id]?.hora}</span>}
                </button>
              );
            })}
          </div>
        )}
      </Seccion>

      {/* 2. Lectura de valores */}
      <Seccion n={2} titulo="Lectura de valores">
        {board && board.valores.length ? (
          <div className="flex flex-wrap gap-2">
            {board.valores.map((v, i) => <span key={i} className="rounded-full border bg-muted/40 px-3 py-1 text-sm">{v}</span>)}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Define los valores de la empresa en <Link href="/boardx/consejo" className="text-primary hover:underline">Consejo</Link> para leerlos aquí.</p>
        )}
      </Seccion>

      {/* 3. Agenda + temporizador */}
      <Seccion n={3} titulo={`Agenda · ${totalMin} min`}>
        {activo != null && reunion.agenda[activo] && (
          <div className={`mb-4 flex items-center justify-between rounded-xl border p-4 ${restante < 0 ? 'border-red-500 bg-red-500/10' : 'bg-muted/40'}`}>
            <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><span className="font-semibold">{reunion.agenda[activo].titulo}</span></div>
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-extrabold tabular-nums ${restante < 0 ? 'text-red-500' : ''}`}>{fmt(restante)}</span>
              <Button size="icon" variant="ghost" onClick={() => setCorriendo((c) => !c)}>{corriendo ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
              <Button size="icon" variant="ghost" onClick={() => { setRestante(reunion.agenda[activo].minutos * 60); setCorriendo(false); }}><RotateCcw className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {reunion.agenda.map((item, idx) => (
            <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{item.titulo}</span>
                <span className="text-xs text-muted-foreground">{item.minutos} min</span>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={() => iniciarTimer(idx)}>Cronometrar</Button>
                {!readOnly && <Button size="icon" variant="ghost" onClick={() => quitarItem(item.id)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            </div>
          ))}
          {reunion.agenda.length === 0 && <p className="text-sm text-muted-foreground">Sin puntos de agenda todavía.</p>}
        </div>
        {!readOnly && (
          <div className="mt-3 flex items-end gap-2">
            <div className="flex-1 space-y-1"><Label className="text-xs">Punto de agenda</Label><Input value={nuevoTitulo} onChange={(e) => setNuevoTitulo(e.target.value)} placeholder="Revisión de scorecard" /></div>
            <div className="w-24 space-y-1"><Label className="text-xs">Min</Label><Input type="number" min={1} value={nuevoMin} onChange={(e) => setNuevoMin(e.target.value)} /></div>
            <Button variant="outline" onClick={agregarItem} disabled={!nuevoTitulo.trim()}><Plus className="mr-1 h-4 w-4" /> Agregar</Button>
          </div>
        )}
      </Seccion>

      {/* 4. Acuerdos de la reunión */}
      <Seccion n={4} titulo={`Acuerdos · ${acuerdos.length}`}>
        {!readOnly && (
          <div className="mb-4 space-y-3 rounded-xl border border-dashed p-4">
            <div className="space-y-1"><Label className="text-xs">Acuerdo / compromiso</Label><Input value={aTexto} onChange={(e) => setATexto(e.target.value)} placeholder="Enviar propuesta a proveedor clave" /></div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1"><Label className="text-xs">Tipo</Label>
                <Select value={aTipo} onValueChange={(v) => setATipo(v as TipoAcuerdo)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TIPO_ACUERDO).map(([k, v]) => <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Prioridad</Label>
                <Select value={aPrioridad} onValueChange={(v) => setAPrioridad(v as Prioridad)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(PRIORIDAD).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Clasificación *</Label>
                <Select value={aClas} onValueChange={(v) => setAClas(v as Clasificacion)}>
                  <SelectTrigger><SelectValue placeholder="Elige" /></SelectTrigger>
                  <SelectContent>{Object.entries(CLASIFICACION).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Responsable</Label><Input value={aResp} onChange={(e) => setAResp(e.target.value)} placeholder="Nombre" /></div>
            </div>
            <div className="flex justify-end">
              <GlowButton onClick={agregarAcuerdo} disabled={!aTexto.trim() || !aClas} loading={guardandoAcuerdo}>Agregar acuerdo</GlowButton>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {acuerdos.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span>{TIPO_ACUERDO[a.tipo].icon}</span>
                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: PRIORIDAD[a.prioridad].color }} />
                <span className="truncate">{a.texto}</span>
              </div>
              <Badge variant={a.clasificacion === 'estrategico' ? 'info' : 'secondary'}>{CLASIFICACION[a.clasificacion].label}</Badge>
            </div>
          ))}
          {acuerdos.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay acuerdos en esta reunión.</p>}
        </div>
      </Seccion>
    </div>
  );
}
