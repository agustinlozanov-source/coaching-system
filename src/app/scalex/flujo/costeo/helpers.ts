// Helpers y constantes compartidas por las vistas de Costeo.
// Espejo fiel de assets/js/costeo-*.js del portal (mismo modelo de datos y cálculos).

export type UnidadOption = { value: string; label: string; grupo: string };

export const UNIDADES_COMUNES: UnidadOption[] = [
  { value: 'gr', label: 'gr (gramos)', grupo: 'Peso' },
  { value: 'kg', label: 'kg (kilogramos)', grupo: 'Peso' },
  { value: 'lb', label: 'lb (libras)', grupo: 'Peso' },
  { value: 'ml', label: 'ml (mililitros)', grupo: 'Volumen' },
  { value: 'lt', label: 'lt (litros)', grupo: 'Volumen' },
  { value: 'hora', label: 'hora', grupo: 'Tiempo' },
  { value: 'min', label: 'minuto', grupo: 'Tiempo' },
  { value: 'dia', label: 'día', grupo: 'Tiempo' },
  { value: 'unidad', label: 'unidad', grupo: 'Cantidad' },
  { value: 'pieza', label: 'pieza', grupo: 'Cantidad' },
  { value: 'paquete', label: 'paquete', grupo: 'Cantidad' },
  { value: 'caja', label: 'caja', grupo: 'Cantidad' },
  { value: 'porcion', label: 'porción', grupo: 'Cantidad' },
  { value: 'metro', label: 'metro', grupo: 'Longitud' },
  { value: 'cm', label: 'cm (centímetros)', grupo: 'Longitud' },
  { value: 'm2', label: 'metro cuadrado', grupo: 'Área' },
];

export const CATEGORIAS_DEFAULT = [
  'Materias primas',
  'Personal',
  'Servicios externos',
  'Suministros',
  'Otros',
];

export const CONCEPTOS_DEFAULT = [
  'Renta del local',
  'Nomina total',
  'Energia electrica',
  'Gas',
  'Agua',
  'Internet y telefonia',
  'Software y suscripciones',
];

/* ── Formato ────────────────────────────────────────────────────────────── */
export function fmtMoney(amount: number | null | undefined, currency = 'MXN', decimals?: number): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '$ 0';
  const maxDec = decimals !== undefined ? decimals : Math.abs(amount) < 1 ? 4 : 2;
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: maxDec }).format(amount);
}

export function parseAmount(str: string | number | null | undefined): number {
  if (str === null || str === undefined) return 0;
  const cleaned = String(str).replace(/[^0-9.,-]/g, '').replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function fmtNum(n: number | null | undefined, dec = 2): string {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: dec }).format(n);
}

export function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '0%';
  return fmtNum(n, 1) + '%';
}

export function getMarginClass(pct: number): 'good' | 'warn' | 'low' | 'bad' {
  if (pct >= 30) return 'good';
  if (pct >= 10) return 'warn';
  if (pct >= 0) return 'low';
  return 'bad';
}

export const MARGIN_COLOR_CLS: Record<string, string> = {
  good: 'bg-emerald-500/15 text-emerald-400',
  warn: 'bg-amber-500/15 text-amber-400',
  low: 'bg-orange-500/15 text-orange-400',
  bad: 'bg-red-500/15 text-red-400',
};

export function hintTiempo(cantidad: number, unidad: string): string {
  if (!cantidad || isNaN(cantidad)) return '';
  if (unidad === 'hora') {
    if (cantidad < 1) {
      const mins = Math.round(cantidad * 60);
      return `= ${mins} minuto${mins !== 1 ? 's' : ''}`;
    }
    const horas = Math.floor(cantidad);
    const mins = Math.round((cantidad - horas) * 60);
    if (mins === 0) return '';
    return `= ${horas}h ${mins}min`;
  }
  if (unidad === 'min' && cantidad >= 60) {
    const h = Math.floor(cantidad / 60);
    const m = Math.round(cantidad % 60);
    return `= ${h}h${m > 0 ? ` ${m}min` : ''}`;
  }
  return '';
}

/* ── Tipos de datos (tablas Supabase) ──────────────────────────────────────
   Mismas tablas/columnas que usa el portal (assets/js/costeo-*.js).       */
export type Perfil = { id: string; nombre: string | null; apellido: string | null; email: string | null };

export type GastosFijos = {
  id: string;
  organizacion_id: string;
  conceptos: Record<string, number> | null;
  unidades_estimadas_mes: number | null;
  moneda: string | null;
};
export type ConceptoRow = { id: string; nombre: string; monto: number };

export type Recurso = {
  id: string;
  organizacion_id: string;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
  costo_compra: number;
  unidad_compra: string;
  cantidad_compra: number;
  proveedor: string | null;
  notas: string | null;
  activo: boolean;
};

export type Componente = {
  id: string;
  organizacion_id: string;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
  rendimiento_cantidad: number;
  rendimiento_unidad: string;
  minutos_produccion: number | null;
  notas: string | null;
  activo: boolean;
};
export type ComponenteRecursoRow = { id?: string; componente_id: string; recurso_id: string; cantidad: number; unidad: string; orden?: number };
export type ComponenteComponenteRow = { id?: string; componente_padre_id: string; componente_hijo_id: string; cantidad: number; unidad: string; orden?: number };
export type BuilderRecursoItem = { recurso_id: string; cantidad: number; unidad: string };
export type BuilderComponenteItem = { componente_hijo_id: string; cantidad: number; unidad: string };
export type BuilderProdComponenteItem = { componente_id: string; cantidad: number; unidad: string };

export type Producto = {
  id: string;
  organizacion_id: string;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
  sku: string | null;
  precio_venta: number;
  notas: string | null;
  activo: boolean;
};
export type ProductoRecursoRow = { producto_id: string; recurso_id: string; cantidad: number; unidad: string; orden?: number };
export type ProductoComponenteRow = { producto_id: string; componente_id: string; cantidad: number; unidad: string; orden?: number };

export type CostoBreakdown = {
  recursos_directos: number;
  componentes: number;
  gastos_fijos: number;
  costo_total: number;
  utilidad: number;
  margen_pct: number;
  precio_venta: number;
};

export function jsonbToConceptos(jsonb: Record<string, number> | null | undefined): ConceptoRow[] {
  if (!jsonb || typeof jsonb !== 'object') return [];
  return Object.entries(jsonb).map(([nombre, monto], idx) => ({
    id: `c-${idx}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    nombre,
    monto: parseAmount(monto),
  }));
}

export function conceptosToJsonb(arr: ConceptoRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  arr.forEach((c) => {
    if (c.nombre && c.nombre.trim()) out[c.nombre.trim()] = c.monto || 0;
  });
  return out;
}
