'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Printer, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listEvidencias } from '@/lib/scanx/evidencia';
import { listParticipantes } from '@/lib/scanx/participantes';
import { getRespuestas } from '@/lib/scanx/diagnostico';
import { calcularCongruencia } from '@/lib/scanx/congruencia';
import { DIMENSIONES, type Resultado, type IssueTree } from '@/types/scanx';

const IMPACTO_ALTO = new Set(['liderazgo', 'estrategia', 'operacion', 'comercial', 'finanzas']);

function color(pct: number) { return pct >= 75 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444'; }

/** El issue tree se genera y persiste UNA vez en el runner (padre) y llega por prop:
 *  así no se recalcula en cada apertura ni falla de forma intermitente. */
export function ResultadoAvanzado({ diagId, resultado, issuetree, issuetreeLoading }: {
  diagId: string; resultado: Resultado; issuetree: IssueTree | null; issuetreeLoading: boolean;
}) {
  const [evidCount, setEvidCount] = useState<Record<string, number>>({});
  const [congr, setCongr] = useState<Record<string, number | null>>({});

  useEffect(() => {
    (async () => {
      const [evid, parts, ceo] = await Promise.all([listEvidencias(diagId), listParticipantes(diagId), getRespuestas(diagId)]);
      const ec: Record<string, number> = {};
      for (const e of evid) if (e.dimension) ec[e.dimension] = (ec[e.dimension] ?? 0) + 1;
      setEvidCount(ec);
      const c = calcularCongruencia(ceo, parts);
      const cm: Record<string, number | null> = {};
      for (const d of c.porDimension) cm[d.id] = d.indice;
      setCongr(cm);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagId]);

  // Índice de confiabilidad por dimensión (C1 densidad + C3 evidencia + C2 congruencia)
  const confiabilidad = useMemo(() => resultado.dimensiones.map((d) => {
    const density = Math.min((d.preguntas ?? 0) / 3, 1);
    const evidence = (evidCount[d.nombre] ?? 0) > 0 ? 1 : 0.35;
    const congruencia = congr[d.id];
    let idx: number;
    if (congruencia != null) idx = 0.4 * density + 0.3 * evidence + 0.3 * (congruencia / 100);
    else idx = 0.6 * density + 0.4 * evidence;
    return { id: d.id, nombre: d.nombre, valor: d.valor, pct: Math.round(idx * 100) };
  }), [resultado.dimensiones, evidCount, congr]);

  // Matriz BCG de procesos
  const bcg = useMemo(() => {
    const cuad = { estrella: [] as string[], interrogacion: [] as string[], vaca: [] as string[], perro: [] as string[] };
    for (const d of resultado.dimensiones) {
      if (d.valor == null) continue;
      const maduro = d.valor >= 2.5;
      const alto = IMPACTO_ALTO.has(d.id);
      const corto = DIMENSIONES.find((x) => x.id === d.id)?.corto ?? d.nombre;
      if (maduro && alto) cuad.estrella.push(corto);
      else if (!maduro && alto) cuad.interrogacion.push(corto);
      else if (maduro && !alto) cuad.vaca.push(corto);
      else cuad.perro.push(corto);
    }
    return cuad;
  }, [resultado.dimensiones]);

  const Quad = ({ emoji, titulo, accion, items }: { emoji: string; titulo: string; accion: string; items: string[] }) => (
    <div className="rounded-xl border p-3">
      <div className="text-sm font-bold">{emoji} {titulo}</div>
      <div className="text-[11px] text-muted-foreground">{accion}</div>
      <div className="mt-2 flex flex-wrap gap-1">
        {items.length ? items.map((i) => <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-xs">{i}</span>) : <span className="text-xs text-muted-foreground">—</span>}
      </div>
    </div>
  );

  return (
    <div className="mt-6 space-y-6">
      {/* Confiabilidad */}
      <div className="rounded-2xl border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Índice de confiabilidad por área</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Qué tan <b>sólido y verificado</b> está el diagnóstico de cada área. <b>Alto (verde)</b> = respondiste a fondo, con evidencia y otras perspectivas que coinciden → puedes actuar con confianza. <b>Bajo (rojo)</b> = falta verificar: sube evidencia o suma perspectivas para confirmarlo.
        </p>
        <div className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
          {confiabilidad.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-sm">
              <span className="w-36 flex-shrink-0 truncate">{c.nombre}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: color(c.pct) }} />
              </div>
              <span className="w-9 text-right text-xs font-semibold tabular-nums" style={{ color: color(c.pct) }}>{c.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Matriz BCG */}
      <div className="rounded-2xl border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Matriz BCG de procesos</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Cruza <b>madurez del proceso × impacto en el negocio</b>, para priorizar dónde invertir tu energía. <b>Estrella</b>: fuerte y clave, protégela. <b>Interrogación</b>: clave pero floja, tu prioridad de inversión. <b>Vaca</b>: sólida pero de bajo impacto, mantenla eficiente. <b>Perro</b>: floja y de bajo impacto, evalúa si vale la pena.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Quad emoji="⭐" titulo="Estrella" accion="Mantener y replicar" items={bcg.estrella} />
          <Quad emoji="❓" titulo="Interrogación" accion="Prioridad de inversión" items={bcg.interrogacion} />
          <Quad emoji="🐄" titulo="Vaca" accion="Optimizar eficiencia" items={bcg.vaca} />
          <Quad emoji="🐕" titulo="Perro" accion="Evaluar si eliminar" items={bcg.perro} />
        </div>
      </div>

      {/* Issue tree — causa raíz (inline, automático) */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Network className="h-3.5 w-3.5" /> Árbol de causa raíz</div>
        <p className="mb-3 text-xs text-muted-foreground">Descompone tu dimensión más débil en sus posibles causas, para atacar el origen y no el síntoma.</p>
        {issuetreeLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Generando el árbol de causas…</div>
        ) : issuetree ? (
          <div className="text-sm">
            <p className="font-bold">{issuetree.raiz}</p>
            <div className="mt-2 space-y-2">
              {issuetree.ramas?.map((r, i) => (
                <div key={i} className="border-l-2 border-[#1aab99]/50 pl-3">
                  <p className="font-medium">{r.causa}</p>
                  <ul className="ml-4 list-disc text-muted-foreground">{r.sub?.map((s, j) => <li key={j}>{s}</li>)}</ul>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No se pudo generar el árbol.</p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" /> Imprimir / PDF</Button>
      </div>
    </div>
  );
}
