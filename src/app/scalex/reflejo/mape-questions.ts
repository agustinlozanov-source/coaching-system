// ============================================================================
// SCALEx — MAPE Indicadores (Cuestionario v1)
// ============================================================================
// Copiado fielmente de /assets/js/mape-questions.js del portal SCALEx.
// 12 indicadores en 2 ejes, formato mixto: likert / numérico / selector.
// ============================================================================

export const MAPE_VERSION = 'v1';

export type MapeOpcionLikert = { valor: number; label: string };

export const MAPE_ESCALA_LIKERT: MapeOpcionLikert[] = [
  { valor: 1, label: 'Nada de acuerdo' },
  { valor: 2, label: 'Poco de acuerdo' },
  { valor: 3, label: 'Neutral' },
  { valor: 4, label: 'De acuerdo' },
  { valor: 5, label: 'Muy de acuerdo' },
];

export type MapeEje = {
  codigo: string;
  numero: number;
  titulo: string;
  pregunta: string;
  descripcion: string;
  icono: string;
};

export const MAPE_EJES: MapeEje[] = [
  {
    codigo: 'financiero',
    numero: 1,
    titulo: 'Crecimiento financiero',
    pregunta: '¿Tu empresa genera dinero de forma sostenible?',
    descripcion: 'Rentabilidad real, flujo de efectivo y dependencia de deuda',
    icono: 'trending-up',
  },
  {
    codigo: 'operativo',
    numero: 2,
    titulo: 'Capacidad operativa',
    pregunta: '¿Tu estructura aguanta el siguiente nivel de crecimiento?',
    descripcion: 'Procesos, delegación y autonomía del equipo',
    icono: 'settings',
  },
];

export type MapeIndicadorTipo = 'likert' | 'numerico' | 'selector';

export type MapeOpcionSelector = { codigo: string; label: string; score: number };

export type MapeIndicador = {
  codigo: string;
  eje: string;
  orden: number;
  tipo: MapeIndicadorTipo;
  texto: string;
  suffix?: string;
  hint?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  opciones?: MapeOpcionSelector[];
  normalizar?: (v: string | number) => number;
};

const likertNormalizar = (v: string | number) => {
  const n = parseInt(String(v), 10);
  return Math.max(0, Math.min(100, (n - 1) * 25));
};

