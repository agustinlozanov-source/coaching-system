// ============================================================================
// SCALEx — PIE Questions (Cuestionario v1)
// ============================================================================
// Copiado fielmente de /assets/js/pie-questions.js del portal SCALEx.
// 20 preguntas en 4 secciones, escala Likert 1-5.
// ============================================================================

export const PIE_VERSION = 'v1';

export type PieOpcionEscala = { valor: number; label: string };

export const PIE_ESCALA: PieOpcionEscala[] = [
  { valor: 1, label: 'Nada de acuerdo' },
  { valor: 2, label: 'Poco de acuerdo' },
  { valor: 3, label: 'Neutral' },
  { valor: 4, label: 'De acuerdo' },
  { valor: 5, label: 'Muy de acuerdo' },
];

export type PieSeccion = {
  codigo: string;
  numero: number;
  titulo: string;
  pregunta: string;
  descripcion: string;
};

export const PIE_SECCIONES: PieSeccion[] = [
  {
    codigo: 'mentalidad',
    numero: 1,
    titulo: 'Mentalidad empresarial',
    pregunta: '¿Cómo piensas sobre tu rol como dueño y el crecimiento de tu empresa?',
    descripcion: 'Tu visión sobre el liderazgo y el crecimiento estructurado',
  },
  {
    codigo: 'decisiones',
    numero: 2,
    titulo: 'Toma de decisiones',
    pregunta: '¿Tomas decisiones estratégicas o reaccionas sin estructura?',
    descripcion: 'Tu método y proceso para decidir',
  },
  {
    codigo: 'delegacion',
    numero: 3,
    titulo: 'Delegación y liderazgo',
    pregunta: '¿Sigues siendo el cuello de botella o ya aprendiste a delegar?',
    descripcion: 'Tu capacidad de ceder control sin perder dirección',
  },
  {
    codigo: 'vision',
    numero: 4,
    titulo: 'Visión y estrategia personal',
    pregunta: '¿Tienes una visión clara para escalar o solo estás sobreviviendo?',
    descripcion: 'Tu claridad sobre el rumbo a mediano y largo plazo',
  },
];

export type PiePregunta = {
  codigo: string;
  seccion: string;
  orden: number;
  texto: string;
};

export const PIE_PREGUNTAS: PiePregunta[] = [
  // SECCION 1 - MENTALIDAD EMPRESARIAL
  { codigo: 'mentalidad_1', seccion: 'mentalidad', orden: 1, texto: 'Tengo claro que para escalar mi negocio, mi rol dentro de la empresa debe evolucionar.' },
  { codigo: 'mentalidad_2', seccion: 'mentalidad', orden: 2, texto: 'Estoy dispuesto a aprender y desaprender para hacer crecer mi empresa.' },
  { codigo: 'mentalidad_3', seccion: 'mentalidad', orden: 3, texto: 'Tomo decisiones estratégicas basadas en datos y no solo en intuición.' },
  { codigo: 'mentalidad_4', seccion: 'mentalidad', orden: 4, texto: 'Mi prioridad es el crecimiento estructurado de mi empresa, no solo la facturación mensual.' },
  { codigo: 'mentalidad_5', seccion: 'mentalidad', orden: 5, texto: 'Entiendo que un negocio que depende totalmente de mí tiene un techo claro.' },

  // SECCION 2 - TOMA DE DECISIONES
  { codigo: 'decisiones_1', seccion: 'decisiones', orden: 1, texto: 'Tengo un proceso definido para tomar decisiones clave en mi empresa.' },
  { codigo: 'decisiones_2', seccion: 'decisiones', orden: 2, texto: 'Cuando una decisión es crítica, la analizo desde diferentes ángulos antes de ejecutarla.' },
  { codigo: 'decisiones_3', seccion: 'decisiones', orden: 3, texto: 'Confío en mi equipo para que participe en la toma de decisiones estratégicas.' },
  { codigo: 'decisiones_4', seccion: 'decisiones', orden: 4, texto: 'Evito tomar decisiones basadas en emociones sin respaldo de datos o análisis.' },
  { codigo: 'decisiones_5', seccion: 'decisiones', orden: 5, texto: 'Reviso periódicamente las consecuencias de mis decisiones anteriores para mejorar.' },

  // SECCION 3 - DELEGACION Y LIDERAZGO
  { codigo: 'delegacion_1', seccion: 'delegacion', orden: 1, texto: 'Delego funciones estratégicas, no solo tareas operativas.' },
  { codigo: 'delegacion_2', seccion: 'delegacion', orden: 2, texto: 'Mi equipo tiene claridad sobre sus responsabilidades sin que yo tenga que intervenir todo el tiempo.' },
  { codigo: 'delegacion_3', seccion: 'delegacion', orden: 3, texto: 'Confío en mi equipo para tomar decisiones sin depender de mí en todo momento.' },
  { codigo: 'delegacion_4', seccion: 'delegacion', orden: 4, texto: 'Podría ausentarme por un mes sin que la empresa colapse.' },
  { codigo: 'delegacion_5', seccion: 'delegacion', orden: 5, texto: 'Mi equipo conoce los procesos clave del negocio y los puede ejecutar sin mi supervisión directa.' },

  // SECCION 4 - VISION Y ESTRATEGIA PERSONAL
  { codigo: 'vision_1', seccion: 'vision', orden: 1, texto: 'Tengo una visión clara para mi empresa a 5-10 años.' },
  { codigo: 'vision_2', seccion: 'vision', orden: 2, texto: 'Cada decisión que tomo está alineada con la estrategia a largo plazo del negocio.' },
  { codigo: 'vision_3', seccion: 'vision', orden: 3, texto: 'Tengo objetivos estratégicos bien definidos y medibles.' },
  { codigo: 'vision_4', seccion: 'vision', orden: 4, texto: 'Soy consciente de las áreas donde necesito mejorar como líder y trabajo en ello.' },
  { codigo: 'vision_5', seccion: 'vision', orden: 5, texto: 'Tengo un plan estructurado para hacer crecer mi negocio sin sacrificar la calidad de vida.' },
];

