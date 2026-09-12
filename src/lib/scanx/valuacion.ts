import type { Financials, Valuacion } from '@/types/scanx';
import { multiploDe } from './mercado';

const n = (v: number | null | undefined) => (typeof v === 'number' && !isNaN(v) ? v : null);

/**
 * Valuación estimada por múltiplos sobre EBITDA normalizado.
 * EBITDA se aproxima como utilidad operativa (ingresos − costo de ventas − gastos
 * operativos); si no hay costo de ventas se usa la utilidad neta como proxy.
 * El EBITDA normalizado suma los add-backs (gastos no recurrentes/no operativos).
 * NOTA: aproximación de PyME; la lógica formal se migrará del motor de Avalluo.
 */
export function calcularValuacion(fin: Financials | null | undefined, sector?: string): Valuacion {
  const multiplo = multiploDe(sector);
  if (!fin) return { ebitda: null, ebitdaNormalizado: null, margenOperativo: null, multiplo, valorMin: null, valorMax: null };

  const ingresos = n(fin.ingresos);
  const costo = n(fin.costoVentas);
  const gastos = n(fin.gastosOperativos);
  const neta = n(fin.utilidadNeta);

  let ebitda: number | null = null;
  if (ingresos != null && (costo != null || gastos != null)) {
    ebitda = ingresos - (costo ?? 0) - (gastos ?? 0);
  } else if (neta != null) {
    ebitda = neta;
  }

  const addbacks = (fin.addbacks ?? []).reduce((s, a) => s + (n(a.monto) ?? 0), 0);
  const ebitdaNorm = ebitda != null ? ebitda + addbacks : null;
  const margenOperativo = ebitda != null && ingresos ? Math.round((ebitda / ingresos) * 1000) / 10 : null;

  const valorMin = ebitdaNorm != null ? Math.max(0, Math.round(ebitdaNorm * (multiplo - 0.5))) : null;
  const valorMax = ebitdaNorm != null ? Math.max(0, Math.round(ebitdaNorm * (multiplo + 0.5))) : null;

  return { ebitda, ebitdaNormalizado: ebitdaNorm, margenOperativo, multiplo, valorMin, valorMax };
}

/** Compara el margen operativo contra la mediana de la industria. */
export function vsMediana(margen: number | null, mediana: number | undefined): 'arriba' | 'media' | 'abajo' | null {
  if (margen == null || mediana == null) return null;
  if (margen >= mediana * 1.1) return 'arriba';
  if (margen <= mediana * 0.9) return 'abajo';
  return 'media';
}
