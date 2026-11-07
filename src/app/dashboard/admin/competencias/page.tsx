'use client';

/**
 * Editor del tablero de evaluación: dimensiones y sus aspectos.
 *
 * Antes esta pantalla editaba `teamx_secciones_competencias`, una tabla que el
 * tablero nunca leyó — el hook que la consumía, useCompetencias, no lo importa
 * nadie. Se podían crear y borrar competencias ahí y ninguna evaluación
 * cambiaba. Ahora edita teamx_dimensiones y teamx_aspectos, que es lo que el
 * tablero sí usa.
 *
 * Borrar es borrar: una dimensión se lleva sus aspectos por el cascade del
 * esquema. Las evaluaciones ya hechas no se tocan, porque cada una congela su
 * configuración en config_snapshot al crearse.
 */

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/teamx/org';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Check, Loader2, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import Link from 'next/link';

type Aspecto = { id: string; nombre: string; descripcion: string | null; orden: number };
type Dimension = {
  id: string;
  nombre: string;
  descripcion: string | null;
  color: string;
  peso: number;
  orden: number;
  naturaleza: 'competencia' | 'kpi';
  aspectos: Aspecto[];
};

const COLORES = ['#3533cd', '#1aab99', '#8b5cf6', '#ec4899', '#f59e0b', '#14806a', '#ef4444', '#0ea5a3'];