export const MAPE_INDICADORES: MapeIndicador[] = [
  // ══════════ EJE 1 - CRECIMIENTO FINANCIERO (6 indicadores) ══════════
  {
    codigo: 'financiero_1',
    eje: 'financiero',
    orden: 1,
    tipo: 'numerico',
    texto: '¿Cuál fue tu rentabilidad neta promedio en los últimos 12 meses?',
    suffix: '% sobre ingresos',
    hint: 'Referencia: Negocios sanos en LATAM rondan 15-25% según industria. Si no la conoces con precisión, estima.',
    placeholder: '0',
    min: -50,
    max: 100,
    normalizar: (v) => {
      const n = parseFloat(String(v));
      if (isNaN(n)) return 0;
      if (n < 0) return 0;
      if (n < 5) return 15;
      if (n < 10) return 35;
      if (n < 15) return 55;
      if (n < 20) return 75;
      if (n < 30) return 90;
      return 100;
    },
  },
  {
    codigo: 'financiero_2',
    eje: 'financiero',
    orden: 2,
    tipo: 'selector',
    texto: '¿Cómo está tu flujo de efectivo actualmente?',
    opciones: [
      { codigo: 'negativo', label: 'Negativo', score: 0 },
      { codigo: 'al_filo', label: 'Justo / al filo', score: 30 },
      { codigo: 'positivo_estable', label: 'Positivo estable', score: 70 },
      { codigo: 'holgado', label: 'Holgado con reserva', score: 100 },
    ],
  },
  {
    codigo: 'financiero_3',
    eje: 'financiero',
    orden: 3,
    tipo: 'numerico',
    texto: '¿Qué porcentaje representa tu deuda externa sobre tus ingresos anuales?',
    suffix: '% deuda / ingresos',
    hint: 'Sano: menos del 30%. Alerta: 30-50%. Crítico: más del 50%.',
    placeholder: '0',
    min: 0,
    max: 200,
    normalizar: (v) => {
      const n = parseFloat(String(v));
      if (isNaN(n)) return 50;
      if (n <= 10) return 100;
      if (n <= 20) return 85;
      if (n <= 30) return 70;
      if (n <= 50) return 40;
      if (n <= 80) return 15;
      return 0;
    },
  },
  {
    codigo: 'financiero_4',
    eje: 'financiero',
    orden: 4,
    tipo: 'likert',
    texto: '"Si dejáramos de vender un mes completo, mi empresa podría operar sin colapsar financieramente."',
    normalizar: likertNormalizar,
  },
  {
    codigo: 'financiero_5',
    eje: 'financiero',
    orden: 5,
    tipo: 'selector',
    texto: '¿Cómo ha evolucionado tu facturación en los últimos 12 meses?',
    opciones: [
      { codigo: 'cae', label: 'Está cayendo', score: 0 },
      { codigo: 'estable', label: 'Estable o casi sin cambio', score: 35 },
      { codigo: 'crece_lento', label: 'Crece lento (menos del 15% anual)', score: 65 },
      { codigo: 'crece_fuerte', label: 'Crece fuerte (más del 15% anual)', score: 100 },
    ],
  },
  {
    codigo: 'financiero_6',
    eje: 'financiero',
    orden: 6,
    tipo: 'likert',
    texto: '"Conozco con precisión el costo real de cada producto o servicio que vendo."',
    normalizar: likertNormalizar,
  },

  // ══════════ EJE 2 - CAPACIDAD OPERATIVA (6 indicadores) ══════════
  {
    codigo: 'operativo_1',
    eje: 'operativo',
    orden: 1,
    tipo: 'selector',
    texto: '¿Qué tan documentados están tus procesos clave?',
    opciones: [
      { codigo: 'ninguno', label: 'Ninguno documentado', score: 0 },
      { codigo: 'algunos', label: 'Algunos, sin sistema', score: 30 },
      { codigo: 'mayoria', label: 'La mayoría, con manuales', score: 70 },
      { codigo: 'todos', label: 'Todos, vivos y actualizados', score: 100 },
    ],
  },
  {
    codigo: 'operativo_2',
    eje: 'operativo',
    orden: 2,
    tipo: 'likert',
    texto: '"Mi equipo toma decisiones operativas sin necesidad de consultarme."',
    normalizar: likertNormalizar,
  },
  {
    codigo: 'operativo_3',
    eje: 'operativo',
    orden: 3,
    tipo: 'likert',
    texto: '"Si me ausento un mes completo, la empresa sigue operando con normalidad."',
    normalizar: likertNormalizar,
  },
  {
    codigo: 'operativo_4',
    eje: 'operativo',
    orden: 4,
    tipo: 'selector',
    texto: 'Cuando entra un cliente nuevo, ¿qué tan estandarizado es el proceso de atención?',
    opciones: [
      { codigo: 'cada_vez', label: 'Cada vez es diferente', score: 0 },
      { codigo: 'pasos_basicos', label: 'Tenemos pasos básicos en mente', score: 35 },
      { codigo: 'flujo_definido', label: 'Tenemos un flujo definido y documentado', score: 75 },
      { codigo: 'sistemico', label: 'Es sistémico y medible con KPIs', score: 100 },
    ],
  },
  {
    codigo: 'operativo_5',
    eje: 'operativo',
    orden: 5,
    tipo: 'likert',
    texto: '"Tenemos indicadores (KPIs) que revisamos periódicamente para medir la operación."',
    normalizar: likertNormalizar,
  },
  {
    codigo: 'operativo_6',
    eje: 'operativo',
    orden: 6,
    tipo: 'selector',
    texto: 'Si tu equipo tiene que crecer un 30%, ¿qué tan fácil sería absorberlo?',
    opciones: [
      { codigo: 'imposible', label: 'Imposible sin caos', score: 0 },
      { codigo: 'dificil', label: 'Difícil, requeriría reorganización fuerte', score: 30 },
      { codigo: 'manejable', label: 'Manejable con ajustes', score: 70 },
      { codigo: 'sencillo', label: 'Sencillo, la estructura está lista', score: 100 },
    ],
  },
];

export type MapeCuadrante = {
  codigo: string;
  nombre: string;
  color: 'green' | 'amber' | 'red';
  badge: string;
  descripcion_corta: string;
  descripcion_larga: string;
  riesgo_principal: string | null;
  acciones: string[];
};

