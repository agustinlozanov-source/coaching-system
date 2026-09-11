'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, TrendingUp, Gauge, Upload } from 'lucide-react';

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
import { useToast } from '@/hooks/use-toast';

import {
  getOrCreateBoard,
  listIndicadores,
  crearIndicador,
  actualizarIndicador,
  eliminarIndicador,
} from '@/lib/boardx/data';
import {
  DIMENSIONES_SCORECARD,
  SEMAFORO_IND_COLOR,
  semaforoIndicador,
  type Board,
  type Indicador,
} from '@/types/boardx';

const SIN_DIMENSION = 'Sin dimensión';

type FormState = {
  dimension: string | null;
  nombre: string;
  valorActual: string;
  meta: string;
  unidad: string;
  direccion: 'mayor' | 'menor';
  responsable: string;
  orden: string;
};

const emptyForm: FormState = {
  dimension: null,
  nombre: '',
  valorActual: '',
  meta: '',
  unidad: '',
  direccion: 'mayor',
  responsable: '',
  orden: '0',
};

function toForm(ind: Indicador): FormState {
  return {
    dimension: ind.dimension,
    nombre: ind.nombre,
    valorActual: ind.valorActual == null ? '' : String(ind.valorActual),
    meta: ind.meta == null ? '' : String(ind.meta),
    unidad: ind.unidad ?? '',
    direccion: ind.direccion,
    responsable: ind.responsable ?? '',
    orden: String(ind.orden ?? 0),
  };
}

function numOrNull(v: string): number | null {
  const t = v.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isNaN(n) ? null : n;
}

