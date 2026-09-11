'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowRight, CalendarClock, Armchair } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  getOrCreateBoard, listAsientos, listReuniones, listAcuerdos, listIndicadores,
} from '@/lib/boardx/data';
import {
  PRIORIDAD, CLASIFICACION, semaforoIndicador, SEMAFORO_IND_COLOR,
  type Acuerdo, type Indicador, type Reunion,
} from '@/types/boardx';

export const dynamic = 'force-dynamic';

export default function BoardxInicio() {
  const [loading, setLoading] = useState(true);
  const [boardNombre, setBoardNombre] = useState<string | null>(null);
  const [asientos, setAsientos] = useState(0);
  const [reuniones, setReuniones] = useState<Reunion[]>([]);
  const [acuerdos, setAcuerdos] = useState<Acuerdo[]>([]);
  const [indicadores, setIndicadores] = useState<Indicador[]>([]);
  const [sinOrg, setSinOrg] = useState(false);

  useEffect(() => {
    (async () => {
      const board = await getOrCreateBoard();
      if (!board) { setSinOrg(true); setLoading(false); return; }
      setBoardNombre(board.nombre);
      const [as, re, ac, ind] = await Promise.all([
        listAsientos(board.id), listReuniones(board.id), listAcuerdos(board.id), listIndicadores(board.id),
      ]);
      setAsientos(as.length);
      setReuniones(re);
      setAcuerdos(ac);
      setIndicadores(ind);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;
  if (sinOrg) return <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">Selecciona una organización para configurar su consejo.</div>;

  const pendientes = acuerdos.filter((a) => a.estado !== 'hecho');
  const enRojo = indicadores.filter((i) => semaforoIndicador(i) === 'rojo').length;
  const proxima = reuniones.find((r) => r.estado !== 'cerrada') ?? reuniones[0] ?? null;

  // Índice de preparación de la próxima reunión (F7)
  const prep = proxima ? Math.round(100 * (
    (proxima.agenda.length ? 1 : 0) +
    (indicadores.length ? 1 : 0) +
    (asientos ? 1 : 0) +
    (proxima.tematica && proxima.kpiPrincipal ? 1 : 0)
  ) / 4) : 0;
  const prepColor = prep >= 75 ? '#22c55e' : prep >= 50 ? '#eab308' : '#ef4444';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inicio</h1>
          <p className="text-muted-foreground">{boardNombre ? boardNombre : 'Tu consejo técnico'} · panel del CEO</p>
        </div>
        <Link href="/boardx/reuniones"><Button variant="outline">Ir a reuniones <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Consejeros', value: asientos },
          { label: 'Reuniones', value: reuniones.length },
          { label: 'Acuerdos pendientes', value: pendientes.length },
          { label: 'Indicadores en rojo', value: enRojo },
        ].map((s) => (
          <Card key={s.label}><CardContent className="py-5">
            <div className="text-xs font-semibold uppercase text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-3xl font-extrabold tabular-nums">{s.value}</div>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próxima reunión */}
        <Card><CardContent className="py-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><CalendarClock className="h-4 w-4 text-muted-foreground" /> Reunión en foco</div>
          {proxima ? (
            <Link href={`/boardx/reuniones/${proxima.id}`} className="block rounded-lg border p-4 transition hover:bg-muted/40">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{proxima.nombre || `Round ${proxima.round ?? '—'}`}</div>
                <Badge variant={proxima.estado === 'cerrada' ? 'muted' : proxima.estado === 'en_curso' ? 'info' : 'secondary'}>
                  {proxima.estado === 'cerrada' ? 'Cerrada' : proxima.estado === 'en_curso' ? 'En curso' : 'Programada'}
                </Badge>
              </div>
              {proxima.tematica && <div className="mt-1 text-sm text-muted-foreground">Temática: {proxima.tematica}</div>}
              {proxima.kpiPrincipal && <div className="text-sm text-muted-foreground">KPI: {proxima.kpiPrincipal}</div>}
              {proxima.fecha && <div className="mt-1 text-xs text-muted-foreground">{new Date(proxima.fecha).toLocaleDateString()}</div>}
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Preparación</span>
                  <span className="font-semibold tabular-nums" style={{ color: prepColor }}>{prep}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full transition-all" style={{ width: `${prep}%`, backgroundColor: prepColor }} />
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Aún no hay reuniones. <Link href="/boardx/reuniones" className="text-primary hover:underline">Programa la primera.</Link>
            </div>
          )}
        </CardContent></Card>

        {/* Scorecard resumen */}
        <Card><CardContent className="py-5">
          <div className="mb-3 flex items-center justify-between text-sm font-semibold">
            <span>Scorecard</span>
            <Link href="/boardx/scorecard" className="text-xs font-normal text-primary hover:underline">Ver todo</Link>
          </div>
          {indicadores.length ? (
            <div className="space-y-1.5">
              {indicadores.slice(0, 6).map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: SEMAFORO_IND_COLOR[semaforoIndicador(i)] }} />
                    <span className="truncate">{i.nombre}</span>
                  </div>
                  <span className="tabular-nums text-muted-foreground">
                    {i.valorActual ?? '—'}{i.unidad ?? ''}{i.meta != null ? ` / ${i.meta}${i.unidad ?? ''}` : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Sin indicadores. <Link href="/boardx/scorecard" className="text-primary hover:underline">Configura el scorecard.</Link>
            </div>
          )}
        </CardContent></Card>
      </div>

      {/* Acuerdos recientes */}
      <Card className="mt-6"><CardContent className="py-5">
        <div className="mb-3 flex items-center justify-between text-sm font-semibold">
          <span>Acuerdos recientes</span>
          <Link href="/boardx/acuerdos" className="text-xs font-normal text-primary hover:underline">Ver todos</Link>
        </div>
        {acuerdos.length ? (
          <div className="space-y-2">
            {acuerdos.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: PRIORIDAD[a.prioridad].color }} />
                  <span className="truncate">{a.texto}</span>
                </div>
                <Badge variant={a.clasificacion === 'estrategico' ? 'info' : 'secondary'}>{CLASIFICACION[a.clasificacion].label}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-8 text-center">
            <Armchair className="h-9 w-9 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Los acuerdos de tus reuniones aparecerán aquí.</p>
          </div>
        )}
      </CardContent></Card>
    </div>
  );
}
