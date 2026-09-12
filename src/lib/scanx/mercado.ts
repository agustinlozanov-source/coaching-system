import type { ContextoMercado, IndustriaCtx, MacroCtx, PerfilContextual } from '@/types/scanx';

/**
 * Contexto de mercado para el diagnóstico. Por ahora usa valores SEMBRADOS
 * (razonables) por país/sector. INTEGRACIÓN PENDIENTE: sustituir por lecturas
 * en vivo de INEGI/DANE/INDEC/INE/IBGE (industria) y Banxico/FRED/BM (macro).
 * La forma de los datos ya es la definitiva, así que conectar la API real es
 * cambiar la fuente aquí, sin tocar la UI.
 */

const MACRO: Record<string, MacroCtx> = {
  México: { inflacion: 4.2, tasaReferencia: 10.5, cetes: 10.1, tipoCambio: 18.4, petroleo: 72, fuente: 'Banxico (estimado)' },
  Colombia: { inflacion: 6.1, tasaReferencia: 10.75, cetes: 10.2, tipoCambio: 4050, petroleo: 72, fuente: 'BanRep (estimado)' },
  Argentina: { inflacion: 120, tasaReferencia: 40, cetes: 38, tipoCambio: 950, petroleo: 72, fuente: 'BCRA (estimado)' },
  Chile: { inflacion: 3.7, tasaReferencia: 5.5, cetes: 5.2, tipoCambio: 930, petroleo: 72, fuente: 'BCCh (estimado)' },
  España: { inflacion: 3.1, tasaReferencia: 4.0, cetes: 3.4, tipoCambio: 0.92, petroleo: 72, fuente: 'BCE (estimado)' },
};
const MACRO_DEFAULT: MacroCtx = { inflacion: 5.0, tasaReferencia: 8.0, cetes: 7.5, tipoCambio: 1, petroleo: 72, fuente: 'estimado' };

const INDUSTRIA: Record<string, Omit<IndustriaCtx, 'sector'>> = {
  'Servicios': { crecimiento: 4.5, esperanzaVida: 7.8, medianaMargen: 12 },
  'Comercio / Retail': { crecimiento: 3.2, esperanzaVida: 6.9, medianaMargen: 8 },
  'Manufactura': { crecimiento: 2.8, esperanzaVida: 9.2, medianaMargen: 11 },
  'Tecnología / Software': { crecimiento: 12.0, esperanzaVida: 6.2, medianaMargen: 20 },
  'Construcción': { crecimiento: 3.5, esperanzaVida: 8.1, medianaMargen: 9 },
  'Salud': { crecimiento: 6.0, esperanzaVida: 10.5, medianaMargen: 14 },
  'Educación': { crecimiento: 3.0, esperanzaVida: 9.8, medianaMargen: 10 },
  'Alimentos y Bebidas': { crecimiento: 4.0, esperanzaVida: 7.4, medianaMargen: 10 },
  'Logística': { crecimiento: 5.5, esperanzaVida: 8.0, medianaMargen: 9 },
};
const INDUSTRIA_DEFAULT = { crecimiento: 4.0, esperanzaVida: 8.0, medianaMargen: 11 };

export function getContextoMercado(perfil: PerfilContextual): ContextoMercado {
  const macro = { ...(MACRO[perfil.pais ?? ''] ?? MACRO_DEFAULT), actualizado: new Date().toISOString().slice(0, 10) };
  const ind = INDUSTRIA[perfil.sector ?? ''] ?? INDUSTRIA_DEFAULT;
  const industria: IndustriaCtx = { sector: perfil.sector, ...ind, fuente: 'INEGI/estimado (pendiente integración)' };
  return { macro, industria };
}

/** Múltiplos de valuación por sector (sobre EBITDA normalizado). Migrar de Avalluo. */
export const MULTIPLOS: Record<string, number> = {
  'Servicios': 3.5,
  'Comercio / Retail': 3.0,
  'Manufactura': 4.0,
  'Tecnología / Software': 5.5,
  'Construcción': 3.2,
  'Salud': 4.5,
  'Educación': 3.8,
  'Alimentos y Bebidas': 4.0,
  'Logística': 3.6,
};
export const MULTIPLO_DEFAULT = 3.8;
export const multiploDe = (sector?: string) => MULTIPLOS[sector ?? ''] ?? MULTIPLO_DEFAULT;
