'use client';

import { TrendingUp, Activity, DollarSign, Building2 } from 'lucide-react';
import type { ContextoMercado } from '@/types/scanx';

/**
 * Top bar persistente de contexto de mercado. Muestra sector + crecimiento de la
 * industria + indicadores macro. Datos sembrados (ver src/lib/scanx/mercado.ts);
 * la integración con INEGI/Banxico sustituye la fuente sin tocar esta UI.
 */
export function MarketTopBar({ mercado, posicion }: { mercado: ContextoMercado | null; posicion?: 'arriba' | 'media' | 'abajo' | null }) {
  if (!mercado) return null;
  const { macro, industria } = mercado;

  const posLabel = posicion === 'arriba' ? 'Por encima de la media' : posicion === 'abajo' ? 'Por debajo de la media' : posicion === 'media' ? 'En la media' : null;
  const posColor = posicion === 'arriba' ? 'text-emerald-500' : posicion === 'abajo' ? 'text-red-500' : 'text-amber-500';

  const Chip = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );

  return (
    <div className="mb-5 overflow-x-auto rounded-xl border bg-card px-4 py-2.5">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <Building2 className="h-4 w-4 text-[#1aab99]" />
          <span className="text-sm font-bold">{industria.sector ?? 'Tu industria'}</span>
        </div>
        <span className="h-4 w-px flex-shrink-0 bg-border" />
        <Chip icon={<TrendingUp className="h-3.5 w-3.5" />} label="Crece" value={`${industria.crecimiento ?? '—'}%`} />
        <Chip icon={<Activity className="h-3.5 w-3.5" />} label="Vida negocios" value={`${industria.esperanzaVida ?? '—'} años`} />
        <span className="h-4 w-px flex-shrink-0 bg-border" />
        <Chip icon={<Activity className="h-3.5 w-3.5" />} label="Inflación" value={`${macro.inflacion ?? '—'}%`} />
        <Chip icon={<DollarSign className="h-3.5 w-3.5" />} label="Tasa ref." value={`${macro.tasaReferencia ?? '—'}%`} />
        <Chip icon={<DollarSign className="h-3.5 w-3.5" />} label="TC" value={`${macro.tipoCambio ?? '—'}`} />
        {posLabel && (
          <>
            <span className="h-4 w-px flex-shrink-0 bg-border" />
            <span className={`whitespace-nowrap text-sm font-semibold ${posColor}`}>{posLabel}</span>
          </>
        )}
      </div>
    </div>
  );
}
