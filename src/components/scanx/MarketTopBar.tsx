'use client';

import Link from 'next/link';
import { TrendingUp, Activity, DollarSign, Building2, Pencil } from 'lucide-react';
import type { ContextoMercado } from '@/types/scanx';

/**
 * Top bar persistente de contexto de mercado. Muestra sector + crecimiento de la
 * industria + indicadores macro. Los datos son información pública que el usuario
 * edita a mano o estima con IA (ver /scanx/diagnosticos/[id]/mercado). Sin APIs externas.
 */
export function MarketTopBar({ mercado, posicion, diagId }: { mercado: ContextoMercado | null; posicion?: 'arriba' | 'media' | 'abajo' | null; diagId?: string }) {
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
    <div className="mb-5 rounded-xl border bg-card px-4 py-2.5">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Building2 className="h-3.5 w-3.5 text-[#1aab99]" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Datos de tu industria y mercado {industria.sector ? `· ${industria.sector}` : ''}
        </span>
        {diagId && (
          <Link href={`/scanx/diagnosticos/${diagId}/mercado`} className="ml-auto flex items-center gap-1 text-[11px] font-medium text-primary hover:underline print:hidden">
            <Pencil className="h-3 w-3" /> Actualizar datos
          </Link>
        )}
      </div>
      <div className="flex items-center gap-5 overflow-x-auto">
        <Chip icon={<TrendingUp className="h-3.5 w-3.5" />} label="Crecimiento de la industria" value={`${industria.crecimiento ?? '—'}%`} />
        <Chip icon={<Activity className="h-3.5 w-3.5" />} label="Vida prom. del negocio" value={`${industria.esperanzaVida ?? '—'} años`} />
        <span className="h-4 w-px flex-shrink-0 bg-border" />
        <Chip icon={<Activity className="h-3.5 w-3.5" />} label="Inflación" value={`${macro.inflacion ?? '—'}%`} />
        <Chip icon={<DollarSign className="h-3.5 w-3.5" />} label="Tasa de referencia" value={`${macro.tasaReferencia ?? '—'}%`} />
        <Chip icon={<DollarSign className="h-3.5 w-3.5" />} label="Tipo de cambio" value={`${macro.tipoCambio ?? '—'}`} />
        {posLabel && (
          <>
            <span className="h-4 w-px flex-shrink-0 bg-border" />
            <span className={`whitespace-nowrap text-sm font-semibold ${posColor}`}>Tu empresa: {posLabel}</span>
          </>
        )}
      </div>
    </div>
  );
}