export default function ScorecardPage() {
  const { toast } = useToast();

  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [indicadores, setIndicadores] = useState<Indicador[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Indicador | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const b = await getOrCreateBoard();
        if (!mounted) return;
        setBoard(b);
        if (b) {
          const inds = await listIndicadores(b.id);
          if (mounted) setIndicadores(inds);
        }
      } catch (err) {
        console.error(err);
        toast({
          variant: 'destructive',
          title: 'Error al cargar',
          description: 'No se pudieron cargar los indicadores.',
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fileRef = useRef<HTMLInputElement>(null);

  async function importarCSV(file: File) {
    if (!board) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    const start = /dimension|dimensi[oó]n|nombre|indicador/i.test(lines[0]) ? 1 : 0;
    let n = 0;
    for (let i = start; i < lines.length; i++) {
      const c = lines[i].split(',').map((s) => s.trim());
      const [dimension, nombre, valor, meta, unidad, responsable] = c;
      if (!nombre) continue;
      const num = (v: string) => (v != null && v !== '' && !isNaN(Number(v)) ? Number(v) : null);
      try {
        await crearIndicador(board.id, {
          dimension: dimension || null, nombre, valorActual: num(valor), meta: num(meta),
          unidad: unidad || null, direccion: 'mayor', responsable: responsable || null, orden: i,
        });
        n++;
      } catch { /* fila inválida, continúa */ }
    }
    await reload();
    toast({ title: `Importados ${n} indicadores`, description: 'Ajusta dirección/umbral si hace falta.' });
  }

  async function reload() {
    if (!board) return;
    try {
      const inds = await listIndicadores(board.id);
      setIndicadores(inds);
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Error al recargar',
        description: 'No se pudieron recargar los indicadores.',
      });
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(ind: Indicador) {
    setEditing(ind);
    setForm(toForm(ind));
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!board) return;
    if (!form.nombre.trim()) {
      toast({
        variant: 'destructive',
        title: 'Falta el nombre',
        description: 'El indicador necesita un nombre.',
      });
      return;
    }
    setSaving(true);
    const payload: Partial<Indicador> = {
      dimension: form.dimension,
      nombre: form.nombre.trim(),
      valorActual: numOrNull(form.valorActual),
      meta: numOrNull(form.meta),
      unidad: form.unidad.trim() === '' ? null : form.unidad.trim(),
      direccion: form.direccion,
      responsable: form.responsable.trim() === '' ? null : form.responsable.trim(),
      orden: numOrNull(form.orden) ?? 0,
    };
    try {
      if (editing) {
        await actualizarIndicador(editing.id, payload);
      } else {
        await crearIndicador(board.id, payload);
      }
      await reload();
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: 'No se pudo guardar el indicador.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(ind: Indicador) {
    if (!confirm(`¿Eliminar el indicador "${ind.nombre}"?`)) return;
    try {
      await eliminarIndicador(ind.id);
      await reload();
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Error al eliminar',
        description: 'No se pudo eliminar el indicador.',
      });
    }
  }

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

  // Agrupar por dimensión (nulls bajo "Sin dimensión").
  const grupos = new Map<string, Indicador[]>();
  for (const ind of indicadores) {
    const key = ind.dimension ?? SIN_DIMENSION;
    const arr = grupos.get(key);
    if (arr) arr.push(ind);
    else grupos.set(key, [ind]);
  }

  // Ordenar dimensiones: primero las del catálogo (en su orden), luego el resto, "Sin dimensión" al final.
  const orderKey = (k: string): number => {
    if (k === SIN_DIMENSION) return 1000;
    const idx = DIMENSIONES_SCORECARD.indexOf(k);
    return idx === -1 ? 500 : idx;
  };
  const dimensiones = Array.from(grupos.keys()).sort((a, b) => orderKey(a) - orderKey(b) || a.localeCompare(b));

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Scorecard</h1>
          <p className="text-muted-foreground">Los indicadores que importan, por dimensión.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importarCSV(f); e.target.value = ''; }}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={!board} title="CSV: dimension,nombre,valor,meta,unidad,responsable">
            <Upload className="mr-1 h-4 w-4" /> Importar CSV
          </Button>
          <GlowButton onClick={openCreate} icon={<Plus size={16} className="ml-0.5" />}>
            Nuevo indicador
          </GlowButton>
        </div>
      </div>

      {indicadores.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Gauge className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">Aún no hay indicadores</p>
              <p className="text-sm text-muted-foreground">
                Crea tu primer indicador para empezar a medir lo que importa.
              </p>
            </div>
            <Button variant="outline" onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" />
              Nuevo indicador
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {dimensiones.map((dim) => {
            const items = grupos.get(dim) ?? [];
            return (
              <section key={dim} className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {dim}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((ind) => {
                    const semaforo = semaforoIndicador(ind);
                    return (
                      <Card key={ind.id}>
                        <CardContent className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <span
                                className="mt-1 h-3 w-3 flex-shrink-0 rounded-full"
                                style={{ backgroundColor: SEMAFORO_IND_COLOR[semaforo] }}
                                aria-hidden
                              />
                              <p className="font-bold leading-tight">{ind.nombre}</p>
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEdit(ind)}
                                aria-label="Editar indicador"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDelete(ind)}
                                aria-label="Eliminar indicador"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold tabular-nums">
                              {ind.valorActual == null ? '—' : ind.valorActual}
                            </span>
                            {ind.unidad ? (
                              <span className="text-lg text-muted-foreground">{ind.unidad}</span>
                            ) : null}
                          </div>

                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>
                              Meta: {ind.meta == null ? '—' : ind.meta}
                              {ind.meta != null && ind.unidad ? ` ${ind.unidad}` : ''}
                            </span>
                            <Badge variant="secondary" className="gap-1 font-normal">
                              <TrendingUp className="h-3 w-3" />
                              {ind.direccion === 'menor' ? 'Menos es mejor' : 'Más es mejor'}
                            </Badge>
                          </div>

                          {ind.responsable ? (
                            <p className="text-xs text-muted-foreground">
                              Responsable: {ind.responsable}
                            </p>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar indicador' : 'Nuevo indicador'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Dimensión</Label>
              <Select
                value={form.dimension ?? ''}
                onValueChange={(v) => setForm((f) => ({ ...f, dimension: v || null }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una dimensión" />
                </SelectTrigger>
                <SelectContent>
                  {DIMENSIONES_SCORECARD.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ind-nombre">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ind-nombre"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej. Margen operativo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ind-valor">Valor actual</Label>
                <Input
                  id="ind-valor"
                  type="number"
                  value={form.valorActual}
                  onChange={(e) => setForm((f) => ({ ...f, valorActual: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ind-meta">Meta</Label>
                <Input
                  id="ind-meta"
                  type="number"
                  value={form.meta}
                  onChange={(e) => setForm((f) => ({ ...f, meta: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ind-unidad">Unidad</Label>
                <Input
                  id="ind-unidad"
                  value={form.unidad}
                  onChange={(e) => setForm((f) => ({ ...f, unidad: e.target.value }))}
                  placeholder="%, $, días…"
                />
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Select
                  value={form.direccion}
                  onValueChange={(v) => setForm((f) => ({ ...f, direccion: v as 'mayor' | 'menor' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mayor">Más es mejor</SelectItem>
                    <SelectItem value="menor">Menos es mejor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ind-responsable">Responsable</Label>
                <Input
                  id="ind-responsable"
                  value={form.responsable}
                  onChange={(e) => setForm((f) => ({ ...f, responsable: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ind-orden">Orden</Label>
                <Input
                  id="ind-orden"
                  type="number"
                  value={form.orden}
                  onChange={(e) => setForm((f) => ({ ...f, orden: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              {editing ? 'Guardar cambios' : 'Crear indicador'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
