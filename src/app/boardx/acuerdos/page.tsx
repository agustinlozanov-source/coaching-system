'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, ListChecks } from 'lucide-react';

import {
  getOrCreateBoard,
  listAcuerdos,
  crearAcuerdo,
  actualizarAcuerdo,
  eliminarAcuerdo,
} from '@/lib/boardx/data';
import {
  TIPO_ACUERDO,
  PRIORIDAD,
  CLASIFICACION,
  ESTADO_ACUERDO,
} from '@/types/boardx';
import type {
  Acuerdo,
  Board,
  TipoAcuerdo,
  Prioridad,
  Clasificacion,
  EstadoAcuerdo,
} from '@/types/boardx';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GlowButton } from '@/components/ui/glow-button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

// ── Helpers de presentación ────────────────────────────────────────────
const clasificacionVariant = (c: Clasificacion) =>
  c === 'estrategico' ? ('info' as const) : ('secondary' as const);

const estadoVariant = (e: EstadoAcuerdo) =>
  e === 'hecho' ? ('success' as const) : e === 'en_progreso' ? ('info' as const) : ('muted' as const);

function formatFecha(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

type FiltroClasif = 'todos' | Clasificacion;
type FiltroEstado = 'todos' | EstadoAcuerdo;

type Draft = {
  texto: string;
  tipo: TipoAcuerdo;
  prioridad: Prioridad;
  clasificacion: Clasificacion | '';
  responsable: string;
  fechaCompromiso: string;
  estado: EstadoAcuerdo;
};

const emptyDraft = (): Draft => ({
  texto: '',
  tipo: 'reunion',
  prioridad: 'media',
  clasificacion: '',
  responsable: '',
  fechaCompromiso: '',
  estado: 'pendiente',
});

const draftFrom = (a: Acuerdo): Draft => ({
  texto: a.texto,
  tipo: a.tipo,
  prioridad: a.prioridad,
  clasificacion: a.clasificacion,
  responsable: a.responsable ?? '',
  fechaCompromiso: a.fechaCompromiso ?? '',
  estado: a.estado,
});

export default function AcuerdosPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<Board | null>(null);
  const [acuerdos, setAcuerdos] = useState<Acuerdo[]>([]);

  const [filtroClasif, setFiltroClasif] = useState<FiltroClasif>('todos');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Acuerdo | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);

  const reload = useCallback(
    async (boardId: string) => {
      try {
        const rows = await listAcuerdos(boardId);
        setAcuerdos(rows);
      } catch (e) {
        toast({
          variant: 'destructive',
          title: 'No se pudieron cargar los acuerdos',
          description: e instanceof Error ? e.message : String(e),
        });
      }
    },
    [toast]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const b = await getOrCreateBoard();
        if (cancelled) return;
        setBoard(b);
        if (b) await reload(b.id);
      } catch (e) {
        if (!cancelled)
          toast({
            variant: 'destructive',
            title: 'Error al inicializar el tablero',
            description: e instanceof Error ? e.message : String(e),
          });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload, toast]);

  const filtered = useMemo(
    () =>
      acuerdos.filter(
        (a) =>
          (filtroClasif === 'todos' || a.clasificacion === filtroClasif) &&
          (filtroEstado === 'todos' || a.estado === filtroEstado)
      ),
    [acuerdos, filtroClasif, filtroEstado]
  );

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft());
    setDialogOpen(true);
  }

  function openEdit(a: Acuerdo) {
    setEditing(a);
    setDraft(draftFrom(a));
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!board) return;
    if (!draft.texto.trim()) {
      toast({ variant: 'destructive', title: 'El texto del acuerdo es obligatorio' });
      return;
    }
    if (!draft.clasificacion) {
      toast({ variant: 'destructive', title: 'Selecciona una clasificación (estratégico o táctico)' });
      return;
    }

    const payload: Partial<Acuerdo> = {
      texto: draft.texto.trim(),
      tipo: draft.tipo,
      prioridad: draft.prioridad,
      clasificacion: draft.clasificacion,
      responsable: draft.responsable.trim() || null,
      fechaCompromiso: draft.fechaCompromiso || null,
      estado: draft.estado,
    };

    setSaving(true);
    try {
      if (editing) {
        await actualizarAcuerdo(editing.id, payload);
      } else {
        await crearAcuerdo(board.id, payload);
      }
      await reload(board.id);
      setDialogOpen(false);
      setEditing(null);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'No se pudo guardar el acuerdo',
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(a: Acuerdo) {
    if (!board) return;
    if (!window.confirm('¿Eliminar este acuerdo? Esta acción no se puede deshacer.')) return;
    try {
      await eliminarAcuerdo(a.id);
      await reload(board.id);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'No se pudo eliminar el acuerdo',
        description: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Selecciona una organización</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Acuerdos</h1>
          <p className="text-muted-foreground">
            Compromisos del consejo, con tipo, prioridad y clasificación.
          </p>
        </div>
        <GlowButton onClick={openCreate} icon={<Plus size={16} className="ml-0.5" />}>
          Nuevo acuerdo
        </GlowButton>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Clasificación</Label>
          <Select value={filtroClasif} onValueChange={(v) => setFiltroClasif(v as FiltroClasif)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="estrategico">{CLASIFICACION.estrategico.label}</SelectItem>
              <SelectItem value="tactico">{CLASIFICACION.tactico.label}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Estado</Label>
          <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as FiltroEstado)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {(Object.keys(ESTADO_ACUERDO) as EstadoAcuerdo[]).map((e) => (
                <SelectItem key={e} value={e}>
                  {ESTADO_ACUERDO[e].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <ListChecks className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No hay acuerdos que mostrar</p>
              <p className="text-sm text-muted-foreground">
                {acuerdos.length === 0
                  ? 'Registra el primer compromiso del consejo.'
                  : 'Ajusta los filtros o crea un nuevo acuerdo.'}
              </p>
            </div>
            <Button variant="outline" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" /> Nuevo acuerdo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-start gap-3 py-4">
                <div className="mt-0.5 text-xl leading-none" aria-hidden>
                  {TIPO_ACUERDO[a.tipo].icon}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <p className="font-medium text-foreground">{a.texto}</p>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: PRIORIDAD[a.prioridad].color }}
                      />
                      {PRIORIDAD[a.prioridad].label}
                    </span>
                    <Badge variant={clasificacionVariant(a.clasificacion)}>
                      {CLASIFICACION[a.clasificacion].label}
                    </Badge>
                    <Badge variant={estadoVariant(a.estado)}>
                      {ESTADO_ACUERDO[a.estado].label}
                    </Badge>
                    <span className="text-muted-foreground">{TIPO_ACUERDO[a.tipo].label}</span>
                  </div>

                  {(a.responsable || a.fechaCompromiso) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {a.responsable && <span>Responsable: {a.responsable}</span>}
                      {a.fechaCompromiso && <span>Compromiso: {formatFecha(a.fechaCompromiso)}</span>}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(a)}
                    aria-label="Editar acuerdo"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(a)}
                    aria-label="Eliminar acuerdo"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={(o) => (o ? setDialogOpen(true) : setDialogOpen(false))}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar acuerdo' : 'Nuevo acuerdo'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="texto">
                Acuerdo <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="texto"
                value={draft.texto}
                onChange={(e) => setDraft((d) => ({ ...d, texto: e.target.value }))}
                placeholder="Describe el compromiso acordado…"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={draft.tipo}
                  onValueChange={(v) => setDraft((d) => ({ ...d, tipo: v as TipoAcuerdo }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TIPO_ACUERDO) as TipoAcuerdo[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {TIPO_ACUERDO[t].icon} {TIPO_ACUERDO[t].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Prioridad</Label>
                <Select
                  value={draft.prioridad}
                  onValueChange={(v) => setDraft((d) => ({ ...d, prioridad: v as Prioridad }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PRIORIDAD) as Prioridad[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: PRIORIDAD[p].color }}
                          />
                          {PRIORIDAD[p].label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>
                  Clasificación <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={draft.clasificacion || undefined}
                  onValueChange={(v) => setDraft((d) => ({ ...d, clasificacion: v as Clasificacion }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estrategico">{CLASIFICACION.estrategico.label}</SelectItem>
                    <SelectItem value="tactico">{CLASIFICACION.tactico.label}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select
                  value={draft.estado}
                  onValueChange={(v) => setDraft((d) => ({ ...d, estado: v as EstadoAcuerdo }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ESTADO_ACUERDO) as EstadoAcuerdo[]).map((e) => (
                      <SelectItem key={e} value={e}>
                        {ESTADO_ACUERDO[e].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="responsable">Responsable</Label>
                <Input
                  id="responsable"
                  value={draft.responsable}
                  onChange={(e) => setDraft((d) => ({ ...d, responsable: e.target.value }))}
                  placeholder="Nombre del responsable"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fechaCompromiso">Fecha compromiso</Label>
                <Input
                  id="fechaCompromiso"
                  type="date"
                  value={draft.fechaCompromiso}
                  onChange={(e) => setDraft((d) => ({ ...d, fechaCompromiso: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {editing ? 'Guardar cambios' : 'Crear acuerdo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
