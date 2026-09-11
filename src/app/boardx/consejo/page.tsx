'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, Building2 } from 'lucide-react';

import {
  getOrCreateBoard,
  updateBoard,
  listAsientos,
  crearAsiento,
  actualizarAsiento,
  eliminarAsiento,
} from '@/lib/boardx/data';
import type { Asiento, Board } from '@/types/boardx';

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

export const dynamic = 'force-dynamic';

type Tipo = 'interno' | 'externo';

type FormState = {
  nombre: string;
  rol: string;
  especializacion: string;
  nivelTecnico: string;
  tipo: Tipo;
  consultora: string;
  email: string;
  telefono: string;
  orden: string;
  cumpleanios: string;
  aniversario: string;
};

const emptyForm: FormState = {
  nombre: '',
  rol: '',
  especializacion: '',
  nivelTecnico: '',
  tipo: 'externo',
  consultora: '',
  email: '',
  telefono: '',
  orden: '0',
  cumpleanios: '',
  aniversario: '',
};

export default function ConsejoPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<Board | null>(null);
  const [asientos, setAsientos] = useState<Asiento[]>([]);

  // Board config
  const [nombre, setNombre] = useState('');
  const [valores, setValores] = useState<string[]>([]);
  const [nuevoValor, setNuevoValor] = useState('');
  const [savingBoard, setSavingBoard] = useState(false);

  // Dialog
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Asiento | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [savingAsiento, setSavingAsiento] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const b = await getOrCreateBoard();
        if (!active) return;
        setBoard(b);
        if (b) {
          setNombre(b.nombre ?? '');
          setValores(b.valores ?? []);
          const list = await listAsientos(b.id);
          if (!active) return;
          setAsientos(list);
        }
      } catch (e) {
        console.error(e);
        toast({
          title: 'Error al cargar el consejo',
          description: e instanceof Error ? e.message : 'Intenta de nuevo.',
          variant: 'destructive',
        });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reloadAsientos() {
    if (!board) return;
    try {
      const list = await listAsientos(board.id);
      setAsientos(list);
    } catch (e) {
      console.error(e);
      toast({
        title: 'Error al recargar consejeros',
        description: e instanceof Error ? e.message : 'Intenta de nuevo.',
        variant: 'destructive',
      });
    }
  }

  // ── Board config ─────────────────────────────────────────────────────
  function addValor() {
    const v = nuevoValor.trim();
    if (!v) return;
    if (valores.includes(v)) {
      setNuevoValor('');
      return;
    }
    setValores((prev) => [...prev, v]);
    setNuevoValor('');
  }

  function removeValor(v: string) {
    setValores((prev) => prev.filter((x) => x !== v));
  }

  async function guardarBoard() {
    if (!board) return;
    setSavingBoard(true);
    try {
      await updateBoard(board.id, { nombre: nombre.trim() || null, valores });
      setBoard({ ...board, nombre: nombre.trim() || null, valores });
      toast({ title: 'Configuración guardada' });
    } catch (e) {
      console.error(e);
      toast({
        title: 'No se pudo guardar',
        description: e instanceof Error ? e.message : 'Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setSavingBoard(false);
    }
  }

  // ── Dialog helpers ───────────────────────────────────────────────────
  function abrirCrear() {
    setEditing(null);
    setForm({ ...emptyForm, orden: String(asientos.length) });
    setOpen(true);
  }

  function abrirEditar(a: Asiento) {
    setEditing(a);
    setForm({
      nombre: a.nombre ?? '',
      rol: a.rol ?? '',
      especializacion: a.especializacion ?? '',
      nivelTecnico: a.nivelTecnico ?? '',
      tipo: a.tipo,
      consultora: a.consultora ?? '',
      email: a.email ?? '',
      telefono: a.telefono ?? '',
      orden: String(a.orden ?? 0),
      cumpleanios: a.personales?.cumpleanios ?? '',
      aniversario: a.personales?.aniversario ?? '',
    });
    setOpen(true);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function guardarAsiento() {
    if (!board) return;
    if (!form.nombre.trim()) {
      toast({ title: 'El nombre es obligatorio', variant: 'destructive' });
      return;
    }
    setSavingAsiento(true);
    const payload: Partial<Asiento> = {
      nombre: form.nombre.trim(),
      rol: form.rol.trim() || null,
      especializacion: form.especializacion.trim() || null,
      nivelTecnico: form.nivelTecnico.trim() || null,
      tipo: form.tipo,
      consultora: form.consultora.trim() || null,
      email: form.email.trim() || null,
      telefono: form.telefono.trim() || null,
      orden: Number.isFinite(Number(form.orden)) ? Number(form.orden) : 0,
      personales: {
        ...(form.cumpleanios ? { cumpleanios: form.cumpleanios } : {}),
        ...(form.aniversario ? { aniversario: form.aniversario } : {}),
      },
    };
    try {
      if (editing) {
        await actualizarAsiento(editing.id, payload);
        toast({ title: 'Consejero actualizado' });
      } else {
        await crearAsiento(board.id, payload);
        toast({ title: 'Consejero agregado' });
      }
      setOpen(false);
      setEditing(null);
      await reloadAsientos();
    } catch (e) {
      console.error(e);
      toast({
        title: 'No se pudo guardar el consejero',
        description: e instanceof Error ? e.message : 'Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setSavingAsiento(false);
    }
  }

  async function borrarAsiento(a: Asiento) {
    if (!confirm(`¿Eliminar a ${a.nombre} del consejo?`)) return;
    try {
      await eliminarAsiento(a.id);
      toast({ title: 'Consejero eliminado' });
      await reloadAsientos();
    } catch (e) {
      console.error(e);
      toast({
        title: 'No se pudo eliminar',
        description: e instanceof Error ? e.message : 'Intenta de nuevo.',
        variant: 'destructive',
      });
    }
  }

  // ── Render ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <Building2 className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Selecciona una organización</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Consejo</h1>
          <p className="text-muted-foreground">
            Configura el consejo técnico y administra a sus consejeros.
          </p>
        </div>
        <GlowButton onClick={abrirCrear} icon={<Plus size={16} className="ml-0.5" />}>
          Nuevo consejero
        </GlowButton>
      </div>

      {/* Board config */}
      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="board-nombre">Nombre del consejo</Label>
            <Input
              id="board-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Consejo Técnico 2026"
            />
          </div>

          <div className="space-y-2">
            <Label>Valores de la empresa</Label>
            {valores.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {valores.map((v) => (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-sm text-foreground"
                  >
                    {v}
                    <button
                      type="button"
                      onClick={() => removeValor(v)}
                      className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                      aria-label={`Quitar ${v}`}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aún no hay valores.</p>
            )}
            <div className="flex gap-2 pt-1">
              <Input
                value={nuevoValor}
                onChange={(e) => setNuevoValor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addValor();
                  }
                }}
                placeholder="Agregar un valor…"
              />
              <Button type="button" variant="outline" onClick={addValor}>
                <Plus size={16} className="mr-1" />
                Agregar
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={guardarBoard} disabled={savingBoard}>
              {savingBoard && <Loader2 size={16} className="mr-2 animate-spin" />}
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Asientos grid */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Consejeros</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {asientos.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex h-full flex-col gap-2 pt-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-foreground">{a.nombre}</p>
                    {a.rol && (
                      <p className="truncate text-sm text-muted-foreground">{a.rol}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => abrirEditar(a)}
                      aria-label={`Editar ${a.nombre}`}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => borrarAsiento(a)}
                      aria-label={`Eliminar ${a.nombre}`}
                    >
                      <Trash2 size={16} className="text-destructive" />
                    </Button>
                  </div>
                </div>

                {a.especializacion && (
                  <p className="text-sm text-muted-foreground">{a.especializacion}</p>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                  {a.tipo === 'interno' ? (
                    <Badge variant="info">Interno</Badge>
                  ) : (
                    <Badge variant="secondary">Externo</Badge>
                  )}
                  {a.consultora && <Badge variant="muted">{a.consultora}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Empty add card */}
          <button
            type="button"
            onClick={abrirCrear}
            className="flex min-h-[8rem] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card/50 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus size={20} />
            <span className="text-sm font-medium">Nuevo consejero</span>
          </button>
        </div>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar consejero' : 'Nuevo consejero'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="f-nombre">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="f-nombre"
                value={form.nombre}
                onChange={(e) => setField('nombre', e.target.value)}
                placeholder="Nombre completo"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-rol">Rol</Label>
              <Input
                id="f-rol"
                value={form.rol}
                onChange={(e) => setField('rol', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-esp">Especialización</Label>
              <Input
                id="f-esp"
                value={form.especializacion}
                onChange={(e) => setField('especializacion', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-nivel">Nivel técnico</Label>
              <Input
                id="f-nivel"
                value={form.nivelTecnico}
                onChange={(e) => setField('nivelTecnico', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setField('tipo', v as Tipo)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interno">Interno</SelectItem>
                  <SelectItem value="externo">Externo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-consultora">Consultora</Label>
              <Input
                id="f-consultora"
                value={form.consultora}
                onChange={(e) => setField('consultora', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-orden">Orden</Label>
              <Input
                id="f-orden"
                type="number"
                value={form.orden}
                onChange={(e) => setField('orden', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-email">Email</Label>
              <Input
                id="f-email"
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-tel">Teléfono</Label>
              <Input
                id="f-tel"
                value={form.telefono}
                onChange={(e) => setField('telefono', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-cumple">Cumpleaños</Label>
              <Input id="f-cumple" type="date" value={form.cumpleanios} onChange={(e) => setField('cumpleanios', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-aniv">Aniversario</Label>
              <Input id="f-aniv" type="date" value={form.aniversario} onChange={(e) => setField('aniversario', e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={guardarAsiento} disabled={savingAsiento}>
              {savingAsiento && <Loader2 size={16} className="mr-2 animate-spin" />}
              {editing ? 'Guardar cambios' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
