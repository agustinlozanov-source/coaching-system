// SCANx · tipos base del diagnóstico (Fase 1)

/** Las 10 dimensiones diagnósticas (procesos habilitadores, no departamentos). */
export const DIMENSIONES = [
  { id: 'liderazgo', nombre: 'Liderazgo y Gobierno', corto: 'Liderazgo' },
  { id: 'estrategia', nombre: 'Estrategia y Dirección', corto: 'Estrategia' },
  { id: 'operacion', nombre: 'Operación y Procesos', corto: 'Operación' },
  { id: 'comercial', nombre: 'Comercial y Ventas', corto: 'Comercial' },
  { id: 'finanzas', nombre: 'Finanzas y Rentabilidad', corto: 'Finanzas' },
  { id: 'talento', nombre: 'Talento y Equipo', corto: 'Talento' },
  { id: 'tecnologia', nombre: 'Tecnología y Sistemas', corto: 'Tecnología' },
  { id: 'cliente', nombre: 'Cliente y Experiencia', corto: 'Cliente' },
  { id: 'innovacion', nombre: 'Innovación y Diferenciación', corto: 'Innovación' },
  { id: 'escalabilidad', nombre: 'Escalabilidad y Crecimiento', corto: 'Escalabilidad' },
] as const;

export type DimensionId = (typeof DIMENSIONES)[number]['id'];

/** Escala idéntica a TEAMx para coherencia del ecosistema. */
export const VALOR = { EVIDENTE: 4.0, EN_DESARROLLO: 2.67, POR_DESARROLLAR: 1.33, SIN_EVIDENCIA: 0.0 } as const;
export const VALOR_MAX = 4.0;

/** Pesos que una opción deposita en las dimensiones que toca (las no tocadas: ausentes = null). */
export type PesoMap = Partial<Record<DimensionId, number>>;

export type Opcion = {
  id: string;
  texto: string;
  pesos: PesoMap;
};

export type Pregunta = {
  id: string;
  escenario: string;
  opciones: Opcion[];
};

/** Semáforo del radar (rangos del brief). */
export type Semaforo = 'verde' | 'amarillo' | 'naranja' | 'rojo';

export function semaforoDe(valor: number | null): Semaforo | 'gris' {
  if (valor == null) return 'gris';
  if (valor >= 3.0) return 'verde';
  if (valor >= 2.0) return 'amarillo';
  if (valor >= 1.0) return 'naranja';
  return 'rojo';
}

export const SEMAFORO_COLOR: Record<Semaforo | 'gris', string> = {
  verde: '#22c55e',
  amarillo: '#eab308',
  naranja: '#f97316',
  rojo: '#ef4444',
  gris: '#94a3b8',
};

/** Clasificación de escalabilidad (conecta con la oferta de consultoría). */
export type TipoEmpresa = 1 | 2 | 3;
export const TIPO_EMPRESA: Record<TipoEmpresa, { nombre: string; descripcion: string }> = {
  1: { nombre: 'Arrancando', descripcion: 'Empresa nueva o joven, sin procesos establecidos. Necesita construir fundamentos antes de escalar.' },
  2: { nombre: 'Atorada', descripcion: 'Tiene operación pero algo la frena (liderazgo, procesos, estrategia o talento). Base sin crecimiento o en caos.' },
  3: { nombre: 'Lista para escalar', descripcion: 'Fundamentos sólidos. Los procesos habilitadores existen; la oportunidad es optimizar y replicar.' },
};

/** Perfil contextual de la empresa (se completa antes de diagnosticar). */
export type PerfilContextual = {
  nombreEmpresa?: string;
  sector?: string;
  pais?: string;
  ciudad?: string;
  anioFundacion?: string;
  empleados?: string;    // rango
  clientesActivos?: string;
  momento?: string;      // arrancando | creciendo_sin_control | estable_estancada | lista_escalar | crisis
  // Estructura legal y gobierno
  tipoSociedad?: string;
  esFamiliar?: string;       // si | no | parcial
  consejoAdmin?: string;     // activo | formal | no
  consejoTecnico?: string;   // si | no
  asambleas?: string;        // trimestral | semestral | anual | nunca
  socios?: string;           // 1 | 2-3 | 4-10 | 10+
  // Perfil operativo-digital
  web?: string;
  correoDominio?: string;    // propio | personal
  conmutador?: string;       // si | no
  canales?: string;          // whatsapp | slack | teams | mixto | ninguno
  // Ubicación y alcance
  direccion?: string;
  lat?: number;
  lng?: number;
  alcance?: string;          // local | regional | nacional | multinacional
  sucursales?: string;
};

/** Estados financieros (captura manual o parseados de upload). */
export type AddBack = { concepto: string; monto: number };
export type Financials = {
  moneda?: string;
  ingresos?: number | null;
  costoVentas?: number | null;
  gastosOperativos?: number | null;
  utilidadNeta?: number | null;
  activos?: number | null;
  pasivos?: number | null;
  addbacks?: AddBack[];
};

/** Valuación estimada (múltiplos por industria sobre EBITDA normalizado). */
export type Valuacion = {
  ebitda: number | null;
  ebitdaNormalizado: number | null;
  margenOperativo: number | null;   // %
  multiplo: number;
  valorMin: number | null;
  valorMax: number | null;
};

/** Contexto de mercado (snapshot que acompaña el diagnóstico). */
export type MacroCtx = {
  inflacion?: number; tasaReferencia?: number; cetes?: number;
  tipoCambio?: number; petroleo?: number; fuente?: string; actualizado?: string;
};
export type IndustriaCtx = {
  sector?: string; crecimiento?: number; esperanzaVida?: number;
  medianaMargen?: number; fuente?: string;
};
export type ContextoMercado = { macro: MacroCtx; industria: IndustriaCtx };

export type Respuesta = { preguntaId: string; opcionId: string };

export type ResultadoDimension = {
  id: DimensionId;
  nombre: string;
  valor: number | null;   // 0..4, null si no medida
  preguntas: number;      // cuántas la alimentaron
  confiable: boolean;     // suficientes preguntas para no mostrar en gris
  semaforo: Semaforo | 'gris';
};

export type Resultado = {
  dimensiones: ResultadoDimension[];
  promedioGeneral: number | null;
  tipoEmpresa: TipoEmpresa;
  top3: DimensionId[];
};

export type Diagnostico = {
  id: string;
  organizacionId: string;
  userId: string;
  nivel: number;
  estado: 'en_progreso' | 'completado';
  perfil: PerfilContextual;
  resultado: Resultado | null;
  tipoEmpresa: TipoEmpresa | null;
  financials: Financials | null;
  mercado: ContextoMercado | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};
