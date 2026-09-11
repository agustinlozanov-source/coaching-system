'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Activity, Star } from 'lucide-react';

import {
  getOrCreateBoard,
  listPulsos,
  crearPulso,
  listAcuerdos,
  listReuniones,
  listAsientos,
} from '@/lib/boardx/data';
import { PULSO_PREGUNTAS, ESTADO_ACUERDO } from '@/types/boardx';
import type {
  Board,
  Pulso,
  Acuerdo,
  Reunion,
  Asiento,
  EstadoAcuerdo,
} from '@/types/boardx';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { GlowButton } from '@/components/ui/glow-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

// ── Helpers ────────────────────────────────────────────────────────────
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);
const fmtPct = (v: number | null) => (v == null ? '—' : `${Math.round(v)}%`);

/** Media de las respuestas (1-5) de un pulso. */
function mediaPulso(p: Pulso): number | null {
  const vals = Object.values(p.respuestas ?? {}).filter(
    (v): v is number => typeof v === 'number' && !Number.isNaN(v)
  );
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Efectividad promedio del consejo (escala 1-5) o null si no hay datos. */
function efectividad1a5(pulsos: Pulso[]): number | null {
  const medias = pulsos.map(mediaPulso).filter((v): v is number => v != null);
  if (medias.length === 0) return null;
  return medias.reduce((a, b) => a + b, 0) / medias.length;
}

/** % de asistencia de una reunión respecto al total de asientos. */
function asistenciaReunion(r: Reunion, totalAsientos: number): number | null {
  if (totalAsientos <= 0) return null;
  const presentes = Object.values(r.asistencia ?? {}).filter((a) => a?.presente).length;
  return pct(presentes, totalAsientos);
}

/** Participación promedio sobre reuniones (avg de presentes/asientos). */
function participacionPromedio(reuniones: Reunion[], totalAsientos: number): number | null {
  const vals = reuniones
    .map((r) => asistenciaReunion(r, totalAsientos))
    .filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

const ESTADO_COLOR: Record<EstadoAcuerdo, string> = {
  pendiente: '#94a3b8',
  en_progreso: '#3b82f6',
  hecho: '#22c55e',
};

function Barra({ value, color }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${clamp(value)}%`,
          backgroundColor: color ?? 'hsl(var(--primary))',
        }}
      />
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 py-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function SeccionTitulo({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-foreground">{children}</h2>;
}

// ── Pulso: draft ───────────────────────────────────────────────────────
type PulsoDraft = {
  reunionId: string; // '' = ninguna
  respuestas: Record<string, number>;
  comentario: string;
};

const emptyPulso = (): PulsoDraft => ({
  reunionId: '',
  respuestas: {},
  comentario: '',
});

export default function MetricasPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<Board | null>(null);
  const [pulsos, setPulsos] = useState<Pulso[]>([]);
  const [acuerdos, setAcuerdos] = useState<Acuerdo[]>([]);
  const [reuniones, setReuniones] = useState<Reunion[]>([]);
  const [asientos, setAsientos] = useState<Asiento[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<PulsoDraft>(emptyPulso());
  const [saving, setSaving] = useState(false);

  const reload = useCallback(
    async (boardId: string) => {
      const [ps, acs, rs, ass] = await Promise.all([
        listPulsos(boardId),
        listAcuerdos(boardId),
        listReuniones(boardId),
        listAsientos(boardId),
      ]);
      setPulsos(ps);
      setAcuerdos(acs);
      setReuniones(rs);
      setAsientos(ass);
    },
    []
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
            title: 'Error al cargar las métricas',
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

  // ── Cálculos derivados ─────────────────────────────────────────────────
  const totalAsientos = asientos.length;

  const acuerdosHechos = useMemo(
    () => acuerdos.filter((a) => a.estado === 'hecho').length,
    [acuerdos]
  );

  const pctCompletados = useMemo(
    () => (acuerdos.length > 0 ? pct(acuerdosHechos, acuerdos.length) : null),
    [acuerdos.length, acuerdosHechos]
  );

  const efectividad = useMemo(() => efectividad1a5(pulsos), [pulsos]);
  const participacion = useMemo(
    () => participacionPromedio(reuniones, totalAsientos),
    [reuniones, totalAsientos]
  );

  // Cumplimiento por estado
  const porEstado = useMemo(() => {
    const total = acuerdos.length;
    return (Object.keys(ESTADO_ACUERDO) as EstadoAcuerdo[]).map((e) => {
      const count = acuerdos.filter((a) => a.estado === e).length;
      return { estado: e, count, pct: total > 0 ? pct(count, total) : 0 };
    });
  }, [acuerdos]);

  // Acuerdos por responsable (hechos / total)
  const porResponsable = useMemo(() => {
    const map = new Map<string, { total: number; hechos: number }>();
    for (const a of acuerdos) {
      const key = (a.responsable ?? '').trim() || 'Sin asignar';
      const cur = map.get(key) ?? { total: 0, hechos: 0 };
      cur.total += 1;
      if (a.estado === 'hecho') cur.hechos += 1;
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([responsable, v]) => ({ responsable, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [acuerdos]);

  // Cobertura estratégica: % de acuerdos clasificacion 'estrategico'
  const coberturaEstrategica = useMemo(
    () =>
      acuerdos.length > 0
        ? pct(acuerdos.filter((a) => a.clasificacion === 'estrategico').length, acuerdos.length)
        : null,
    [acuerdos]
  );

  // Salud del consejo (0-100)
  const salud = useMemo(() => {
    const efectPct = efectividad != null ? (efectividad / 5) * 100 : null;
    return [
      { label: 'Seguimiento de acuerdos', value: pctCompletados },
      { label: 'Participación', value: participacion },
      { label: 'Efectividad', value: efectPct },
      { label: 'Cobertura estratégica', value: coberturaEstrategica },
    ];
  }, [pctCompletados, participacion, efectividad, coberturaEstrategica]);

  // Curva de madurez: reuniones por round con % de acuerdos hechos
  const curva = useMemo(() => {
    return reuniones
      .slice()
      .sort((a, b) => (a.round ?? 0) - (b.round ?? 0))
      .map((r) => {
        const propios = acuerdos.filter((a) => a.reunionId === r.id);
        const hechos = propios.filter((a) => a.estado === 'hecho').length;
        return {
          id: r.id,
          nombre: r.nombre ?? (r.round != null ? `Round ${r.round}` : 'Reunión'),
          round: r.round,
          total: propios.length,
          hechos,
          pct: propios.length > 0 ? pct(hechos, propios.length) : null,
        };
      });
  }, [reuniones, acuerdos]);

  // Impacto por consejero: acuerdos donde responsable coincide con su nombre
  const impacto = useMemo(() => {
    return asientos
      .map((s) => {
        const nombre = (s.nombre ?? '').trim().toLowerCase();
        const count =
          nombre.length > 0
            ? acuerdos.filter((a) => (a.responsable ?? '').trim().toLowerCase().includes(nombre))
                .length
            : 0;
        return { id: s.id, nombre: s.nombre, count };
      })
      .sort((a, b) => b.count - a.count);
  }, [asientos, acuerdos]);

  // ── Pulso ──────────────────────────────────────────────────────────────
  function openPulso() {
    setDraft(emptyPulso());
    setDialogOpen(true);
  }

  async function handleGuardarPulso() {
    if (!board) return;
    const respondidas = Object.keys(draft.respuestas).length;
    if (respondidas === 0) {
      toast({
        variant: 'destructive',
        title: 'Responde al menos una pregunta del pulso',
      });
      return;
    }
    setSaving(true);
    try {
      await crearPulso(
        board.id,
        draft.reunionId || null,
        draft.respuestas,
        draft.comentario.trim() || undefined
      );
      await reload(board.id);
      setDialogOpen(false);
      toast({ title: 'Pulso registrado', description: 'Gracias por tu retroalimentación anónima.' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'No se pudo registrar el pulso',
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSaving(false);
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

  const sinDatos =
    pulsos.length === 0 && acuerdos.length === 0 && reuniones.length === 0 && asientos.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Métricas</h1>
          <p className="text-muted-foreground">
            La salud del consejo y el cumplimiento de los acuerdos.
          </p>
        </div>
        <GlowButton onClick={openPulso} icon={<Activity size={16} className="ml-0.5" />}>
          Registrar pulso
        </GlowButton>
      </div>

      {sinDatos && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aún no hay datos. Registra reuniones, acuerdos y pulsos para ver las métricas del consejo.
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Reuniones" value={String(reuniones.length)} hint="Total registradas" />
        <Kpi
          label="Acuerdos completados"
          value={fmtPct(pctCompletados)}
          hint={`${acuerdosHechos} de ${acuerdos.length}`}
        />
        <Kpi
          label="Efectividad promedio"
          value={efectividad != null ? `${efectividad.toFixed(1)}/5` : '—'}
          hint={`${pulsos.length} pulso${pulsos.length === 1 ? '' : 's'}`}
        />
        <Kpi
          label="Participación promedio"
          value={fmtPct(participacion)}
          hint={`${totalAsientos} asiento${totalAsientos === 1 ? '' : 's'}`}
        />
      </div>

      {/* Cumplimiento de acuerdos */}
      <section className="space-y-3">
        <SeccionTitulo>Cumplimiento de acuerdos</SeccionTitulo>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="space-y-4 py-5">
              {acuerdos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin acuerdos registrados.</p>
              ) : (
                porEstado.map((row) => (
                  <div key={row.estado} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: ESTADO_COLOR[row.estado] }}
                        />
                        {ESTADO_ACUERDO[row.estado].label}
                      </span>
                      <span className="text-muted-foreground">
                        {row.count} · {Math.round(row.pct)}%
                      </span>
                    </div>
                    <Barra value={row.pct} color={ESTADO_COLOR[row.estado]} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-5">
              <p className="mb-3 text-sm font-medium text-foreground">Por responsable</p>
              {porResponsable.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin acuerdos asignados.</p>
              ) : (
                <div className="space-y-2">
                  {porResponsable.map((r) => (
                    <div
                      key={r.responsable}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 truncate text-foreground">{r.responsable}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {r.hechos}/{r.total}
                        </span>
                        <Badge variant={r.hechos === r.total ? 'success' : 'muted'}>
                          {Math.round(pct(r.hechos, r.total))}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Salud del consejo */}
      <section className="space-y-3">
        <SeccionTitulo>Salud del consejo</SeccionTitulo>
        <Card>
          <CardContent className="space-y-4 py-5">
            {salud.map((row) => (
              <div key={row.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{row.label}</span>
                  <span className="text-muted-foreground">{fmtPct(row.value)}</span>
                </div>
                <Barra value={row.value ?? 0} />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Curva de madurez */}
      <section className="space-y-3">
        <SeccionTitulo>Curva de madurez</SeccionTitulo>
        <Card>
          <CardContent className="space-y-4 py-5">
            {curva.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin reuniones registradas.</p>
            ) : (
              curva.map((r) => (
                <div key={r.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-foreground">
                      {r.round != null && (
                        <Badge variant="secondary">R{r.round}</Badge>
                      )}
                      <span className="min-w-0 truncate">{r.nombre}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {r.total > 0 ? `${r.hechos}/${r.total} · ${fmtPct(r.pct)}` : '—'}
                    </span>
                  </div>
                  <Barra value={r.pct ?? 0} color={ESTADO_COLOR.hecho} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      {/* Impacto por consejero */}
      <section className="space-y-3">
        <SeccionTitulo>Impacto por consejero</SeccionTitulo>
        <Card>
          <CardContent className="py-5">
            {impacto.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin consejeros registrados.</p>
            ) : (
              <div className="space-y-2">
                {impacto.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-foreground">{s.nombre}</span>
                    <Badge variant={s.count > 0 ? 'info' : 'muted'}>
                      {s.count} acuerdo{s.count === 1 ? '' : 's'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Dialog registrar pulso */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar pulso</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tu retroalimentación es anónima. Califica cada aspecto del 1 al 5.
            </p>

            <div className="space-y-1.5">
              <Label>Reunión (opcional)</Label>
              <Select
                value={draft.reunionId || undefined}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, reunionId: v === '__none__' ? '' : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="General (sin reunión)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">General (sin reunión)</SelectItem>
                  {reuniones.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.round != null ? `R${r.round} · ` : ''}
                      {r.nombre ?? 'Reunión'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {PULSO_PREGUNTAS.map((p) => (
                <div key={p.k} className="space-y-1.5">
                  <Label className="text-sm font-normal">{p.q}</Label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => {
                      const active = draft.respuestas[p.k] === n;
                      return (
                        <Button
                          key={n}
                          type="button"
                          variant={active ? 'default' : 'outline'}
                          size="icon"
                          className="h-9 w-9"
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              respuestas: { ...d.respuestas, [p.k]: n },
                            }))
                          }
                          aria-label={`${p.q} — ${n}`}
                        >
                          <span className="flex items-center gap-0.5 text-xs">
                            {n}
                            <Star
                              className="h-3 w-3"
                              fill={active ? 'currentColor' : 'none'}
                            />
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pulso-comentario">Comentario (opcional)</Label>
              <Textarea
                id="pulso-comentario"
                value={draft.comentario}
                onChange={(e) => setDraft((d) => ({ ...d, comentario: e.target.value }))}
                placeholder="¿Qué podría mejorar el consejo?"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <GlowButton onClick={handleGuardarPulso} loading={saving}>
              Enviar pulso
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
