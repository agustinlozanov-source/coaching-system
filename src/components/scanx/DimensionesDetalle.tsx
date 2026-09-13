'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Lightbulb, BookOpen } from 'lucide-react';
import { SEMAFORO_COLOR, type ResultadoDimension, type PerfilContextual } from '@/types/scanx';

type Detalle = { estado?: string; analisis?: string; conceptos?: { termino: string; definicion: string }[]; tips?: string[] };

/** Lista de dimensiones cliqueables. Al abrir una, la IA genera un diagnóstico
 *  expandido de esa dimensión (estado, análisis, conceptos, tips). */
export function DimensionesDetalle({ dimensiones, perfil, top3 }: {
  dimensiones: ResultadoDimension[]; perfil: PerfilContextual; top3: string[];
}) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, Detalle | 'loading' | 'error'>>({});

  async function abrir(d: ResultadoDimension) {
    if (abierta === d.id) { setAbierta(null); return; }
    setAbierta(d.id);
    if (cache[d.id]) return;
    setCache((c) => ({ ...c, [d.id]: 'loading' }));
    try {
      const r = await fetch('/api/scanx/ia', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tarea: 'dimension', contexto: { dimension: d.nombre, valor: d.valor, perfil, top3 } }) });
      const j = await r.json();
      setCache((c) => ({ ...c, [d.id]: j.error ? 'error' : (j.detalle ?? 'error') }));
    } catch { setCache((c) => ({ ...c, [d.id]: 'error' })); }
  }

  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Diagnóstico por dimensión</p>
      <p className="mb-3 text-xs text-muted-foreground">Haz clic en cualquier dimensión para ver su análisis a detalle, conceptos y acciones.</p>
      <div className="divide-y">
        {dimensiones.map((d) => {
          const det = cache[d.id];
          const open = abierta === d.id;
          return (
            <div key={d.id}>
              <button onClick={() => abrir(d)} className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: SEMAFORO_COLOR[d.semaforo] }} />
                  <span className="truncate font-medium">{d.nombre}</span>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className="tabular-nums text-muted-foreground">{d.confiable && d.valor != null ? d.valor.toFixed(2) : '—'}</span>
                  {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>
              {open && (
                <div className="pb-4 pl-[18px] text-sm">
                  {det === 'loading' || det === undefined ? (
                    <div className="flex items-center gap-2 py-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Analizando esta dimensión…</div>
                  ) : det === 'error' ? (
                    <p className="py-2 text-muted-foreground">No se pudo generar el análisis. Intenta de nuevo.</p>
                  ) : (
                    <div className="space-y-3">
                      {det.estado && <p className="font-semibold">{det.estado}</p>}
                      {det.analisis && <p className="leading-relaxed text-muted-foreground">{det.analisis}</p>}
                      {det.conceptos?.length ? (
                        <div className="space-y-1.5">
                          {det.conceptos.map((c, i) => (
                            <div key={i} className="rounded-lg bg-muted/40 p-2.5">
                              <div className="flex items-center gap-1.5 text-xs font-semibold"><BookOpen className="h-3.5 w-3.5 text-[#1aab99]" /> {c.termino}</div>
                              <p className="mt-0.5 text-xs text-muted-foreground">{c.definicion}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {det.tips?.length ? (
                        <div>
                          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Lightbulb className="h-3.5 w-3.5" /> Acciones</div>
                          <ul className="ml-4 list-disc space-y-0.5 text-muted-foreground">{det.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
