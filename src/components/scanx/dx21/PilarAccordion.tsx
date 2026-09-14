'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Check, Circle } from 'lucide-react';
import { EscalaDX21 } from './EscalaDX21';
import { LENTES, type LenteId, type RespuestasDX21 } from '@/lib/scanx/dx21';
import type { Pilar, Dimension } from '@/lib/scanx/dx21-marco';

const LENTE_IDS: LenteId[] = ['D', 'Dp', 'Ds'];

function dimCompleta(dim: Dimension, r: RespuestasDX21): boolean {
  return dim.subs.every((s) => {
    const a = r[s.id];
    return a && typeof a.D === 'number' && typeof a.Dp === 'number' && typeof a.Ds === 'number';
  });
}

function dimRespondidas(dim: Dimension, r: RespuestasDX21): number {
  let c = 0;
  for (const s of dim.subs) for (const l of LENTE_IDS) if (typeof r[s.id]?.[l] === 'number') c++;
  return c;
}

/**
 * Acordeón de dimensiones de un pilar. Una abierta a la vez; dentro, las
 * preguntas se agrupan por lente (Diseño → Despliegue → Desempeño). Al completar
 * una dimensión se colapsa, avanza a la siguiente y dispara onDimComplete.
 */
export function PilarAccordion({ pilar, respuestas, cualitativo, onAnswer, onNota, onDimComplete }: {
  pilar: Pilar;
  respuestas: RespuestasDX21;
  cualitativo: Record<string, string>;
  onAnswer: (subId: string, lente: LenteId, v: number) => void;
  onNota: (dimId: string, texto: string) => void;
  onDimComplete?: (dim: Dimension) => void;
}) {
  const primeraIncompleta = pilar.dimensiones.find((d) => !dimCompleta(d, respuestas))?.id ?? pilar.dimensiones[0].id;
  const [abierta, setAbierta] = useState<string>(primeraIncompleta);
  const firedRef = useRef<Set<string>>(new Set());

  // Al cambiar de pilar, reabre la primera incompleta.
  useEffect(() => { setAbierta(primeraIncompleta); firedRef.current = new Set(); /* eslint-disable-next-line */ }, [pilar.code]);

  // Detecta una dimensión recién completada para avanzar + micro-insight (una vez).
  useEffect(() => {
    const dim = pilar.dimensiones.find((d) => d.id === abierta);
    if (!dim) return;
    if (dimCompleta(dim, respuestas) && !firedRef.current.has(dim.id)) {
      firedRef.current.add(dim.id);
      onDimComplete?.(dim);
      const next = pilar.dimensiones.find((d) => !dimCompleta(d, respuestas));
      if (next) setTimeout(() => setAbierta(next.id), 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [respuestas, abierta]);

  return (
    <div className="divide-y rounded-2xl border bg-card">
      {pilar.dimensiones.map((dim, i) => {
        const open = abierta === dim.id;
        const done = dimCompleta(dim, respuestas);
        const total = dim.subs.length * 3;
        const hechas = dimRespondidas(dim, respuestas);
        return (
          <div key={dim.id}>
            <button
              type="button"
              onClick={() => setAbierta(open ? '' : dim.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] ${done ? 'bg-[#1aab99] text-white' : open ? 'bg-[#3533cd] text-white' : 'border border-muted-foreground/40 text-muted-foreground'}`}>
                  {done ? <Check className="h-3 w-3" /> : open ? <Circle className="h-2 w-2 fill-current" /> : i + 1}
                </span>
                <span className="truncate text-sm font-semibold">{dim.n}</span>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <span className="text-[11px] tabular-nums text-muted-foreground">{hechas}/{total}</span>
                {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </button>

            {open && (
              <div className="space-y-5 border-t bg-muted/20 px-4 py-4">
                {LENTES.map((lente) => (
                  <div key={lente.id}>
                    <div className="mb-2 flex items-baseline gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-[#1aab99]">{lente.nombre}</span>
                      <span className="text-[11px] italic text-muted-foreground">{lente.pregunta}</span>
                    </div>
                    <div className="space-y-3">
                      {dim.subs.map((s) => (
                        <div key={`${s.id}-${lente.id}`} className="rounded-lg border bg-card p-3">
                          <div className="mb-2">
                            <p className="text-sm font-medium leading-snug">{s.n}</p>
                            <p className="text-[11px] leading-snug text-muted-foreground">{s.e}</p>
                          </div>
                          <EscalaDX21
                            ariaLabel={`${s.n} — ${lente.nombre}`}
                            value={respuestas[s.id]?.[lente.id]}
                            onChange={(v) => onAnswer(s.id, lente.id, v)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Contexto cualitativo por dimensión */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Contexto (opcional)
                  </label>
                  <textarea
                    value={cualitativo[dim.id] ?? ''}
                    onChange={(e) => onNota(dim.id, e.target.value)}
                    placeholder={`Describe cómo funciona "${dim.n}" hoy. Puedes pegar texto de cualquier fuente.`}
                    className="min-h-[64px] w-full rounded-lg border bg-background p-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
