'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Send, Copy, Sparkles, Check } from 'lucide-react';

import {
  getOrCreateBoard,
  listReuniones,
  listAcuerdos,
  listIndicadores,
  crearPlan,
  listPlanes,
  actualizarPlan,
} from '@/lib/boardx/data';
import {
  PRIORIDAD,
  CLASIFICACION,
  TIPO_ACUERDO,
} from '@/types/boardx';
import type {
  Acuerdo,
  Board,
  Indicador,
  Reunion,
  Plan,
} from '@/types/boardx';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GlowButton } from '@/components/ui/glow-button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

// ── Helpers ────────────────────────────────────────────────────────────
const GENERAL = 'General';

const ESTADO_PLAN: Record<Plan['estado'], { label: string; variant: 'muted' | 'info' | 'success' }> = {
  despachado: { label: 'Despachado', variant: 'muted' },
  recibido: { label: 'Recibido', variant: 'info' },
  presentado: { label: 'Presentado', variant: 'success' },
};

const ESTADOS_PLAN: Plan['estado'][] = ['despachado', 'recibido', 'presentado'];

const clasificacionVariant = (c: Acuerdo['clasificacion']) =>
  c === 'estrategico' ? ('info' as const) : ('secondary' as const);

function formatFecha(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

const TODAS = '__todas__';

type GrupoArea = { area: string; acuerdos: Acuerdo[] };

export default function DespachoPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<Board | null>(null);
  const [reuniones, setReuniones] = useState<Reunion[]>([]);
  const [acuerdos, setAcuerdos] = useState<Acuerdo[]>([]);
  const [indicadores, setIndicadores] = useState<Indicador[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);

  const [reunionSel, setReunionSel] = useState<string>(TODAS);

  // Estado por área: resumen editable, spinner IA, spinner despacho, copiado
  const [resumenes, setResumenes] = useState<Record<string, string>>({});
  const [generando, setGenerando] = useState<Record<string, boolean>>({});
  const [despachando, setDespachando] = useState<Record<string, boolean>>({});
  const [copiado, setCopiado] = useState<Record<string, boolean>>({});
  const [planBusy, setPlanBusy] = useState<Record<string, boolean>>({});

  const recargarPlanes = useCallback(async (boardId: string) => {
    const rows = await listPlanes(boardId);
    setPlanes(rows);
  }, []);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      try {
        const b = await getOrCreateBoard();
        if (cancelado) return;
        setBoard(b);
        if (!b) return;
        const [rs, as, inds, pls] = await Promise.all([
          listReuniones(b.id),
          listAcuerdos(b.id),
          listIndicadores(b.id),
          listPlanes(b.id),
        ]);
        if (cancelado) return;
        setReuniones(rs);
        setAcuerdos(as);
        setIndicadores(inds);
        setPlanes(pls);
        // Default: la reunión más reciente (listReuniones viene ordenado desc).
        if (rs.length > 0) setReunionSel(rs[0].id);
      } catch (e) {
        if (!cancelado) {
          toast({
            title: 'No se pudo cargar el despacho',
            description: e instanceof Error ? e.message : 'Error desconocido',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [toast]);

  // indicadorId → dimension (área)
  const areaPorIndicador = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of indicadores) {
      m.set(i.id, (i.dimension ?? '').trim() || GENERAL);
    }
    return m;
  }, [indicadores]);

  const nombreReunion = useCallback(
    (r: Reunion) => r.nombre?.trim() || (r.round != null ? `Round ${r.round}` : `Reunión ${r.id.slice(0, 6)}`),
    [],
  );

  // Acuerdos filtrados por la reunión seleccionada
  const acuerdosFiltrados = useMemo(() => {
    if (reunionSel === TODAS) return acuerdos;
    return acuerdos.filter((a) => a.reunionId === reunionSel);
  }, [acuerdos, reunionSel]);

  // Agrupar por área
  const grupos = useMemo<GrupoArea[]>(() => {
    const map = new Map<string, Acuerdo[]>();
    for (const a of acuerdosFiltrados) {
      const area = (a.indicadorId && areaPorIndicador.get(a.indicadorId)) || GENERAL;
      const arr = map.get(area);
      if (arr) arr.push(a);
      else map.set(area, [a]);
    }
    return Array.from(map.entries())
      .map(([area, list]) => ({ area, acuerdos: list }))
      .sort((x, y) => x.area.localeCompare(y.area, 'es'));
  }, [acuerdosFiltrados, areaPorIndicador]);

  // ── Acciones ───────────────────────────────────────────────────────────
  const generarResumen = useCallback(
    async (area: string, list: Acuerdo[]) => {
      if (list.length === 0) {
        toast({ title: 'No hay acuerdos para resumir', variant: 'destructive' });
        return;
      }
      setGenerando((s) => ({ ...s, [area]: true }));
      try {
        const res = await fetch('/api/boardx/ia', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            tarea: 'despacho',
            area,
            acuerdos: list.map((a) => ({
              texto: a.texto,
              prioridad: a.prioridad,
              clasificacion: a.clasificacion,
            })),
          }),
        });
        const data = (await res.json()) as { resumen?: string; error?: string };
        if (!res.ok || data.error || !data.resumen) {
          toast({
            title: 'No se pudo generar el resumen',
            description: data.error ?? `Error ${res.status}`,
            variant: 'destructive',
          });
          return;
        }
        setResumenes((s) => ({ ...s, [area]: data.resumen as string }));
      } catch (e) {
        toast({
          title: 'No se pudo generar el resumen',
          description: e instanceof Error ? e.message : 'Error desconocido',
          variant: 'destructive',
        });
      } finally {
        setGenerando((s) => ({ ...s, [area]: false }));
      }
    },
    [toast],
  );

  const copiar = useCallback(
    async (area: string) => {
      const texto = resumenes[area];
      if (!texto) return;
      try {
        await navigator.clipboard.writeText(texto);
        setCopiado((s) => ({ ...s, [area]: true }));
        setTimeout(() => setCopiado((s) => ({ ...s, [area]: false })), 1500);
        toast({ title: 'Copiado' });
      } catch (e) {
        toast({
          title: 'No se pudo copiar',
          description: e instanceof Error ? e.message : 'Error desconocido',
          variant: 'destructive',
        });
      }
    },
    [resumenes, toast],
  );

  const despachar = useCallback(
    async (area: string) => {
      if (!board) return;
      setDespachando((s) => ({ ...s, [area]: true }));
      try {
        await crearPlan(board.id, {
          reunionId: reunionSel === TODAS ? null : reunionSel,
          area,
          resumen: resumenes[area] ?? null,
          estado: 'despachado',
        });
        await recargarPlanes(board.id);
        toast({ title: `Despachado a ${area}` });
      } catch (e) {
        toast({
          title: 'No se pudo despachar',
          description: e instanceof Error ? e.message : 'Error desconocido',
          variant: 'destructive',
        });
      } finally {
        setDespachando((s) => ({ ...s, [area]: false }));
      }
    },
    [board, reunionSel, resumenes, recargarPlanes, toast],
  );

  const cambiarEstadoPlan = useCallback(
    async (plan: Plan, estado: Plan['estado']) => {
      if (!board || estado === plan.estado) return;
      setPlanBusy((s) => ({ ...s, [plan.id]: true }));
      try {
        await actualizarPlan(plan.id, { estado });
        await recargarPlanes(board.id);
      } catch (e) {
        toast({
          title: 'No se pudo actualizar el estado',
          description: e instanceof Error ? e.message : 'Error desconocido',
          variant: 'destructive',
        });
      } finally {
        setPlanBusy((s) => ({ ...s, [plan.id]: false }));
      }
    },
    [board, recargarPlanes, toast],
  );

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
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Selecciona una organización</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Despacho</h1>
        <p className="text-muted-foreground">
          Filtra los acuerdos por área y despacha a cada director con un resumen.
        </p>
      </div>

      {/* Selector de reunión */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Reunión</span>
        <Select value={reunionSel} onValueChange={setReunionSel}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Selecciona una reunión" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Todas</SelectItem>
            {reuniones.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {nombreReunion(r)}
                {r.fecha ? ` · ${formatFecha(r.fecha)}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Secciones por área */}
      {grupos.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No hay acuerdos para la reunión seleccionada.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grupos.map(({ area, acuerdos: list }) => {
            const resumen = resumenes[area] ?? '';
            const isGen = !!generando[area];
            const isDisp = !!despachando[area];
            return (
              <Card key={area}>
                <CardContent className="space-y-4 py-5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">
                      {area}{' '}
                      <span className="text-sm font-normal text-muted-foreground">
                        ({list.length})
                      </span>
                    </h2>
                  </div>

                  {/* Lista de acuerdos */}
                  <ul className="space-y-2">
                    {list.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-start gap-3 rounded-md border border-border px-3 py-2"
                      >
                        <span className="mt-0.5 text-base leading-none" aria-hidden>
                          {TIPO_ACUERDO[a.tipo]?.icon ?? '•'}
                        </span>
                        <span
                          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: PRIORIDAD[a.prioridad]?.color ?? '#94a3b8' }}
                          title={PRIORIDAD[a.prioridad]?.label}
                          aria-label={PRIORIDAD[a.prioridad]?.label}
                        />
                        <span className="flex-1 text-sm">{a.texto}</span>
                        <Badge variant={clasificacionVariant(a.clasificacion)}>
                          {CLASIFICACION[a.clasificacion]?.label ?? a.clasificacion}
                        </Badge>
                      </li>
                    ))}
                  </ul>

                  {/* Acciones */}
                  <div className="flex flex-wrap items-center gap-2">
                    <GlowButton
                      onClick={() => generarResumen(area, list)}
                      loading={isGen}
                      disabled={isGen}
                      icon={<Sparkles size={16} className="ml-0.5" />}
                    >
                      Generar resumen IA
                    </GlowButton>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copiar(area)}
                      disabled={!resumen}
                    >
                      {copiado[area] ? (
                        <Check className="mr-1.5 h-4 w-4" />
                      ) : (
                        <Copy className="mr-1.5 h-4 w-4" />
                      )}
                      Copiar
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => despachar(area)}
                      disabled={isDisp}
                    >
                      {isDisp ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-1.5 h-4 w-4" />
                      )}
                      Despachar
                    </Button>
                  </div>

                  {/* Resumen editable */}
                  {resumen && (
                    <div className="rounded-md border border-border bg-muted/30 p-3">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Resumen para {area}
                      </p>
                      <Textarea
                        value={resumen}
                        onChange={(e) =>
                          setResumenes((s) => ({ ...s, [area]: e.target.value }))
                        }
                        className="min-h-[120px]"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Despachados */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Despachados</h2>
        {planes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Aún no has despachado ningún plan.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {planes.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex flex-wrap items-center gap-3 py-3">
                  <span className="font-medium">{p.area}</span>
                  <Badge variant={ESTADO_PLAN[p.estado]?.variant ?? 'muted'}>
                    {ESTADO_PLAN[p.estado]?.label ?? p.estado}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatFecha(p.createdAt)}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    {planBusy[p.id] && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    <Select
                      value={p.estado}
                      onValueChange={(v) => cambiarEstadoPlan(p, v as Plan['estado'])}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS_PLAN.map((e) => (
                          <SelectItem key={e} value={e}>
                            {ESTADO_PLAN[e].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