export const MAPE_CUADRANTES: Record<string, MapeCuadrante> = {
  crecimiento_escalable: {
    codigo: 'crecimiento_escalable',
    nombre: 'Crecimiento Escalable',
    color: 'green',
    badge: 'SALUDABLE',
    descripcion_corta: 'Listo para escalar con control',
    descripcion_larga: 'Tu empresa está financieramente saludable y con estructura lista para crecimiento sin caos. No depende de una sola persona. Es el cuadrante objetivo.',
    riesgo_principal: null,
    acciones: [
      'Optimiza sistemas y automatiza para seguir escalando sin fricción.',
      'Expande sin miedo, manteniendo control sobre la operación y finanzas.',
      'Empieza a pensar en nuevos mercados, productos o canales de venta.',
    ],
  },
  crecimiento_fragil: {
    codigo: 'crecimiento_fragil',
    nombre: 'Crecimiento Frágil',
    color: 'amber',
    badge: 'ATENCION',
    descripcion_corta: 'Crece, pero sin estructura',
    descripcion_larga: 'Tu empresa está creciendo, pero el equipo y los procesos no están preparados. Se siente la sobrecarga y el caos interno. El dueño sigue involucrado en demasiadas decisiones.',
    riesgo_principal: 'Puede colapsar por desorden interno. La rentabilidad va a empezar a caer si no estructuras.',
    acciones: [
      'Estructura procesos claros y delega funciones clave.',
      'Implementa sistemas de control financiero y operativo antes de seguir creciendo.',
      'Identifica al menos un área completa que pueda funcionar sin tu intervención diaria.',
    ],
  },
  financiero_estancado: {
    codigo: 'financiero_estancado',
    nombre: 'Crecimiento Financiero Estancado',
    color: 'amber',
    badge: 'ATENCION',
    descripcion_corta: 'Bien gestionada, pero no crece',
    descripcion_larga: 'Tienen procesos sólidos y estructura clara, pero el mercado no responde como debería. No están escalando, solo sobreviviendo con estabilidad.',
    riesgo_principal: 'La empresa puede volverse irrelevante con el tiempo. Sin crecimiento financiero, no hay sostenibilidad a largo plazo.',
    acciones: [
      'Revisa el modelo de negocio y su rentabilidad real.',
      'Busca nuevas oportunidades de mercado o diversificación.',
      'Cuestiona si tu propuesta de valor sigue siendo relevante.',
    ],
  },
  zona_estancamiento: {
    codigo: 'zona_estancamiento',
    nombre: 'Zona de Estancamiento',
    color: 'red',
    badge: 'URGENTE',
    descripcion_corta: 'Atrapado: ni crece, ni está listo',
    descripcion_larga: 'Tu empresa está atrapada. No crece y tampoco está lista para hacerlo. El dueño toma casi todas las decisiones, no hay procesos definidos y las finanzas están en modo supervivencia.',
    riesgo_principal: 'Puede caer en crisis o desaparecer en los próximos años. La falta de acción estructurada impide cualquier posibilidad real de escalabilidad.',
    acciones: [
      'Reestructura la visión del negocio y del dueño — urgente.',
      'Implementa cambios profundos en estrategia, liderazgo y control financiero.',
      'Empieza por una decisión clave: delegar al menos una función completa esta semana.',
    ],
  },
};

export function getCuadrante(puntajeFinanciero: number, puntajeOperativo: number): MapeCuadrante {
  const fin = puntajeFinanciero >= 50;
  const op = puntajeOperativo >= 50;
  if (fin && op) return MAPE_CUADRANTES.crecimiento_escalable;
  if (fin && !op) return MAPE_CUADRANTES.crecimiento_fragil;
  if (!fin && op) return MAPE_CUADRANTES.financiero_estancado;
  return MAPE_CUADRANTES.zona_estancamiento;
}

export function getIndicadoresByEje(ejeCodigo: string): MapeIndicador[] {
  return MAPE_INDICADORES.filter((i) => i.eje === ejeCodigo);
}

export function getIndicadorByCodigo(codigo: string): MapeIndicador | undefined {
  return MAPE_INDICADORES.find((i) => i.codigo === codigo);
}

export function getEjeByCodigo(codigo: string): MapeEje | undefined {
  return MAPE_EJES.find((e) => e.codigo === codigo);
}

export function normalizarRespuesta(indicador: MapeIndicador | undefined, rawValue: string | number): number {
  if (!indicador) return 0;
  if (indicador.tipo === 'likert' || indicador.tipo === 'numerico') {
    return indicador.normalizar ? indicador.normalizar(rawValue) : 0;
  }
  if (indicador.tipo === 'selector') {
    const opcion = indicador.opciones?.find((o) => o.codigo === rawValue);
    return opcion ? opcion.score : 0;
  }
  return 0;
}

// Posición del punto en la matriz para visualización (0-100 -> coords % CSS)
export function getPosicionMatriz(puntajeFinanciero: number, puntajeOperativo: number) {
  const topPct = 95 - puntajeFinanciero * 0.9;
  const leftPct = 95 - puntajeOperativo * 0.9;
  return {
    top: Math.max(5, Math.min(95, topPct)),
    left: Math.max(5, Math.min(95, leftPct)),
  };
}
