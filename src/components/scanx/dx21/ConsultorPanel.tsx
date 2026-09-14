'use client';

import { Sparkles, Loader2, Lightbulb, X } from 'lucide-react';

export type ConsultorContexto = { titulo?: string; guia?: string } | null;

/**
 * Panel del asistente-consultor DX21 (sidebar derecho permanente en desktop,
 * drawer en móvil). Identidad propia + guía contextual del pilar activo +
 * feed de micro-insights que se generan al completar cada dimensión.
 */
export function ConsultorPanel({ contexto, insights, cargando, onClose }: {
  contexto: ConsultorContexto;
  insights: { id: string; texto: string }[];
  cargando: boolean;
  onClose?: () => void;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border bg-card">
      {/* Identidad */}
      <div className="flex items-center gap-3 border-b p-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-white">
          <Sparkles className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight">Sofía</p>
          <p className="text-[11px] text-muted-foreground">Tu consultora DX21</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded p-1 hover:bg-muted lg:hidden" aria-label="Cerrar">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Guía contextual */}
        {contexto?.guia && (
          <div className="rounded-xl bg-muted/40 p-3">
            {contexto.titulo && <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#1aab99]">{contexto.titulo}</p>}
            <p className="text-sm leading-relaxed text-muted-foreground">{contexto.guia}</p>
          </div>
        )}

        {/* Feed de micro-insights */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5" /> Observaciones
          </p>
          {insights.length === 0 && !cargando ? (
            <p className="text-xs text-muted-foreground">Conforme avances, iré compartiendo lo que voy notando.</p>
          ) : (
            <div className="space-y-2">
              {insights.map((it) => (
                <div key={it.id} className="rounded-xl border bg-background p-2.5 text-sm leading-relaxed">
                  {it.texto}
                </div>
              ))}
              {cargando && (
                <div className="flex items-center gap-2 rounded-xl border border-dashed p-2.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analizando lo que acabas de responder…
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
