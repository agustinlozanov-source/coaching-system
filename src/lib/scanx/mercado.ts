import type { ContextoMercado, IndustriaCtx, MacroCtx, PerfilContextual } from '@/types/scanx';
import { CRECIMIENTO_SECTOR, MARGEN_SECTOR, VIDA_SECTOR } from './clasificacion';

/**
 * Contexto de mercado inicial (punto de partida) por país/sector. NO se conectan
 * APIs externas: el usuario edita estos datos a mano o los estima con IA en
 * /scanx/diagnosticos/[id]/mercado (información pública). Estos valores solo
 * pre-cargan el formulario para que no arranque vacío.
 */

const MACRO: Record<string, MacroCtx> = {
  México: { inflacion: 4.2, tasaReferencia: 10.5, cetes: 10.1, tipoCambio: 18.4, petroleo: 72, fuente: 'Banxico (estimado)' },
  Colombia: { inflacion: 6.1, tasaReferencia: 10.75, cetes: 10.2, tipoCambio: 4050, petroleo: 72, fuente: 'BanRep (estimado)' },
  Argentina: { inflacion: 120, tasaReferencia: 40, cetes: 38, tipoCambio: 950, petroleo: 72, fuente: 'BCRA (estimado)' },
  Chile: { inflacion: 3.7, tasaReferencia: 5.5, cetes: 5.2, tipoCambio: 930, petroleo: 72, fuente: 'BCCh (estimado)' },
  España: { inflacion: 3.1, tasaReferencia: 4.0, cetes: 3.4, tipoCambio: 0.92, petroleo: 72, fuente: 'BCE (estimado)' },
};
const MACRO_DEFAULT: MacroCtx = { inflacion: 5.0, tasaReferencia: 8.0, cetes: 7.5, tipoCambio: 1, petroleo: 72, fuente: 'estimado' };

/**
 * Semilla de industria a partir de la sección ISIC/CIIU del perfil. El sector y
 * la industria alimentan el top bar con crecimientos distintos (macro vs específico).
 * Los valores son punto de partida; el usuario/IA los editan en /mercado.
 */
export function getContextoMercado(perfil: PerfilContextual): ContextoMercado {
  const macro = { ...(MACRO[perfil.pais ?? ''] ?? MACRO_DEFAULT), actualizado: new Date().toISOString().slice(0, 10) };
  const code = perfil.sectorCode ?? '';
  const crecSector = CRECIMIENTO_SECTOR[code] ?? 4.0;
  const industria: IndustriaCtx = {
    sector: perfil.sector,
    industria: perfil.industria,
    crecimientoSector: crecSector,
    crecimientoIndustria: crecSector,       // arranca igual al sector; editable
    crecimiento: crecSector,                // compat
    esperanzaVida: VIDA_SECTOR[code] ?? 8.0,
    medianaMargen: MARGEN_SECTOR[code] ?? 11,
    fuente: 'Estimación inicial · edítala con tus datos',
  };
  return { macro, industria };
}
