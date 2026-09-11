// BOARDx · tipos base del consejo técnico (Fase 1)

export type Board = {
  id: string;
  organizacionId: string;
  nombre: string | null;
  valores: string[];
  config: Record<string, unknown>;
};

export type Asiento = {
  id: string;
  boardId: string;
  nombre: string;
  rol: string | null;
  especializacion: string | null;
  nivelTecnico: string | null;
  tipo: 'interno' | 'externo';
  orden: number;
  consultora: string | null;
  email: string | null;
  telefono: string | null;
  fotoUrl: string | null;
  personales: Record<string, string>;
};

export type AgendaItem = { id: string; titulo: string; minutos: number };

export type Asistencia = Record<string, { presente: boolean; hora?: string }>;
export type Firmas = Record<string, { firmado: boolean; hora?: string }>;
export type Cierre = { siguienteTematica?: string; siguienteKpi?: string; siguienteReunionId?: string } | null;

export type Reunion = {
  id: string;
  boardId: string;
  nombre: string | null;
  round: number | null;
  tematica: string | null;
  kpiPrincipal: string | null;
  fecha: string | null;
  modalidad: 'presencial' | 'virtual';
  estado: 'programada' | 'en_curso' | 'cerrada';
  agenda: AgendaItem[];
  asistencia: Asistencia;
  firmas: Firmas;
  cierre: Cierre;
  transcripcion: string | null;
  resumen: { highlights?: string[]; decisiones?: string[]; texto?: string } | null;
};

// ── F7 canal asíncrono ──────────────────────────────────────────────────
export type CategoriaContrib = 'alerta' | 'oportunidad' | 'referencia' | 'observacion';
export const CATEGORIA_CONTRIB: Record<CategoriaContrib, { label: string; icon: string }> = {
  alerta: { label: 'Alerta', icon: '🚨' },
  oportunidad: { label: 'Oportunidad', icon: '💡' },
  referencia: { label: 'Referencia', icon: '📚' },
  observacion: { label: 'Observación', icon: '👁️' },
};
export type Contribucion = {
  id: string; boardId: string; categoria: CategoriaContrib; texto: string;
  indicadorId: string | null; autor: string | null; createdAt: string;
};

// ── F8 pulso de efectividad ─────────────────────────────────────────────
export type Pulso = {
  id: string; boardId: string; reunionId: string | null;
  respuestas: Record<string, number>; comentario: string | null; createdAt: string;
};
export const PULSO_PREGUNTAS: { k: string; q: string }[] = [
  { k: 'productiva', q: '¿Fue productiva la reunión?' },
  { k: 'temas', q: '¿Se cubrieron los temas importantes?' },
  { k: 'accionables', q: '¿Las recomendaciones fueron accionables?' },
  { k: 'tiempo', q: '¿El tiempo se usó eficientemente?' },
  { k: 'valor', q: '¿El consejo aportó valor?' },
];

// ── F5 planes por área (despacho) ───────────────────────────────────────
export type Plan = {
  id: string; boardId: string; reunionId: string | null; area: string;
  responsable: string | null; resumen: string | null; contenido: string | null;
  estado: 'despachado' | 'recibido' | 'presentado'; createdAt: string;
};

// ── F6 directorio de consultores ────────────────────────────────────────
export type Consultor = {
  id: string; nombre: string; fotoUrl: string | null; tier: number; titular: string | null;
  especializacion: string | null; disciplinas: string[]; area: string | null;
  aniosExperiencia: number | null; pais: string | null; idiomas: string[];
  tarifa: number | null; moneda: string | null; bio: string | null; videoUrl: string | null;
  disponibilidad: 'disponible' | 'limitada' | 'no_disponible';
};
export const TIER_INFO: Record<number, { label: string; desc: string }> = {
  1: { label: 'Tier 1 · Premium', desc: '+15 años, track record probado' },
  2: { label: 'Tier 2 · Intermedio', desc: '8-15 años, experiencia sólida' },
  3: { label: 'Tier 3 · Accesible', desc: '3-8 años, talento emergente' },
};

export type Indicador = {
  id: string;
  boardId: string;
  dimension: string | null;
  nombre: string;
  valorActual: number | null;
  meta: number | null;
  unidad: string | null;
  direccion: 'mayor' | 'menor';
  responsable: string | null;
  orden: number;
};

export type TipoAcuerdo = 'correo' | 'llamada' | 'cita' | 'visita' | 'reunion';
export type Prioridad = 'alta' | 'media_alta' | 'media' | 'media_baja' | 'baja';
export type Clasificacion = 'estrategico' | 'tactico';
export type EstadoAcuerdo = 'pendiente' | 'en_progreso' | 'hecho';

export type Acuerdo = {
  id: string;
  boardId: string;
  reunionId: string | null;
  indicadorId: string | null;
  asientoId: string | null;
  texto: string;
  tipo: TipoAcuerdo;
  prioridad: Prioridad;
  clasificacion: Clasificacion;
  responsable: string | null;
  fechaCompromiso: string | null;
  estado: EstadoAcuerdo;
  evidencia: string | null;
};

// ── Catálogos / helpers ────────────────────────────────────────────────
export const TIPO_ACUERDO: Record<TipoAcuerdo, { label: string; icon: string }> = {
  correo: { label: 'Correo', icon: '✉️' },
  llamada: { label: 'Llamada', icon: '📞' },
  cita: { label: 'Cita', icon: '📅' },
  visita: { label: 'Visita', icon: '🏢' },
  reunion: { label: 'Reunión', icon: '👥' },
};

export const PRIORIDAD: Record<Prioridad, { label: string; color: string }> = {
  alta: { label: 'Alta', color: '#ef4444' },
  media_alta: { label: 'Media-Alta', color: '#f97316' },
  media: { label: 'Media', color: '#eab308' },
  media_baja: { label: 'Media-Baja', color: '#3b82f6' },
  baja: { label: 'Baja', color: '#94a3b8' },
};

export const CLASIFICACION: Record<Clasificacion, { label: string }> = {
  estrategico: { label: 'Estratégico' },
  tactico: { label: 'Táctico' },
};

export const ESTADO_ACUERDO: Record<EstadoAcuerdo, { label: string }> = {
  pendiente: { label: 'Pendiente' },
  en_progreso: { label: 'En progreso' },
  hecho: { label: 'Hecho' },
};

/** Dimensiones sugeridas del scorecard (el usuario puede usar otras). */
export const DIMENSIONES_SCORECARD = ['Financiera', 'Comercial', 'Operativa', 'Talento', 'Cliente'];

export type SemaforoInd = 'verde' | 'amarillo' | 'rojo' | 'gris';
export const SEMAFORO_IND_COLOR: Record<SemaforoInd, string> = {
  verde: '#22c55e', amarillo: '#eab308', rojo: '#ef4444', gris: '#94a3b8',
};

/** Semáforo de un indicador según su valor vs meta (respeta la dirección). */
export function semaforoIndicador(ind: Pick<Indicador, 'valorActual' | 'meta' | 'direccion'>): SemaforoInd {
  if (ind.valorActual == null || ind.meta == null || ind.meta === 0) return 'gris';
  const ratio = ind.direccion === 'menor' ? ind.meta / ind.valorActual : ind.valorActual / ind.meta;
  if (ratio >= 1) return 'verde';
  if (ratio >= 0.85) return 'amarillo';
  return 'rojo';
}
