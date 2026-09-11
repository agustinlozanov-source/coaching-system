'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Trash2, Plus, MessagesSquare } from 'lucide-react';

import {
  getOrCreateBoard,
  listContribuciones,
  crearContribucion,
  eliminarContribucion,
  listIndicadores,
} from '@/lib/boardx/data';
import {
  CATEGORIA_CONTRIB,
  type Board,
  type CategoriaContrib,
  type Contribucion,
  type Indicador,
} from '@/types/boardx';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export const dynamic = 'force-dynamic';

const CATEGORIAS = Object.keys(CATEGORIA_CONTRIB) as CategoriaContrib[];

const SIN_VINCULAR = '__none__';

const BADGE_VARIANT: Record<
  CategoriaContrib,
  { variant: 'muted' | 'success' | 'info' | 'secondary'; className?: string }
> = {
  alerta: { variant: 'muted', className: 'text-destructive' },
  oportunidad: { variant: 'success' },
  referencia: { variant: 'info' },
  observacion: { variant: 'secondary' },
};

function formatFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = Date.now();
  const diff = now - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `hace ${days} d`;
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CanalPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<Board | null>(null);
  const [contribuciones, setContribuciones] = useState<Contribucion[]>([]);
  const [indicadores, setIndicadores] = useState<Indicador[]>([]);

  // Compose form
  const [categoria, setCategoria] = useState<CategoriaContrib>('observacion');
  const [texto, setTexto] = useState('');
  const [indicadorId, setIndicadorId] = useState<string>(SIN_VINCULAR);
  const [autor, setAutor] = useState('');
  const [publicando, setPublicando] = useState(false);

  // Filter
  const [filtro, setFiltro] = useState<CategoriaContrib | 'todas'>('todas');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const b = await getOrCreateBoard();
        if (!active) return;
        setBoard(b);
        if (b) {
          const [contribs, inds] = await Promise.all([
            listContribuciones(b.id),
            listIndicadores(b.id),
          ]);
          if (!active) return;
          setContribuciones(contribs);
          setIndicadores(inds);
        }
      } catch (e) {
        console.error(e);
        toast({
          title: 'Error al cargar el canal',
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

  async function reload() {
    if (!board) return;
    try {
      const list = await listContribuciones(board.id);
      setContribuciones(list);
    } catch (e) {
      console.error(e);
      toast({
        title: 'Error al recargar el canal',
        description: e instanceof Error ? e.message : 'Intenta de nuevo.',
        variant: 'destructive',
      });
    }
  }

  const indicadorNombre = useMemo(() => {
    const map = new Map<string, string>();
    for (const ind of indicadores) map.set(ind.id, ind.nombre);
    return map;
  }, [indicadores]);

  const feed = useMemo(() => {
    const ordered = [...contribuciones].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (filtro === 'todas') return ordered;
    return ordered.filter((c) => c.categoria === filtro);
  }, [contribuciones, filtro]);

  async function publicar() {
    if (!board) return;
    if (!texto.trim()) {
      toast({ title: 'Escribe una contribución', variant: 'destructive' });
      return;
    }
    setPublicando(true);
    try {
      await crearContribucion(board.id, {
        categoria,
        texto: texto.trim(),
        indicadorId: indicadorId === SIN_VINCULAR ? null : indicadorId,
        autor: autor.trim() || null,
      });
      toast({ title: 'Contribución publicada' });
      setTexto('');
      setIndicadorId(SIN_VINCULAR);
      setAutor('');
      await reload();
    } catch (e) {
      console.error(e);
      toast({
        title: 'No se pudo publicar',
        description: e instanceof Error ? e.message : 'Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setPublicando(false);
    }
  }

  async function borrar(c: Contribucion) {
    if (!confirm('¿Eliminar esta contribución?')) return;
    try {
      await eliminarContribucion(c.id);
      toast({ title: 'Contribución eliminada' });
      await reload();
    } catch (e) {
      console.error(e);
      toast({
        title: 'No se pudo eliminar',
        description: e instanceof Error ? e.message : 'Intenta de nuevo.',
        variant: 'destructive',
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
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <MessagesSquare className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Selecciona una organización</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Canal</h1>
        <p className="text-muted-foreground">
          Contribuciones entre reuniones: alertas, oportunidades, referencias y observaciones.
        </p>
      </div>

      {/* Compose */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select
                value={categoria}
                onValueChange={(v) => setCategoria(v as CategoriaContrib)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORIA_CONTRIB[cat].icon} {CATEGORIA_CONTRIB[cat].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="canal-autor">Autor (opcional)</Label>
              <Input
                id="canal-autor"
                value={autor}
                onChange={(e) => setAutor(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="canal-texto">Contribución</Label>
            <Textarea
              id="canal-texto"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Comparte una alerta, oportunidad, referencia u observación…"
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Vincular a indicador (opcional)</Label>
            <Select value={indicadorId} onValueChange={setIndicadorId}>
              <SelectTrigger>
                <SelectValue placeholder="Sin vincular" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_VINCULAR}>Sin vincular</SelectItem>
                {indicadores.map((ind) => (
                  <SelectItem key={ind.id} value={ind.id}>
                    {ind.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={publicar} disabled={publicando}>
              {publicando ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <Plus size={16} className="mr-2" />
              )}
              Publicar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={filtro === 'todas' ? 'default' : 'outline'}
          onClick={() => setFiltro('todas')}
        >
          Todas
        </Button>
        {CATEGORIAS.map((cat) => (
          <Button
            key={cat}
            type="button"
            size="sm"
            variant={filtro === cat ? 'default' : 'outline'}
            onClick={() => setFiltro(cat)}
          >
            {CATEGORIA_CONTRIB[cat].icon} {CATEGORIA_CONTRIB[cat].label}
          </Button>
        ))}
      </div>

      {/* Feed */}
      {feed.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <MessagesSquare className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              {filtro === 'todas'
                ? 'Aún no hay contribuciones en el canal.'
                : 'No hay contribuciones en esta categoría.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {feed.map((c) => {
            const cat = CATEGORIA_CONTRIB[c.categoria];
            const badge = BADGE_VARIANT[c.categoria];
            const vinculado = c.indicadorId ? indicadorNombre.get(c.indicadorId) : null;
            return (
              <Card key={c.id}>
                <CardContent className="flex items-start gap-3 pt-6">
                  <span className="text-xl leading-none" aria-hidden>
                    {cat.icon}
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={badge.variant} className={badge.className}>
                        {cat.label}
                      </Badge>
                      {vinculado && (
                        <span className="text-xs text-muted-foreground">
                          Indicador: {vinculado}
                        </span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                      {c.texto}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.autor ? `${c.autor} · ` : ''}
                      {formatFecha(c.createdAt)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => borrar(c)}
                    aria-label="Eliminar contribución"
                  >
                    <Trash2 size={16} className="text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