export default function CompetenciasPage() {
  const { toast } = useToast();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [dims, setDims] = useState<Dimension[] | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  // Edición en sitio
  const [editDim, setEditDim] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Partial<Dimension>>({});
  const [editAsp, setEditAsp] = useState<string | null>(null);
  const [textoAsp, setTextoAsp] = useState('');
  const [descAsp, setDescAsp] = useState('');

  // Altas
  const [nuevaDim, setNuevaDim] = useState('');
  const [abriendoDim, setAbriendoDim] = useState(false);
  const [nuevoAsp, setNuevoAsp] = useState<{ dimId: string; texto: string } | null>(null);

  const cargar = useCallback(async () => {
    const supabase = createClient();
    const id = await getActiveOrgId();
    setOrgId(id);
    if (!id) { setDims([]); return; }

    const { data: filas } = await supabase
      .from('teamx_dimensiones').select('*')
      .eq('organizacion_id', id).eq('activo', true).order('orden');

    const ids = (filas ?? []).map((d: any) => d.id);
    const { data: asp } = ids.length
      ? await supabase.from('teamx_aspectos').select('*').in('dimension_id', ids).eq('activo', true).order('orden')
      : { data: [] as any[] };

    const porDim = new Map<string, Aspecto[]>();
    (asp ?? []).forEach((a: any) => {
      const arr = porDim.get(a.dimension_id) ?? [];
      arr.push({ id: a.id, nombre: a.nombre, descripcion: a.descripcion ?? null, orden: a.orden });
      porDim.set(a.dimension_id, arr);
    });

    setDims((filas ?? []).map((d: any) => ({
      id: d.id, nombre: d.nombre, descripcion: d.descripcion ?? null, color: d.color ?? '#1aab99',
      peso: Number(d.peso ?? 1), orden: d.orden, naturaleza: d.naturaleza,
      aspectos: porDim.get(d.id) ?? [],
    })));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function fallo(e: any) {
    toast({ title: 'No se pudo guardar', description: e?.message ?? '', variant: 'destructive' });
  }

  /* ── Dimensiones ─────────────────────────────────────────────────────── */

  async function crearDim() {
    const nombre = nuevaDim.trim();
    if (!nombre || !orgId) return;
    setOcupado('nueva-dim');
    const orden = (dims?.length ?? 0) + 1;
    const { error } = await createClient().from('teamx_dimensiones').insert({
      organizacion_id: orgId, nombre, orden,
      color: COLORES[orden % COLORES.length], naturaleza: 'competencia', peso: 1, activo: true,
    });
    setOcupado(null);
    if (error) return fallo(error);
    setNuevaDim(''); setAbriendoDim(false);
    await cargar();
  }

  async function guardarDim(d: Dimension) {
    const nombre = (borrador.nombre ?? d.nombre).trim();
    if (!nombre) return;
    setOcupado(d.id);
    const { error } = await createClient().from('teamx_dimensiones').update({
      nombre,
      descripcion: (borrador.descripcion ?? d.descripcion ?? '').trim() || null,
      color: borrador.color ?? d.color,
      naturaleza: borrador.naturaleza ?? d.naturaleza,
      peso: Number(borrador.peso ?? d.peso) || 1,
      updated_at: new Date().toISOString(),
    }).eq('id', d.id);
    setOcupado(null);
    if (error) return fallo(error);
    setEditDim(null); setBorrador({});
    await cargar();
  }

  async function borrarDim(d: Dimension) {
    const cuantos = d.aspectos.length;
    const aviso = cuantos
      ? `¿Borrar "${d.nombre}"?\n\nSe lleva sus ${cuantos} aspecto${cuantos === 1 ? '' : 's'}. Las evaluaciones ya hechas no se tocan.`
      : `¿Borrar "${d.nombre}"?\n\nLas evaluaciones ya hechas no se tocan.`;
    if (!window.confirm(aviso)) return;
    setOcupado(d.id);
    const { error } = await createClient().from('teamx_dimensiones').delete().eq('id', d.id);
    setOcupado(null);
    if (error) return fallo(error);
    await cargar();
  }

  /* ── Aspectos ────────────────────────────────────────────────────────── */

  async function crearAsp() {
    if (!nuevoAsp) return;
    const nombre = nuevoAsp.texto.trim();
    if (!nombre) return;
    const dim = dims?.find((x) => x.id === nuevoAsp.dimId);
    setOcupado(nuevoAsp.dimId);
    const { error } = await createClient().from('teamx_aspectos').insert({
      dimension_id: nuevoAsp.dimId, nombre, orden: (dim?.aspectos.length ?? 0) + 1, activo: true,
    });
    setOcupado(null);
    if (error) return fallo(error);
    setNuevoAsp(null);
    await cargar();
  }

  async function guardarAsp(id: string) {
    const nombre = textoAsp.trim();
    if (!nombre) return;
    setOcupado(id);
    const { error } = await createClient().from('teamx_aspectos')
      .update({ nombre, descripcion: descAsp.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', id);
    setOcupado(null);
    if (error) return fallo(error);
    setEditAsp(null);
    await cargar();
  }

  async function borrarAsp(a: Aspecto) {
    if (!window.confirm(`¿Borrar "${a.nombre}"?`)) return;
    setOcupado(a.id);
    const { error } = await createClient().from('teamx_aspectos').delete().eq('id', a.id);
    setOcupado(null);
    if (error) return fallo(error);
    await cargar();
  }

  if (dims === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Esto es el tablero de evaluación</p>
              <p className="text-sm text-muted-foreground">
                Cada <strong>dimensión</strong> es un bloque del tablero y cada{' '}
                <strong>aspecto</strong> es una línea que el coach califica. Lo que cambies aquí
                aplica a las evaluaciones nuevas; las anteriores conservan su configuración.
              </p>
              <p className="text-sm text-muted-foreground">
                Las de tipo <strong>KPI</strong> no entran al promedio de competencias.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {dims.map((d) => {
          const editando = editDim === d.id;
          return (
            <Card key={d.id}>
              <CardContent className="pt-6">
                {editando ? (
                  <div className="grid gap-4 sm:grid-cols-[1fr_140px_110px_90px]">
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Nombre</Label>
                      <Input
                        autoFocus
                        value={borrador.nombre ?? d.nombre}
                        onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tipo</Label>
                      <select
                        value={borrador.naturaleza ?? d.naturaleza}
                        onChange={(e) => setBorrador({ ...borrador, naturaleza: e.target.value as any })}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="competencia">Competencia</option>
                        <option value="kpi">KPI</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Peso</Label>
                      <Input
                        type="number" min="0.1" step="0.1"
                        value={borrador.peso ?? d.peso}
                        onChange={(e) => setBorrador({ ...borrador, peso: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Color</Label>
                      <input
                        type="color"
                        value={borrador.color ?? d.color}
                        onChange={(e) => setBorrador({ ...borrador, color: e.target.value })}
                        className="h-10 w-full cursor-pointer rounded-md border bg-background"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-4">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                        Descripción
                      </Label>
                      <Input
                        value={borrador.descripcion ?? d.descripcion ?? ''}
                        onChange={(e) => setBorrador({ ...borrador, descripcion: e.target.value })}
                        placeholder="Para qué sirve esta dimensión"
                      />
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-4">
                      <Button size="sm" onClick={() => guardarDim(d)} disabled={ocupado === d.id}>
                        {ocupado === d.id
                          ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          : <Check className="mr-2 h-4 w-4" />}
                        Guardar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditDim(null); setBorrador({}); }}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="h-8 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{d.nombre}</p>
                      {d.descripcion && (
                        <p className="truncate text-xs text-muted-foreground">{d.descripcion}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {d.aspectos.length} aspecto{d.aspectos.length === 1 ? '' : 's'}
                        {d.naturaleza === 'kpi' && ' · KPI'}
                        {d.peso !== 1 && ` · peso ${d.peso}`}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" title="Editar"
                      onClick={() => { setEditDim(d.id); setBorrador({}); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" title="Borrar" disabled={ocupado === d.id}
                      onClick={() => borrarDim(d)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700">
                      {ocupado === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                )}

                <div className="mt-4 space-y-1.5 border-t pt-4">
                  {d.aspectos.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
                      {editAsp === a.id ? (
                        <>
                          <div className="flex-1 space-y-1">
                            <Input
                              autoFocus value={textoAsp}
                              onChange={(e) => setTextoAsp(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') guardarAsp(a.id); if (e.key === 'Escape') setEditAsp(null); }}
                              className="h-8"
                            />
                            <Input
                              value={descAsp}
                              onChange={(e) => setDescAsp(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') guardarAsp(a.id); if (e.key === 'Escape') setEditAsp(null); }}
                              placeholder="Cómo se sabe que se cumple (opcional)"
                              className="h-7 text-xs"
                            />
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => guardarAsp(a.id)} disabled={ocupado === a.id}>
                            <Check className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditAsp(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm">
                            {a.nombre}
                            {a.descripcion && (
                              <span className="block text-xs text-muted-foreground">{a.descripcion}</span>
                            )}
                          </span>
                          <Button size="sm" variant="ghost" title="Editar"
                            onClick={() => { setEditAsp(a.id); setTextoAsp(a.nombre); setDescAsp(a.descripcion ?? ''); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Borrar" disabled={ocupado === a.id}
                            onClick={() => borrarAsp(a)}
                            className="text-red-600 hover:bg-red-50 hover:text-red-700">
                            {ocupado === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </>
                      )}
                    </div>
                  ))}

                  {nuevoAsp?.dimId === d.id ? (
                    <div className="flex items-center gap-2 pt-1">
                      <Input
                        autoFocus placeholder="Ej: Reunión de alineación semanal"
                        value={nuevoAsp.texto}
                        onChange={(e) => setNuevoAsp({ ...nuevoAsp, texto: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') crearAsp(); if (e.key === 'Escape') setNuevoAsp(null); }}
                        className="h-8"
                      />
                      <Button size="sm" onClick={crearAsp} disabled={ocupado === d.id}>Agregar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setNuevoAsp(null)}>Cancelar</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" className="text-muted-foreground"
                      onClick={() => setNuevoAsp({ dimId: d.id, texto: '' })}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Agregar aspecto
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Link href="/dashboard/admin/competencias/importar">
        <Button variant="outline" className="w-full border-dashed">
          <Upload className="mr-2 h-4 w-4" /> Traer un tablero escrito
        </Button>
      </Link>

      {abriendoDim ? (
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 pt-6">
            <div className="min-w-[260px] flex-1 space-y-1.5">
              <Label htmlFor="nd">Nombre de la dimensión</Label>
              <Input
                id="nd" autoFocus placeholder="Ej: Planeación y Organización"
                value={nuevaDim}
                onChange={(e) => setNuevaDim(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') crearDim(); if (e.key === 'Escape') setAbriendoDim(false); }}
              />
            </div>
            <Button onClick={crearDim} disabled={ocupado === 'nueva-dim'}>
              {ocupado === 'nueva-dim'
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Plus className="mr-2 h-4 w-4" />}
              Crear
            </Button>
            <Button variant="ghost" onClick={() => { setAbriendoDim(false); setNuevaDim(''); }}>Cancelar</Button>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setAbriendoDim(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nueva dimensión
        </Button>
      )}

      {dims.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Este tablero está vacío. Crea la primera dimensión.
        </p>
      )}
    </div>
  );
}