export type PiePerfil = {
  codigo: string;
  nombre: string;
  rango: string;
  rango_min: number;
  rango_max: number;
  color: 'green' | 'teal' | 'amber' | 'red';
  emoji: string;
  descripcion_corta: string;
  descripcion_larga: string;
  acciones: string[];
};

export const PIE_PERFILES: Record<string, PiePerfil> = {
  lider_estrategico: {
    codigo: 'lider_estrategico',
    nombre: 'Líder Estratégico',
    rango: '80 - 100 puntos',
    rango_min: 80,
    rango_max: 100,
    color: 'green',
    emoji: 'star',
    descripcion_corta: 'Listo para escalar sin fricciones',
    descripcion_larga: 'Tienes visión clara, tomas decisiones estratégicas y tu empresa no depende totalmente de ti. Has aprendido a delegar y a pensar en crecimiento sin quedarte atrapado en la operación.',
    acciones: [
      'Asegurar que tu empresa esté lista para escalar sin fricciones.',
      'Enfocarte en mejorar procesos de crecimiento y expansión.',
      'Utilizar herramientas de automatización y control financiero.',
    ],
  },
  lider_transicion: {
    codigo: 'lider_transicion',
    nombre: 'Líder en Transición',
    rango: '60 - 79 puntos',
    rango_min: 60,
    rango_max: 79,
    color: 'teal',
    emoji: 'trending-up',
    descripcion_corta: 'En camino, con espacio para crecer',
    descripcion_larga: 'Estás en camino, pero todavía tienes aspectos que te frenan. Tomas decisiones estratégicas, pero sigues demasiado involucrado en la operación.',
    acciones: [
      'Definir claramente qué tareas seguirás haciendo tú y cuáles debes delegar.',
      'Crear sistemas de toma de decisiones estructurados para reducir la dependencia en ti.',
      'Trabajar en herramientas de visión y planificación estratégica.',
    ],
  },
  lider_operativo: {
    codigo: 'lider_operativo',
    nombre: 'Líder Operativo',
    rango: '40 - 59 puntos',
    rango_min: 40,
    rango_max: 59,
    color: 'amber',
    emoji: 'alert-triangle',
    descripcion_corta: 'Cuello de botella de tu propio negocio',
    descripcion_larga: 'Tu empresa sigue dependiendo demasiado de ti y tomas decisiones basadas en urgencias. Delegas poco o nada, lo que te convierte en un cuello de botella para el crecimiento.',
    acciones: [
      'Identificar qué actividades son estratégicas y cuáles debes delegar inmediatamente.',
      'Implementar reuniones de alineación con tu equipo para mejorar la comunicación.',
      'Crear un plan de acción de 90 días para dejar de estar en la operación diaria.',
    ],
  },
  lider_reactivo: {
    codigo: 'lider_reactivo',
    nombre: 'Líder Reactivo',
    rango: 'Menos de 40 puntos',
    rango_min: 0,
    rango_max: 39,
    color: 'red',
    emoji: 'flame',
    descripcion_corta: 'Modo supervivencia',
    descripcion_larga: 'No tienes claridad en tu visión, liderazgo ni procesos de toma de decisiones. Tu negocio opera en modo supervivencia, sin planificación ni estrategia.',
    acciones: [
      'Definir urgentemente un propósito claro y una visión a largo plazo.',
      'Empezar por delegar tareas simples y medir el impacto.',
      'Hacer una revisión de modelo de negocio con herramientas de planificación.',
    ],
  },
};

export function getPerfilByPuntaje(puntaje: number): PiePerfil {
  if (puntaje >= 80) return PIE_PERFILES.lider_estrategico;
  if (puntaje >= 60) return PIE_PERFILES.lider_transicion;
  if (puntaje >= 40) return PIE_PERFILES.lider_operativo;
  return PIE_PERFILES.lider_reactivo;
}

export function getPreguntasBySeccion(seccion: string): PiePregunta[] {
  return PIE_PREGUNTAS.filter((p) => p.seccion === seccion);
}

export function getSeccionByCodigo(codigo: string): PieSeccion | undefined {
  return PIE_SECCIONES.find((s) => s.codigo === codigo);
}
