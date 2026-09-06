/* ── Tipos y constantes del pipeline "Mis Clientes" ────────────────────────
   Espejo fiel del modelo de datos de assets/js/pipeline.js del portal.
   Tablas: `prospectos` y `prospectos_interacciones`. */

export type Etapa =
  | 'sin_contactar'
  | 'conversacion_iniciada'
  | 'reunion_agendada'
  | 'en_propuesta'
  | 'cuenta_activa'
  | 'descartado';

export type Prospecto = {
  id: string;
  consultor_id: string;
  etapa: Etapa;
  empresa_nombre: string | null;
  sector: string | null;
  tamano: string | null;
  ciudad: string | null;
  pais: string | null;
  sitio_web: string | null;
  contacto_nombre: string | null;
  contacto_puesto: string | null;
  contacto_email: string | null;
  contacto_telefono: string | null;
  contacto_whatsapp: string | null;
  contacto_linkedin: string | null;
  fuente: string | null;
  fuente_detalle: string | null;
  pilares_diagnostico: string | null;
  notas_diagnostico: string | null;
  proxima_accion: string | null;
  proxima_accion_fecha: string | null;
  interacciones_count: number | null;
  created_at: string;
};

export type TipoInteraccion = 'nota' | 'mensaje' | 'llamada' | 'reunion' | 'propuesta';

export type Interaccion = {
  id: string;
  prospecto_id: string;
  consultor_id: string;
  tipo: TipoInteraccion;
  fecha: string;
  resumen: string;
  detalle: string | null;
};

/* Etapas del kanban (excluye 'descartado', que sale del tablero) */
export const ETAPAS: { id: Exclude<Etapa, 'descartado'>; label: string; color: string }[] = [
  { id: 'sin_contactar', label: 'Sin contactar', color: '#6b7280' },
  { id: 'conversacion_iniciada', label: 'Conversación', color: '#3533cd' },
  { id: 'reunion_agendada', label: 'Reunión agendada', color: '#1aab99' },
  { id: 'en_propuesta', label: 'En propuesta', color: '#ff9500' },
  { id: 'cuenta_activa', label: 'Cuenta activa', color: '#00c853' },
];

export const PILARES = ['Reflejo', 'ADN', 'Vector', 'Ritmo', 'Flujo'] as const;

export const PILAR_COLOR: Record<string, string> = {
  Reflejo: '#7c3aed',
  ADN: '#ec4899',
  Vector: '#3533cd',
  Ritmo: '#1aab99',
  Flujo: '#ff9500',
};

export const FUENTES = [
  { value: '', label: '— Selecciona —' },
  { value: 'referido', label: 'Referido' },
  { value: 'red_social', label: 'Red social' },
  { value: 'evento', label: 'Evento' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'outbound', label: 'Outbound' },
  { value: 'otro', label: 'Otro' },
];

export const TIPOS_INTERACCION: { value: TipoInteraccion; label: string }[] = [
  { value: 'nota', label: 'Nota' },
  { value: 'mensaje', label: 'Mensaje' },
  { value: 'llamada', label: 'Llamada' },
  { value: 'reunion', label: 'Reunión' },
  { value: 'propuesta', label: 'Propuesta' },
];

export function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatFecha(str?: string | null): string {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

export function parsePilares(str?: string | null): string[] {
  if (!str) return [];
  return str
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
