// catalog.ts — SCALEx · ADN · Catálogos (copiados fielmente del portal)
// Fuente: assets/js/adn-paso0-catalogo.js, adn-paso1-catalogo.js,
//         adn-hibridos-catalogo.js, adn-piramides-rectores-catalogo.js

/* ══════════════════════════════════════════════════════════════════════════
   PASO 0 — Diagnóstico de Pirámide (20 tesis detonantes)
   ══════════════════════════════════════════════════════════════════════════ */

export type RespuestaTipo = 'A' | 'B' | 'C' | 'D';

export type TesisPaso0 = {
  numero: number;
  titulo: string;
  angulo: string;
  detonante: string;
  respuestas: { tipo: RespuestaTipo; descripcion: string }[];
};

export const TESIS_PASO_0: TesisPaso0[] = [
  {
    numero: 1,
    titulo: 'El estacionamiento',
    angulo: 'Jerarquía espacial física',
    detonante:
      'Imagínate que vas a construir tu empresa desde cero en un terreno nuevo. Tienes que diseñar el estacionamiento. ¿Dónde van los lugares más cercanos a la entrada? ¿Quiénes se estacionan ahí? ¿Y los más lejanos?',
    respuestas: [
      { tipo: 'A', descripcion: 'Lugares cercanos para dueño y dirección. Clientes y proveedores al final.' },
      { tipo: 'B', descripcion: 'Dirección cerca, pero también clientes con espacios reservados.' },
      { tipo: 'C', descripcion: 'Primero clientes, después proveedores, después empleados. Su lugar al final.' },
      { tipo: 'D', descripcion: 'Diseñó por flujo del público, justificando cada decisión por servicio.' },
    ],
  },
  {
    numero: 2,
    titulo: 'La sala de juntas',
    angulo: 'Jerarquía espacial simbólica',
    detonante:
      "En tu sala de juntas, ¿hay un lugar que es 'el lugar del jefe'? Si entra un cliente importante, ¿dónde lo sientas?",
    respuestas: [
      { tipo: 'A', descripcion: 'Cabecera fija del dueño. No se cede ni para clientes.' },
      { tipo: 'B', descripcion: 'Cabecera del dueño, pero a clientes importantes sí se cede a veces.' },
      { tipo: 'C', descripcion: 'No hay lugar fijo. El que llega primero se sienta donde quiera.' },
      { tipo: 'D', descripcion: 'Mesa redonda o círculo. La jerarquía espacial no existe.' },
    ],
  },
  {
    numero: 3,
    titulo: 'La primera línea al teléfono',
    angulo: 'Autoridad de quien toca al cliente',
    detonante:
      'Si soy cliente nuevo y llamo, ¿quién contesta? ¿Puede resolverme algo o tiene que escalar? Si la queja es fuerte, ¿hasta dónde llega?',
    respuestas: [
      { tipo: 'A', descripcion: 'Recepcionista sin autoridad. Quejas fuertes llegan al dueño.' },
      { tipo: 'B', descripcion: 'Servicio al cliente con autoridad limitada. Escalan a gerencia.' },
      { tipo: 'C', descripcion: 'Persona capacitada para resolver el 80%. Solo casos excepcionales escalan.' },
      { tipo: 'D', descripcion: 'La primera persona tiene autoridad, presupuesto y protocolo. El cliente no repite su historia.' },
    ],
  },
  {
    numero: 4,
    titulo: 'Las decisiones de $5,000',
    angulo: 'Distribución del poder operativo',
    detonante:
      'Una decisión de $5,000 para mejorar la atención de un cliente — comprar, contratar, regalar algo. ¿Quién la toma? ¿Cuántas aprobaciones?',
    respuestas: [
      { tipo: 'A', descripcion: 'Solo el dueño. Cualquier gasto pasa por él.' },
      { tipo: 'B', descripcion: 'El dueño o un socio. 2-3 niveles de aprobación.' },
      { tipo: 'C', descripcion: 'Gerentes de área dentro de su presupuesto. 1 nivel.' },
      { tipo: 'D', descripcion: 'El que atiende al cliente puede decidir. 0 niveles, solo reporta después.' },
    ],
  },
  {
    numero: 5,
    titulo: 'El orden de la agenda de dirección',
    angulo: 'Qué está primero en la cabeza del dueño',
    detonante: 'En tu junta de dirección, ¿cuál es el primer punto de la agenda? ¿De qué hablan primero?',
    respuestas: [
      { tipo: 'A', descripcion: 'Números financieros: ventas, cobranza, gastos.' },
      { tipo: 'B', descripcion: 'Operación interna: quién hizo qué, qué falta.' },
      { tipo: 'C', descripcion: 'Equipo: cómo están las personas, qué necesitan.' },
      { tipo: 'D', descripcion: 'Públicos: cómo están los clientes, qué nos piden, qué se está perdiendo.' },
    ],
  },
  {
    numero: 6,
    titulo: 'El empleado nuevo en sus primeras 8 horas',
    angulo: 'Diseño del onboarding',
    detonante:
      'Una persona nueva entra hoy. En sus primeras 8 horas, ¿qué pasa? ¿Quién la recibe, qué le explican, cuándo conoce a sus compañeros?',
    respuestas: [
      { tipo: 'A', descripcion: 'Llega y la dejan. Pregunta todo. Nadie se acerca.' },
      { tipo: 'B', descripcion: 'Alguien la recibe, explica lo básico, presenta a 2-3. El resto sola.' },
      { tipo: 'C', descripcion: 'Onboarding de medio día con persona asignada y materiales.' },
      { tipo: 'D', descripcion: 'Onboarding diseñado a 90 días. Día 1 ya sabe metas, herramientas, capacitador, procesos.' },
    ],
  },
  {
    numero: 7,
    titulo: 'La propuesta del último empleado',
    angulo: 'Velocidad de ideas hacia decisión',
    detonante: '¿Cuándo fue la última vez que un empleado de primera línea te propuso algo? ¿Qué pasó con esa propuesta?',
    respuestas: [
      { tipo: 'A', descripcion: 'No recuerdo una reciente. O si la hubo, no llegó a nada.' },
      { tipo: 'B', descripcion: 'Recuerdo alguna. La escuchamos pero no se implementó.' },
      { tipo: 'C', descripcion: 'Hubo una que se ejecutó después de varias semanas.' },
      { tipo: 'D', descripcion: 'Pasa constantemente. Hay mecanismo para que lleguen a decisión rápido.' },
    ],
  },
  {
    numero: 8,
    titulo: 'El cliente que se queja',
    angulo: 'Reflejo de la cultura ante el conflicto',
    detonante: 'Un cliente importante se queja fuerte con un empleado. ¿Qué es lo primero que pasa?',
    respuestas: [
      { tipo: 'A', descripcion: 'El empleado se defiende como puede. Se informa al dueño después. Hay regaño.' },
      { tipo: 'B', descripcion: 'Escala al jefe inmediato. Se contesta cuando se pueda. Se busca culpable.' },
      { tipo: 'C', descripcion: 'Hay protocolo. Se documenta, se responde en X tiempo, se analiza la causa.' },
      { tipo: 'D', descripcion: 'El empleado resuelve en el momento dentro de un rango. El sistema captura el aprendizaje.' },
    ],
  },
  {
    numero: 9,
    titulo: 'El tiempo del dueño',
    angulo: 'Dónde invierte energía el líder',
    detonante: 'De tu semana, ¿cuánto tiempo apagando fuegos urgentes vs pensando el futuro?',
    respuestas: [
      { tipo: 'A', descripcion: 'Casi todo apagando fuegos. El futuro lo pienso en domingo o nunca.' },
      { tipo: 'B', descripcion: '70% fuegos, 30% futuro, a ratos.' },
      { tipo: 'C', descripcion: '50/50, con espacios protegidos.' },
      { tipo: 'D', descripcion: '30% operativo, 70% estratégico. La operación corre sin mí.' },
    ],
  },
  {
    numero: 10,
    titulo: 'El mes sin avisar',
    angulo: 'Test de dependencia del dueño',
    detonante: 'Si te fueras un mes sin avisar — desconectado total — ¿qué pasaría con tu empresa?',
    respuestas: [
      { tipo: 'A', descripcion: 'Colapsa o se paraliza. Todo se acumula esperándome.' },
      { tipo: 'B', descripcion: 'Funciona a medias. Las decisiones importantes se posponen.' },
      { tipo: 'C', descripcion: 'Funciona bien en operación. Algunas decisiones grandes esperan.' },
      { tipo: 'D', descripcion: 'Funciona normalmente. Hay sistema, personas con autoridad, protocolos.' },
    ],
  },
  {
    numero: 11,
    titulo: 'Los procesos escritos',
    angulo: 'Operación en cabezas vs en sistemas',
    detonante:
      'Los procesos críticos — atención, contratación, quejas, cobranza — ¿están escritos en algún lado accesible?',
    respuestas: [
      { tipo: 'A', descripcion: 'No. Cada quien sabe lo suyo. Si alguien se va, el conocimiento se va con él.' },
      { tipo: 'B', descripcion: 'Algunos a medias. Hay documentos pero nadie los consulta.' },
      { tipo: 'C', descripcion: 'Los críticos están documentados, se consultan ocasionalmente.' },
      { tipo: 'D', descripcion: 'Todos los clave escritos, actualizados, los nuevos aprenden de ahí. El sistema vive en documentos.' },
    ],
  },
  {
    numero: 12,
    titulo: 'La mala noticia',
    angulo: 'Mesura del líder vs víscera',
    detonante: 'Llega una mala noticia importante a media mañana. ¿Cómo reacciona tu equipo ante tu reacción?',
    respuestas: [
      { tipo: 'A', descripcion: 'Mi reacción contagia rápido. Se nota cuando algo va mal.' },
      { tipo: 'B', descripcion: 'Algunos lo notan. Intento controlarme pero a veces se sale.' },
      { tipo: 'C', descripcion: 'Proceso antes de comunicar. Casi siempre logro mesura.' },
      { tipo: 'D', descripcion: 'Mi equipo no detecta mi estado por mi reacción. Proceso primero, comunico con claridad.' },
    ],
  },
  {
    numero: 13,
    titulo: 'El despido que no has hecho',
    angulo: 'Claridad de cuándo alguien no encaja',
    detonante: '¿Hay alguien en tu equipo que sabes que no debería seguir pero todavía no has hablado con esa persona?',
    respuestas: [
      { tipo: 'A', descripcion: 'Sí, varios. No sé bien cómo abordarlo.' },
      { tipo: 'B', descripcion: 'Sí, uno. Llevo meses postergándolo.' },
      { tipo: 'C', descripcion: 'No, lo que tengo que hablar lo hablo. A veces tardo pero lo hago.' },
      { tipo: 'D', descripcion: 'No, tengo claridad de quién encaja y las conversaciones difíciles las tengo a tiempo.' },
    ],
  },
  {
    numero: 14,
    titulo: 'La contratación por intuición vs proceso',
    angulo: 'Diseño de la entrada al equipo',
    detonante: 'La última contratación importante, ¿cómo la decidiste? ¿Intuición, recomendación, proceso formal?',
    respuestas: [
      { tipo: 'A', descripcion: 'Intuición o recomendación. Le di chance porque me cayó bien.' },
      { tipo: 'B', descripcion: 'Intuición con algunas entrevistas. Sin proceso formal.' },
      { tipo: 'C', descripcion: 'Varias entrevistas y referencias. Yo decidí al final.' },
      { tipo: 'D', descripcion: 'Proceso con criterios claros, varios evaluadores, decisión colectiva por perfil de rol.' },
    ],
  },
  {
    numero: 15,
    titulo: 'El horario del dueño',
    angulo: 'Presencia obligatoria como síntoma',
    detonante:
      '¿Es indispensable que estés físicamente presente para que la operación funcione? ¿Notas la diferencia los días que no estás?',
    respuestas: [
      { tipo: 'A', descripcion: 'Si no estoy se nota mucho. La gente se ralentiza, se posponen decisiones.' },
      { tipo: 'B', descripcion: 'Se nota un poco. Lo importante igual se hace.' },
      { tipo: 'C', descripcion: 'Casi no se nota mi ausencia.' },
      { tipo: 'D', descripcion: 'Mi presencia o ausencia no afecta la operación. Mi rol es estratégico.' },
    ],
  },
  {
    numero: 16,
    titulo: 'El feedback desde abajo',
    angulo: 'Cuando el empleado le dice al dueño qué está mal',
    detonante:
      '¿Cuándo fue la última vez que un empleado te dijo, cara a cara, que algo que TÚ haces no está bien para la empresa? ¿Cómo terminó?',
    respuestas: [
      { tipo: 'A', descripcion: 'No recuerdo. La gente no me dice esas cosas.' },
      { tipo: 'B', descripcion: 'Hace mucho. No terminó bien.' },
      { tipo: 'C', descripcion: 'Algunas veces. Me cuesta pero escucho.' },
      { tipo: 'D', descripcion: 'Con frecuencia, hay confianza, y muchas veces cambio cosas a partir de eso.' },
    ],
  },
  {
    numero: 17,
    titulo: 'El gasto imprevisto del cliente',
    angulo: 'Autoridad económica de primera línea',
    detonante: 'Un cliente necesita algo urgente que cuesta $2,000 y no estaba presupuestado. ¿Quién decide?',
    respuestas: [
      { tipo: 'A', descripcion: 'Yo. Me llaman aunque sea fin de semana.' },
      { tipo: 'B', descripcion: 'Un gerente. Pero termina consultándome.' },
      { tipo: 'C', descripcion: 'El gerente del área dentro de un rango.' },
      { tipo: 'D', descripcion: 'La persona que atiende al cliente. Tiene presupuesto delegado.' },
    ],
  },
  {
    numero: 18,
    titulo: 'La capacitación como inversión',
    angulo: 'Diseño del crecimiento del equipo',
    detonante: 'En los últimos 12 meses, ¿cuánto invertiste en capacitar a tu equipo? ¿Planeado o cuando se puede?',
    respuestas: [
      { tipo: 'A', descripcion: 'Muy poco o nada. Cuando hay tiempo o emergencia.' },
      { tipo: 'B', descripcion: 'Algo, sin plan. Aprovechamos oportunidades.' },
      { tipo: 'C', descripcion: 'Hay presupuesto anual de capacitación.' },
      { tipo: 'D', descripcion: 'Cada rol tiene plan de desarrollo. La capacitación es estructural.' },
    ],
  },
  {
    numero: 19,
    titulo: 'Las reuniones sin el dueño',
    angulo: 'Autonomía operativa del equipo',
    detonante: '¿Tu equipo tiene reuniones operativas regulares sin ti? ¿Te enteras por minutas o solo cuando algo falla?',
    respuestas: [
      { tipo: 'A', descripcion: 'No las hay. Si hay junta, yo estoy.' },
      { tipo: 'B', descripcion: 'Hay algunas pero termino entrando o me reportan informal.' },
      { tipo: 'C', descripcion: 'Hay reuniones sin mí. Me llegan resúmenes.' },
      { tipo: 'D', descripcion: 'El equipo opera con sus propias reuniones e indicadores. Solo reporta lo estratégico.' },
    ],
  },
  {
    numero: 20,
    titulo: 'El orgullo de lo construido',
    angulo: 'Qué celebra el dueño cuando habla de su empresa',
    detonante:
      'Cuando hablas con orgullo de tu empresa con alguien externo, ¿qué cuentas primero? ¿Qué te hace sentir orgulloso?',
    respuestas: [
      { tipo: 'A', descripcion: 'Lo que YO construí. Lo que logré contra viento y marea. El esfuerzo personal.' },
      { tipo: 'B', descripcion: 'Lo que hemos sobrevivido. Las crisis superadas. Mi tenacidad.' },
      { tipo: 'C', descripcion: 'El equipo que se formó. Lo que crecimos juntos.' },
      { tipo: 'D', descripcion: 'Los clientes que servimos, lo que transformamos para ellos, las historias de público que cambiaron.' },
    ],
  },
];

export const PUNTAJE_RESPUESTA: Record<RespuestaTipo, number> = { A: 1, B: 2, C: 3, D: 4 };

export type TipoPiramideCodigo = 'cerrada' | 'transicion' | 'abierta' | 'invertida';

export const RANGOS_PIRAMIDE: { min: number; max: number; codigo: TipoPiramideCodigo }[] = [
  { min: 20, max: 35, codigo: 'cerrada' },
  { min: 36, max: 50, codigo: 'transicion' },
  { min: 51, max: 65, codigo: 'abierta' },
  { min: 66, max: 80, codigo: 'invertida' },
];

/* ══════════════════════════════════════════════════════════════════════════
   CATÁLOGO FINAL DE ADN — Pirámides, Agendas, Rectores
   ══════════════════════════════════════════════════════════════════════════ */

export type PiramideInfo = {
  nombre: string;
  color: string;
  icono: string;
  rango: string;
  descripcion_corta: string;
  descripcion_larga: string;
  indicadores: string[];
  proximo_paso: string;
};

export const PIRAMIDES: Record<TipoPiramideCodigo, PiramideInfo> = {
  cerrada: {
    nombre: 'Pirámide Cerrada',
    color: '#FF3B30',
    icono: 'alert-triangle',
    rango: '20-35 puntos',
    descripcion_corta: 'Empresa tradicional donde el poder está concentrado en el dueño y la primera línea casi no decide.',
    descripcion_larga:
      'Tu empresa hoy opera bajo un modelo tradicional. El dueño es el centro de decisión, los procesos viven en cabezas y no en sistemas, y la primera línea — quien toca al público — tiene poca autoridad para resolver. Esto no es maldad: es ausencia de diseño. La mayoría de PyMEs en LATAM operan así porque heredaron el modelo, no porque lo eligieron. Es un buen punto de partida — porque ahora que ves la contraparte, puedes decidir si quieres construir otra cosa.',
    indicadores: [
      'Las decisiones cotidianas dependen casi siempre del dueño',
      'Si te ausentas, la operación se ralentiza significativamente',
      'Los procesos críticos viven en cabezas, no en documentos',
      'La primera línea escala las quejas en lugar de resolverlas',
      'El equipo trabaja con incertidumbre estructural',
    ],
    proximo_paso: 'Tu primera tarea es identificar UN proceso de alto valor que hoy depende de ti y diseñar cómo cederlo en los próximos 90 días.',
  },
  transicion: {
    nombre: 'Pirámide en Transición',
    color: '#FF9500',
    icono: 'trending-up',
    rango: '36-50 puntos',
    descripcion_corta: 'Empresa en proceso de inversión. Hay zonas con autonomía y zonas todavía centralizadas.',
    descripcion_larga:
      'Tu empresa está en el proceso más interesante y más difícil — invirtiendo la pirámide. Hay áreas donde ya hay autonomía operativa, procesos documentados y decisiones distribuidas. Pero también hay áreas críticas donde sigues siendo el cuello de botella. Esta etapa es delicada: si no aceleras, se estanca; si presionas demasiado rápido, se rompe. El trabajo es identificar los siguientes puntos de cesión y ejecutarlos con disciplina.',
    indicadores: [
      'Algunas áreas funcionan sin ti, otras no',
      'Hay procesos documentados parcialmente',
      'La primera línea tiene autoridad limitada pero existe',
      'Las decisiones financieras siguen siendo centralizadas',
      'Existe tensión entre lo viejo y lo nuevo',
    ],
    proximo_paso: 'Identifica las 2-3 áreas donde sigues siendo indispensable y diseña un plan plurianual para cederlas.',
  },
  abierta: {
    nombre: 'Pirámide Abierta',
    color: '#1AAB99',
    icono: 'users',
    rango: '51-65 puntos',
    descripcion_corta: 'Empresa con buena distribución del poder operativo. La mayoría de áreas funciona con autonomía.',
    descripcion_larga:
      'Tu empresa ya logró lo que la mayoría no logra: distribuir el poder operativo de forma estructural. La primera línea decide, los procesos viven en sistemas, y tu rol es mayormente estratégico. Estás en la antesala de la pirámide invertida — la verdadera ventaja competitiva. Lo que falta es consolidar las cesiones, profundizar la cultura de servicio al público, y construir los rectores que sostendrán el modelo en el largo plazo.',
    indicadores: [
      'La operación corre sin tu presencia diaria',
      'Hay procesos documentados y consultados',
      'La primera línea resuelve la mayoría de situaciones',
      'Tu tiempo se dedica mayormente a estrategia y futuro',
      'El equipo da feedback honesto hacia arriba',
    ],
    proximo_paso: 'Consolida las cesiones hechas y enfócate en los rectores faltantes — especialmente Transformación y Gobierno Institucional.',
  },
  invertida: {
    nombre: 'Pirámide Invertida',
    color: '#D4A256',
    icono: 'award',
    rango: '66-80 puntos',
    descripcion_corta: 'Empresa con el modelo de pirámide invertida operativo. Los públicos están en la cima, el liderazgo sostiene desde abajo.',
    descripcion_larga:
      'Has logrado lo que el 95% de las empresas en LATAM no logra. Tu pirámide está invertida — los públicos a los que sirves están en la cima, los procesos diferenciadores los sostienen, y tu liderazgo opera desde la base sosteniendo todo. Esto te da ventaja competitiva real: velocidad de decisión, calidad de servicio, retención de talento, capacidad de adquirir capital. El trabajo ahora es mantenimiento crítico — auditar que las cesiones no regresen al dueño y profundizar la cultura.',
    indicadores: [
      'La primera línea tiene autoridad y presupuesto delegado',
      'Los procesos viven en sistemas y se actualizan',
      'La operación opera sin tu presencia',
      'Las decisiones del cliente se resuelven sin escalar',
      'Tu rol es estratégico y de transformación',
    ],
    proximo_paso: 'Tu trabajo ahora es de mantenimiento: auditar que las cesiones no regresen al dueño y profundizar los rectores institucionales.',
  },
};

type Agenda3 = { '7_dias': string; '30_dias': string; '90_dias': string };

export const AGENDAS_PASO_0: Record<TipoPiramideCodigo, Agenda3> = {
  cerrada: {
    '7_dias': 'Identifica 1 proceso de alto valor que hoy haces solo tú y que podría ser cedido. Solo identificar, no actuar. Escribir qué hace, qué información requiere y qué decisiones implica.',
    '30_dias': 'De ese proceso identificado, descompón sus partes. Identifica al candidato del equipo que podría asumirlo. Define qué información, qué herramientas y qué capacitación necesita para hacerlo.',
    '90_dias': 'Ejecutar la cesión completa: declarar la responsabilidad, entregar herramientas, capacitar, establecer feedback. Al cierre del 90, ese proceso ya no lo haces tú.',
  },
  transicion: {
    '7_dias': 'Identifica las 2-3 áreas donde sigues siendo indispensable. Para cada una, escribe qué decisiones dependen aún de ti y cuáles podrían cederse.',
    '30_dias': 'Elige UNA de esas áreas para enfocarte en 90 días. Identifica a la persona o equipo que va a asumir esa responsabilidad. Diseña el plan de cesión.',
    '90_dias': 'Ejecutar la cesión. Al cierre, esa área debe operar sin tu intervención cotidiana. Solo escalación de excepciones.',
  },
  abierta: {
    '7_dias': 'Audita qué cesiones hechas en el pasado han regresado parcialmente al dueño. Identifica las 2 más críticas para reforzar.',
    '30_dias': 'Para cada cesión auditada, diseña instrumentos de vigilancia y feedback que permitan al equipo seguir operando con autonomía sin retornos.',
    '90_dias': 'Implementar los instrumentos. Empezar a construir los rectores faltantes — especialmente Transformación si no existe operativamente.',
  },
  invertida: {
    '7_dias': 'Audita las cesiones existentes para detectar señales de retorno hacia el dueño. Identifica si hay decisiones que han vuelto a tu escritorio.',
    '30_dias': 'Profundiza los rectores institucionales. Identifica cuáles están operativos y cuáles solo declarados.',
    '90_dias': 'Construir el rector institucional más débil. Esto consolida la pirámide invertida y la hace sostenible en el largo plazo.',
  },
};

export const AGENDA_PASO_1_TEMPLATE: Agenda3 = {
  '7_dias': "Identifica qué rasgo de los que tienes BAJOS te gustaría subir. ¿Por qué? ¿Qué te aportaría? Identifica también qué rasgo dominante estás dispuesto a dosificar para hacer espacio. Justifica ambas decisiones con argumentos estratégicos.",
  '30_dias': "Diseña UNA acción concreta de incorporación del rasgo elegido. La acción debe ser específica — no genérica. Ejemplo: 'contratar a alguien con perfil comercial fuerte para subir Comercio del 3% al 15%', no 'mejorar nuestra cultura comercial'.",
  '90_dias': 'Mide. ¿La acción del día 30 logró mover el rasgo en la operación diaria, no solo en intención? Si sí, consolida. Si no, ajusta la dosis o elige otra acción.',
};

export type RectorCodigo =
  | 'planeacion_estrategica'
  | 'auditoria'
  | 'legal_fiscal'
  | 'normatividad'
  | 'transformacion'
  | 'gobierno_institucional';

export type RectorInfo = {
  codigo: RectorCodigo;
  nombre: string;
  descripcion_corta: string;
  pregunta_evaluacion: string;
  si_no_existe: string;
};

export const RECTORES: RectorInfo[] = [
  {
    codigo: 'planeacion_estrategica',
    nombre: 'Planeación estratégica',
    descripcion_corta: 'El proceso que conecta visión de largo plazo con operación de cada día.',
    pregunta_evaluacion: '¿Tienes un plan estratégico vivo — no un documento guardado en un drive? ¿Lo consultas, lo actualizas, las decisiones cotidianas se conectan con él?',
    si_no_existe: 'Sin Planeación Estratégica viva, el Vector se rompe. La empresa opera por impulsos del corto plazo y pierde capacidad de competir a 3-5 años.',
  },
  {
    codigo: 'auditoria',
    nombre: 'Auditoría',
    descripcion_corta: 'El proceso independiente que verifica que las cosas se hacen como se dice.',
    pregunta_evaluacion: '¿Hay alguien o algún proceso que revisa de forma independiente que las cosas se están haciendo como dicen que se están haciendo? Financiero, operativo, calidad.',
    si_no_existe: 'Sin Auditoría, la empresa se autoengaña. Los reportes reflejan lo que la gente quiere mostrar, no lo que realmente pasa.',
  },
  {
    codigo: 'legal_fiscal',
    nombre: 'Legal y fiscal',
    descripcion_corta: 'El proceso que sostiene la empresa frente a la ley, los impuestos y los riesgos.',
    pregunta_evaluacion: '¿Tienes cubierto lo legal y lo fiscal con asesoría especializada — no solo el contador del mes? Contratos, obligaciones laborales, riesgos legales identificados.',
    si_no_existe: 'Sin Legal y Fiscal sólido, la empresa vive expuesta. Una contingencia puede llevarla a la quiebra o a una crisis reputacional.',
  },
  {
    codigo: 'normatividad',
    nombre: 'Normatividad',
    descripcion_corta: 'Las reglas internas escritas que rigen cómo se hace lo que se hace.',
    pregunta_evaluacion: '¿Hay reglas internas escritas que rigen cómo se hace lo que se hace? Políticas de operación, código de conducta, normas que aplican a todos por igual.',
    si_no_existe: 'Sin Normatividad, las decisiones cotidianas dependen de criterio individual. Imposible escalar más allá del círculo de confianza del dueño.',
  },
  {
    codigo: 'transformacion',
    nombre: 'Transformación',
    descripcion_corta: 'El proceso encargado de evolucionar la empresa, no mantenerla.',
    pregunta_evaluacion: '¿Existe alguien o un proceso encargado de evolucionar la empresa? No mantener — evolucionar. Identificar qué hay que cambiar, planear el cambio, ejecutarlo.',
    si_no_existe: 'Sin Transformación, la empresa se atrofia. Sigue haciendo lo mismo aunque el mercado cambie. Es la causa más común de empresas que se quedan atrás.',
  },
  {
    codigo: 'gobierno_institucional',
    nombre: 'Gobierno institucional',
    descripcion_corta: 'Las reglas de gobernanza que sostienen a la empresa más allá del dueño.',
    pregunta_evaluacion: '¿Hay estructura de gobierno definida — consejo, comités, roles de decisión clara — que opera independiente del dueño? ¿O todas las decisiones grandes siguen siendo unipersonales?',
    si_no_existe: 'Sin Gobierno Institucional, la empresa es la persona del dueño. Si él se ausenta o se va, la empresa no sobrevive como institución.',
  },
];

export const AGENDA_PASO_2_RECTOR_TEMPLATE: Agenda3 = {
  '7_dias': 'Define qué significa este rector PARA TU empresa. No el rector genérico — el tuyo. ¿Qué debe garantizar? ¿Qué problema concreto resuelve en tu operación?',
  '30_dias': 'Identifica quién va a sostener este rector. Persona, equipo, asesor externo, mix. Define el alcance y la frecuencia de operación mínima.',
  '90_dias': 'Diseñar y empezar a operar la versión mínima viable del rector. Al cierre del 90, debe estar al menos en estado DECLARADO con actividad verificable.',
};

/* ══════════════════════════════════════════════════════════════════════════
   PASO 1 — Perfil de Personalidad Empresarial (28 preguntas, 7 rasgos)
   ══════════════════════════════════════════════════════════════════════════ */

export type Rasgo = 'templo' | 'familia' | 'estudio' | 'fabrica' | 'comercio' | 'taller' | 'laboratorio';

export type PreguntaPaso1 = {
  numero: number;
  dimension: string;
  titulo: string;
  detonante: string;
  respuestas: { tipo: RespuestaTipo; descripcion: string; pesos: Partial<Record<Rasgo, number>> }[];
};

export const PREGUNTAS_PASO_1: PreguntaPaso1[] = [
  // ═══ DIMENSIÓN 1 — ORIGEN DE LA ENERGÍA (5 preguntas) ═══
  {
    numero: 1,
    dimension: 'origen_energia',
    titulo: 'El momento cero',
    detonante: 'Cuéntame cómo empezó tu empresa. No me cuentes el negocio — cuéntame el momento. ¿Qué estabas viendo, sintiendo o queriendo cuando decidiste hacerla?',
    respuestas: [
      { tipo: 'A', descripcion: 'Habla de una misión, una causa, algo que faltaba en el mundo. Lenguaje de valores, propósito, deber.', pesos: { templo: 3, estudio: 1 } },
      { tipo: 'B', descripcion: 'Habla de personas. Familia, amigos, equipo de confianza. La empresa nació por o para alguien cercano.', pesos: { familia: 3, taller: 1 } },
      { tipo: 'C', descripcion: 'Habla de oportunidad. Vio un hueco, una necesidad insatisfecha, un negocio rentable. Lenguaje de mercado.', pesos: { comercio: 3, laboratorio: 1 } },
      { tipo: 'D', descripcion: 'Habla del oficio. Era bueno haciendo algo y decidió hacerlo por su cuenta. Lenguaje de producto, hechura.', pesos: { taller: 3, estudio: 1 } },
    ],
  },
  {
    numero: 2,
    dimension: 'origen_energia',
    titulo: 'Lo que te mantiene despierto',
    detonante: '¿Qué es lo que te quita el sueño hoy? No problemas operativos — me refiero a lo que mantiene tu cabeza ocupada los domingos cuando piensas en la empresa.',
    respuestas: [
      { tipo: 'A', descripcion: 'Le da vueltas a si la empresa está cumpliendo su propósito, si está siendo coherente con sus valores.', pesos: { templo: 3, estudio: 1 } },
      { tipo: 'B', descripcion: 'Pensamientos sobre el equipo. Quién está bien, quién no, cómo cuidarlos.', pesos: { familia: 3, taller: 1 } },
      { tipo: 'C', descripcion: 'Indicadores de mercado, competencia, ventas, oportunidades. Foco en lo comercial.', pesos: { comercio: 3, fabrica: 1 } },
      { tipo: 'D', descripcion: 'La eficiencia interna, los procesos que no fluyen, lo que se podría optimizar.', pesos: { fabrica: 3, taller: 1 } },
    ],
  },
  {
    numero: 3,
    dimension: 'origen_energia',
    titulo: 'La conversación recurrente',
    detonante: 'Si grabara las conversaciones de tu equipo durante una semana entera, ¿qué tema aparecería más veces? ¿De qué habla la empresa cuando habla de sí misma?',
    respuestas: [
      { tipo: 'A', descripcion: 'Hablan de calidad, detalle, originalidad, autoría de lo que entregan.', pesos: { estudio: 3, taller: 1 } },
      { tipo: 'B', descripcion: 'Hablan del mercado, los clientes que quieren ganar, los competidores, los precios.', pesos: { comercio: 3, fabrica: 1 } },
      { tipo: 'C', descripcion: 'Hablan de causas, impacto, transformación que generan en sus públicos.', pesos: { templo: 3, laboratorio: 1 } },
      { tipo: 'D', descripcion: 'Hablan de lo que están probando, nuevas ideas, hipótesis, experimentos en marcha.', pesos: { laboratorio: 3, estudio: 1 } },
    ],
  },
  {
    numero: 4,
    dimension: 'origen_energia',
    titulo: 'El momento de orgullo',
    detonante: 'Cuéntame el último momento en que sentiste verdadero orgullo de tu empresa. No me cuentes una ganancia económica. Cuéntame el momento — qué pasó, qué viste, qué sentiste.',
    respuestas: [
      { tipo: 'A', descripcion: 'Un cliente o público transformado. Una historia humana de impacto.', pesos: { templo: 3, familia: 1 } },
      { tipo: 'B', descripcion: 'Un trabajo bien hecho. Una pieza, un producto, un servicio entregado con excelencia técnica.', pesos: { taller: 3, estudio: 1 } },
      { tipo: 'C', descripcion: 'El equipo unido logrando algo difícil juntos. La química humana funcionando.', pesos: { familia: 3, templo: 1 } },
      { tipo: 'D', descripcion: 'Un sistema operando solo. Un proceso fluyendo sin necesidad de su presencia.', pesos: { fabrica: 3, laboratorio: 1 } },
    ],
  },
  {
    numero: 5,
    dimension: 'origen_energia',
    titulo: 'Si tuvieras todo el dinero del mundo',
    detonante: 'Si mañana te dijeran que ganaste un premio gigante de dinero y ya no necesitas la empresa por finanzas, ¿qué harías con ella? ¿La vendes, la cierras, la transformas, la mantienes igual?',
    respuestas: [
      { tipo: 'A', descripcion: 'La mantendría igual o la haría crecer porque la causa sigue vigente. No es por dinero — es por lo que representa.', pesos: { templo: 3, familia: 1 } },
      { tipo: 'B', descripcion: 'La transformaría en un proyecto más experimental, más arriesgado, donde pueda probar cosas nuevas.', pesos: { laboratorio: 3, estudio: 1 } },
      { tipo: 'C', descripcion: 'La vendería o la pondría en piloto automático. El cierre es que funcione sin mí.', pesos: { fabrica: 3, comercio: 1 } },
      { tipo: 'D', descripcion: 'La conservaría porque es donde ejerzo el oficio que amo. Aunque no necesitara el dinero, seguiría haciendo lo que hago.', pesos: { taller: 3, estudio: 1 } },
    ],
  },
  // ═══ DIMENSIÓN 2 — VELOCIDAD DE DECISIÓN (4 preguntas) ═══
  {
    numero: 6,
    dimension: 'velocidad_decision',
    titulo: 'La decisión más reciente',
    detonante: 'Cuéntame de la última decisión importante que tomaste en tu empresa. ¿Qué tan rápido la tomaste, con quién la consultaste, y cómo se ejecutó?',
    respuestas: [
      { tipo: 'A', descripcion: 'Decisión meditada, consultada con varias personas, ejecutada con tiempo. Estructura clara.', pesos: { fabrica: 3, templo: 1 } },
      { tipo: 'B', descripcion: 'Decisión rápida basada en intuición y experiencia del oficio. La ejecutó él mismo.', pesos: { taller: 3, familia: 1 } },
      { tipo: 'C', descripcion: 'Decisión basada en datos de mercado, leyendo señales comerciales.', pesos: { comercio: 3, laboratorio: 1 } },
      { tipo: 'D', descripcion: 'Decisión experimental — probar y ver qué pasa. Aceptó que podía salir mal.', pesos: { laboratorio: 3, estudio: 1 } },
    ],
  },
  {
    numero: 7,
    dimension: 'velocidad_decision',
    titulo: 'El error tolerado',
    detonante: 'En tu empresa, cuando alguien comete un error razonable intentando algo nuevo, ¿qué pasa? Cuéntame la última vez que pasó.',
    respuestas: [
      { tipo: 'A', descripcion: 'Se castiga o se evita repetir. La preferencia es ir a lo seguro.', pesos: { fabrica: 3, comercio: 1 } },
      { tipo: 'B', descripcion: 'Se aprende del error, se conversa, se ajusta. La gente confía en intentar.', pesos: { laboratorio: 3, familia: 1 } },
      { tipo: 'C', descripcion: 'Depende de quién lo cometió. Hay diferencias según jerarquía o cercanía personal.', pesos: { familia: 3, templo: 1 } },
      { tipo: 'D', descripcion: 'El error se asume colectivamente. El equipo lo vive como parte del oficio.', pesos: { taller: 3, estudio: 1 } },
    ],
  },
  {
    numero: 8,
    dimension: 'velocidad_decision',
    titulo: 'Cuando dos opiniones se enfrentan',
    detonante: 'Cuando hay dos personas de tu equipo con opiniones opuestas sobre cómo hacer algo importante, ¿cómo se resuelve?',
    respuestas: [
      { tipo: 'A', descripcion: 'Termina decidiendo el dueño. La autoridad cierra.', pesos: { templo: 2, fabrica: 2 } },
      { tipo: 'B', descripcion: 'Se debate hasta llegar a acuerdo, aunque tarde. La armonía importa.', pesos: { familia: 3, templo: 1 } },
      { tipo: 'C', descripcion: 'Se prueba la idea de cada uno en paralelo y gana la que muestra resultados.', pesos: { laboratorio: 3, comercio: 1 } },
      { tipo: 'D', descripcion: 'Se acude al criterio técnico — quien tiene más oficio en ese tema decide.', pesos: { taller: 3, estudio: 1 } },
    ],
  },
  {
    numero: 9,
    dimension: 'velocidad_decision',
    titulo: 'Tiempo de la decisión cotidiana',
    detonante: 'De las decisiones operativas chicas que tu empresa toma todos los días, ¿qué porcentaje se demora más de lo que debería? ¿Por qué?',
    respuestas: [
      { tipo: 'A', descripcion: 'Pocas se demoran. Hay procesos claros, cada quien sabe qué hacer.', pesos: { fabrica: 3, taller: 1 } },
      { tipo: 'B', descripcion: 'Bastantes se demoran porque me consultan cosas que podrían decidir solos.', pesos: { templo: 2, familia: 2 } },
      { tipo: 'C', descripcion: 'Las decisiones se demoran cuando implican relaciones humanas — siempre se cuida a las personas antes que la velocidad.', pesos: { familia: 3, templo: 1 } },
      { tipo: 'D', descripcion: 'Se demoran cuando hay debate creativo sobre la mejor forma de hacer las cosas.', pesos: { estudio: 3, laboratorio: 1 } },
    ],
  },
  // ═══ DIMENSIÓN 3 — APETITO POR LA INCERTIDUMBRE (4 preguntas) ═══
  {
    numero: 10,
    dimension: 'apetito_incertidumbre',
    titulo: 'La oportunidad incierta',
    detonante: 'Te llega una oportunidad de negocio interesante pero el resultado es incierto — podría ser muy buena o salir mal. ¿Qué haces?',
    respuestas: [
      { tipo: 'A', descripcion: 'Analizo a profundidad, evalúo riesgos. Si no veo claridad, no entro.', pesos: { fabrica: 3, templo: 1 } },
      { tipo: 'B', descripcion: 'Entro porque vale la pena explorar. Confío en que aprenderé algo.', pesos: { laboratorio: 3, estudio: 1 } },
      { tipo: 'C', descripcion: 'Consulto con mi equipo y vemos si se siente bien para todos.', pesos: { familia: 3, templo: 1 } },
      { tipo: 'D', descripcion: 'Si encaja con mi capacidad técnica y me da control del resultado, entro.', pesos: { taller: 3, comercio: 1 } },
    ],
  },
  {
    numero: 11,
    dimension: 'apetito_incertidumbre',
    titulo: 'Lo nuevo en el mercado',
    detonante: '¿Qué tan seguido cambias tu producto, servicio o forma de operar? Cuéntame el último cambio importante que hiciste.',
    respuestas: [
      { tipo: 'A', descripcion: 'Casi nunca cambio lo que funciona. La consistencia es valor.', pesos: { templo: 3, taller: 1 } },
      { tipo: 'B', descripcion: 'Cambio cuando el mercado lo pide. Sigo señales comerciales.', pesos: { comercio: 3, fabrica: 1 } },
      { tipo: 'C', descripcion: 'Cambio constantemente — siempre estoy probando nuevas variantes.', pesos: { laboratorio: 3, estudio: 1 } },
      { tipo: 'D', descripcion: 'Cambio cuando descubro una forma técnicamente superior de hacerlo.', pesos: { taller: 3, estudio: 1 } },
    ],
  },
  {
    numero: 12,
    dimension: 'apetito_incertidumbre',
    titulo: 'Cuando algo se rompe',
    detonante: 'Cuéntame la última crisis seria que tuvo tu empresa. ¿Cómo la enfrentaste?',
    respuestas: [
      { tipo: 'A', descripcion: 'Volví a los principios, a la causa. Me apoyé en por qué hago esto.', pesos: { templo: 3, familia: 1 } },
      { tipo: 'B', descripcion: 'Junté al equipo y nos sostuvimos juntos. La gente fue la fuerza.', pesos: { familia: 3, templo: 1 } },
      { tipo: 'C', descripcion: 'Apreté procesos, métricas, control. Salí por eficiencia.', pesos: { fabrica: 3, comercio: 1 } },
      { tipo: 'D', descripcion: 'Inventé algo nuevo. La crisis fue oportunidad de pivotar.', pesos: { laboratorio: 3, comercio: 1 } },
    ],
  },
  {
    numero: 13,
    dimension: 'apetito_incertidumbre',
    titulo: 'Lo desconocido del futuro',
    detonante: '¿Qué tan claro tienes hacia dónde va tu industria en los próximos 3-5 años? ¿Cómo te preparas para lo que no sabes?',
    respuestas: [
      { tipo: 'A', descripcion: 'Tengo claridad y la empresa está alineada a esa visión. Hay plan.', pesos: { templo: 3, fabrica: 1 } },
      { tipo: 'B', descripcion: 'Tengo hipótesis, varias apuestas en paralelo. Veré cuál funciona.', pesos: { laboratorio: 3, comercio: 1 } },
      { tipo: 'C', descripcion: 'Lo que sé es lo que hago bien hoy. Confío en que ese oficio seguirá siendo valioso.', pesos: { taller: 3, estudio: 1 } },
      { tipo: 'D', descripcion: 'Me adapto cuando llega. No me anticipo demasiado.', pesos: { familia: 2, comercio: 2 } },
    ],
  },
  // ═══ DIMENSIÓN 4 — VÍNCULO CON LOS PÚBLICOS (5 preguntas) ═══
  {
    numero: 14,
    dimension: 'vinculo_publicos',
    titulo: 'El cliente ideal',
    detonante: 'Cuéntame cómo es tu cliente ideal. Y cuéntame por qué tu empresa es ideal para ese cliente.',
    respuestas: [
      { tipo: 'A', descripcion: 'Su cliente ideal comparte sus valores. Trabajan juntos por algo en común.', pesos: { templo: 3, familia: 1 } },
      { tipo: 'B', descripcion: 'Su cliente ideal valora la calidad y el detalle. Aprecia el oficio bien hecho.', pesos: { taller: 3, estudio: 1 } },
      { tipo: 'C', descripcion: 'Su cliente ideal paga bien, decide rápido, y entiende lo que vende.', pesos: { comercio: 3, fabrica: 1 } },
      { tipo: 'D', descripcion: 'Su cliente ideal está abierto a probar cosas nuevas con él.', pesos: { laboratorio: 3, estudio: 1 } },
    ],
  },
  {
    numero: 15,
    dimension: 'vinculo_publicos',
    titulo: 'La relación duradera',
    detonante: '¿Tienes un cliente que llevas años atendiendo? Cuéntame por qué sigue contigo.',
    respuestas: [
      { tipo: 'A', descripcion: 'Sigue porque cree en lo que hacen, en la causa. Hay conexión profunda.', pesos: { templo: 3, familia: 1 } },
      { tipo: 'B', descripcion: 'Sigue porque hay relación personal. Se conocen bien, hay confianza humana.', pesos: { familia: 3, templo: 1 } },
      { tipo: 'C', descripcion: 'Sigue porque le dan un producto/servicio que técnicamente nadie le da igual.', pesos: { taller: 3, estudio: 1 } },
      { tipo: 'D', descripcion: 'Sigue porque siguen siendo competitivos en precio y servicio.', pesos: { comercio: 3, fabrica: 1 } },
    ],
  },
  {
    numero: 16,
    dimension: 'vinculo_publicos',
    titulo: 'El cliente que perdiste',
    detonante: 'Cuéntame de un cliente importante que perdiste. ¿Qué pasó, y qué hiciste cuando te enteraste?',
    respuestas: [
      { tipo: 'A', descripcion: 'Lo vivió como traición. Le dolió personalmente.', pesos: { familia: 3, templo: 1 } },
      { tipo: 'B', descripcion: 'Analizó qué falló en el servicio, ajustó procesos, siguió.', pesos: { fabrica: 3, taller: 1 } },
      { tipo: 'C', descripcion: 'Vio qué cambió en el mercado, ajustó su propuesta.', pesos: { comercio: 3, laboratorio: 1 } },
      { tipo: 'D', descripcion: 'Le preguntó qué falló para aprender, lo conversó con apertura.', pesos: { laboratorio: 3, estudio: 1 } },
    ],
  },
  {
    numero: 17,
    dimension: 'vinculo_publicos',
    titulo: 'El proveedor',
    detonante: 'Cuéntame cómo tratas a tus proveedores. ¿Qué tipo de relación tienes con los más importantes?',
    respuestas: [
      { tipo: 'A', descripcion: 'Los trata como aliados de largo plazo. Hay lealtad mutua.', pesos: { familia: 3, templo: 1 } },
      { tipo: 'B', descripcion: 'Los presiona por precio y velocidad. Es transacción comercial.', pesos: { comercio: 3, fabrica: 1 } },
      { tipo: 'C', descripcion: 'Trabaja con los que tienen el mejor oficio en su ramo, aunque cobren más.', pesos: { taller: 3, estudio: 1 } },
      { tipo: 'D', descripcion: 'Cambia de proveedor cuando descubre mejores opciones.', pesos: { laboratorio: 2, comercio: 2 } },
    ],
  },
  {
    numero: 18,
    dimension: 'vinculo_publicos',
    titulo: 'Lo que dirían los clientes de ti',
    detonante: 'Si entrevistara a 5 de tus clientes y les preguntara qué hace especial a tu empresa, ¿qué dirían? No me digas lo que tú quieres que digan — lo que realmente dirían.',
    respuestas: [
      { tipo: 'A', descripcion: 'Que son coherentes con lo que dicen. Que se siente la causa.', pesos: { templo: 3, estudio: 1 } },
      { tipo: 'B', descripcion: 'Que los quieren, que hay calidez en cómo los tratan.', pesos: { familia: 3, templo: 1 } },
      { tipo: 'C', descripcion: 'Que son confiables — entregan a tiempo, con calidad consistente.', pesos: { fabrica: 3, taller: 1 } },
      { tipo: 'D', descripcion: 'Que son distintos. Que les dan algo que nadie más les da.', pesos: { estudio: 3, laboratorio: 1 } },
    ],
  },
  // ═══ DIMENSIÓN 5 — CONSTRUCCIÓN DEL TALENTO (5 preguntas) ═══
  {
    numero: 19,
    dimension: 'construccion_talento',
    titulo: 'Por qué llega la gente',
    detonante: 'Cuando alguien decide trabajar contigo en lugar de la competencia, ¿por qué crees que te elige?',
    respuestas: [
      { tipo: 'A', descripcion: 'Porque cree en lo que hacen. Hay misión que comparte.', pesos: { templo: 3, familia: 1 } },
      { tipo: 'B', descripcion: 'Porque va a aprender un oficio profundo. Le enseñan.', pesos: { taller: 3, estudio: 1 } },
      { tipo: 'C', descripcion: 'Por el ambiente. La gente. La calidez del lugar.', pesos: { familia: 3, templo: 1 } },
      { tipo: 'D', descripcion: 'Porque van a hacer cosas interesantes. Va a poder probar y crear.', pesos: { laboratorio: 3, estudio: 1 } },
    ],
  },
  {
    numero: 20,
    dimension: 'construccion_talento',
    titulo: 'Cómo crece la gente',
    detonante: 'Cuando alguien de tu equipo está listo para crecer profesionalmente, ¿cómo es ese proceso en tu empresa?',
    respuestas: [
      { tipo: 'A', descripcion: 'Hay plan de desarrollo claro, capacitación estructurada, evaluaciones.', pesos: { fabrica: 3, taller: 1 } },
      { tipo: 'B', descripcion: 'Crece haciendo. Más responsabilidad, aprende sobre la marcha con guía.', pesos: { taller: 3, familia: 1 } },
      { tipo: 'C', descripcion: 'Crece probando proyectos nuevos. Se le da lienzo en blanco.', pesos: { laboratorio: 3, estudio: 1 } },
      { tipo: 'D', descripcion: 'Crece porque le tienen confianza y le abren camino sin proceso formal.', pesos: { familia: 3, templo: 1 } },
    ],
  },
  {
    numero: 21,
    dimension: 'construccion_talento',
    titulo: 'El que se va',
    detonante: 'Cuéntame de alguien que se fue de tu empresa y te dolió que se fuera. ¿Por qué se fue?',
    respuestas: [
      { tipo: 'A', descripcion: 'Se fue porque ya no se sintió alineado con lo que hacen. Diferencias de fondo.', pesos: { templo: 3, familia: 1 } },
      { tipo: 'B', descripcion: 'Se fue por dinero. La competencia le ofreció más.', pesos: { comercio: 3, fabrica: 1 } },
      { tipo: 'C', descripcion: 'Se fue para crecer en un lugar más grande. Le quedaron chicos.', pesos: { familia: 2, laboratorio: 2 } },
      { tipo: 'D', descripcion: 'Se fue por oportunidad personal — familia, salud, mudanza.', pesos: { familia: 3, templo: 1 } },
    ],
  },
  {
    numero: 22,
    dimension: 'construccion_talento',
    titulo: 'La promoción',
    detonante: 'La última vez que ascendiste a alguien o le diste más responsabilidad, ¿en qué te basaste para tomar esa decisión?',
    respuestas: [
      { tipo: 'A', descripcion: 'En su compromiso y lealtad demostrados durante años.', pesos: { familia: 3, templo: 1 } },
      { tipo: 'B', descripcion: 'En su dominio técnico del oficio. Es de los mejores.', pesos: { taller: 3, estudio: 1 } },
      { tipo: 'C', descripcion: 'En métricas objetivas — resultados, productividad, indicadores.', pesos: { fabrica: 3, comercio: 1 } },
      { tipo: 'D', descripcion: 'En su capacidad de proponer cosas nuevas y atreverse.', pesos: { laboratorio: 3, estudio: 1 } },
    ],
  },
  {
    numero: 23,
    dimension: 'construccion_talento',
    titulo: 'Si tu mejor persona se fuera mañana',
    detonante: 'Si tu mejor persona se fuera mañana sin avisar, ¿qué pasa con su trabajo?',
    respuestas: [
      { tipo: 'A', descripcion: 'Se cae. Ese trabajo solo lo sabe hacer ella.', pesos: { taller: 3, estudio: 1 } },
      { tipo: 'B', descripcion: 'Otro lo cubre porque hay procesos documentados. Se siente la pérdida pero la operación sigue.', pesos: { fabrica: 3, comercio: 1 } },
      { tipo: 'C', descripcion: 'El equipo se reorganiza, se sostienen unos a otros mientras se cubre.', pesos: { familia: 3, templo: 1 } },
      { tipo: 'D', descripcion: 'Es oportunidad de reinventar cómo se hacía ese trabajo.', pesos: { laboratorio: 3, estudio: 1 } },
    ],
  },
  // ═══ TRANSVERSAL FINAL (5 preguntas extras para llegar a 28) ═══
  {
    numero: 24,
    dimension: 'transversal',
    titulo: 'La frase de identidad',
    detonante: "Si tuvieras que terminar la frase 'En mi empresa lo que importa es...', ¿cómo la terminarías? Dame la primera respuesta honesta, no la pensada.",
    respuestas: [
      { tipo: 'A', descripcion: "'...para qué estamos aquí' / 'lo que representamos'", pesos: { templo: 3, estudio: 1 } },
      { tipo: 'B', descripcion: "'...quién está con nosotros' / 'la gente'", pesos: { familia: 3, templo: 1 } },
      { tipo: 'C', descripcion: "'...la firma con la que entregamos' / 'la calidad' / 'el detalle'", pesos: { estudio: 2, taller: 2 } },
      { tipo: 'D', descripcion: "'...producir más con menos' / 'ser eficientes'", pesos: { fabrica: 3, comercio: 1 } },
    ],
  },
  {
    numero: 25,
    dimension: 'transversal',
    titulo: 'El espacio físico',
    detonante: 'Si entrara por primera vez a tus oficinas, ¿qué notaría primero? ¿Qué sentiría el espacio?',
    respuestas: [
      { tipo: 'A', descripcion: 'Algo simbólico — fotos, frases, elementos que reflejan la causa o historia.', pesos: { templo: 3, familia: 1 } },
      { tipo: 'B', descripcion: 'Calidez humana — la gente se siente cómoda, hay vida cotidiana visible.', pesos: { familia: 3, templo: 1 } },
      { tipo: 'C', descripcion: 'Diseño cuidado, estética intencional. El espacio comunica autoría.', pesos: { estudio: 3, taller: 1 } },
      { tipo: 'D', descripcion: 'Funcionalidad, orden, eficiencia. Cada cosa en su lugar.', pesos: { fabrica: 3, taller: 1 } },
    ],
  },
  {
    numero: 26,
    dimension: 'transversal',
    titulo: 'El ritmo natural',
    detonante: '¿Cómo describirías el ritmo natural de tu empresa? ¿Es rápida, pausada, intermitente, frenética?',
    respuestas: [
      { tipo: 'A', descripcion: 'Pausada y profunda. Las cosas se hacen con cuidado, no se apura lo importante.', pesos: { templo: 3, taller: 1 } },
      { tipo: 'B', descripcion: 'Intermitente. Hay temporadas calmadas y temporadas de mucha intensidad.', pesos: { familia: 2, taller: 2 } },
      { tipo: 'C', descripcion: 'Rápida y reactiva. Siempre estamos respondiendo al mercado.', pesos: { comercio: 3, fabrica: 1 } },
      { tipo: 'D', descripcion: 'Frenética e impredecible. Siempre estamos probando, cambiando, pivotando.', pesos: { laboratorio: 3, estudio: 1 } },
    ],
  },
  {
    numero: 27,
    dimension: 'transversal',
    titulo: 'Lo que NO eres',
    detonante: "Cuando ves a tu competencia o a otras empresas de tu industria, ¿qué dices 'eso no es lo nuestro, jamás'? ¿Qué rechazas explícitamente?",
    respuestas: [
      { tipo: 'A', descripcion: 'Rechaza el oportunismo, vender sin causa, traicionar valores por dinero.', pesos: { templo: 3, familia: 1 } },
      { tipo: 'B', descripcion: 'Rechaza la frialdad, el trato impersonal, la rotación alta.', pesos: { familia: 3, templo: 1 } },
      { tipo: 'C', descripcion: 'Rechaza la mediocridad, la calidad pobre, el conformismo técnico.', pesos: { taller: 3, estudio: 1 } },
      { tipo: 'D', descripcion: 'Rechaza la rigidez, la incapacidad de cambiar, el quedarse atrás.', pesos: { laboratorio: 3, comercio: 1 } },
    ],
  },
  {
    numero: 28,
    dimension: 'transversal',
    titulo: 'Tu legado',
    detonante: 'Si tu empresa siguiera operando 50 años después de que tú ya no estés, ¿qué te gustaría que la gente dijera de ella?',
    respuestas: [
      { tipo: 'A', descripcion: 'Que cambió algo en el mundo. Que dejó huella en lo que representó.', pesos: { templo: 3, estudio: 1 } },
      { tipo: 'B', descripcion: 'Que fue un buen lugar para trabajar. Que cuidó a su gente.', pesos: { familia: 3, templo: 1 } },
      { tipo: 'C', descripcion: 'Que hizo cosas excepcionales. Que su trabajo era reconocible y único.', pesos: { estudio: 2, taller: 2 } },
      { tipo: 'D', descripcion: 'Que fue duradera, sólida, próspera. Que supo escalar y mantenerse.', pesos: { fabrica: 3, comercio: 1 } },
    ],
  },
];

export const RASGOS: Rasgo[] = ['templo', 'familia', 'estudio', 'fabrica', 'comercio', 'taller', 'laboratorio'];

export const DIMENSIONES: Record<string, string> = {
  origen_energia: 'Origen de la energía',
  velocidad_decision: 'Velocidad de decisión',
  apetito_incertidumbre: 'Apetito por la incertidumbre',
  vinculo_publicos: 'Vínculo con los públicos',
  construccion_talento: 'Construcción del talento',
  transversal: 'Transversal',
};

export const RASGO_COLORES: Record<Rasgo, string> = {
  templo: '#a855f7',
  familia: '#ec4899',
  estudio: '#3533cd',
  fabrica: '#1aab99',
  comercio: '#ff9500',
  taller: '#d4a256',
  laboratorio: '#00c853',
};

export const NOMBRES_RASGO: Record<Rasgo, string> = {
  templo: 'El Templo',
  familia: 'La Familia',
  estudio: 'El Estudio',
  fabrica: 'La Fábrica',
  comercio: 'El Comercio',
  taller: 'El Taller',
  laboratorio: 'El Laboratorio',
};

/* ══════════════════════════════════════════════════════════════════════════
   HÍBRIDOS — 21 combinaciones de 2 rasgos dominantes
   ══════════════════════════════════════════════════════════════════════════ */

export type HibridoInfo = {
  nombre: string;
  esencia: string;
  fortaleza: string;
  debilidad: string;
  rasgos_a_explorar: string[];
};

export const HIBRIDOS: Record<string, HibridoInfo> = {
  'familia+templo': {
    nombre: 'La Tribu con Causa',
    esencia: 'Empresa donde la causa une a la tribu. La misión es lo que mantiene unida a la gente y la gente es quien sostiene la misión.',
    fortaleza: 'Lealtad inquebrantable. Cero rotación. Los empleados y clientes se vuelven evangelistas naturales.',
    debilidad: 'Se vuelve endogámica. Difícil incorporar a alguien externo aunque sea bueno. La crítica honesta se siente como traición a la causa.',
    rasgos_a_explorar: [
      'Subir Laboratorio modesto para abrir a perspectivas externas sin sacrificar cohesión.',
      'Subir Fábrica para profesionalizar procesos clave sin desmembrar el vínculo.',
      'No bajar mucho Familia o Templo — son los que sostienen la identidad.',
    ],
  },
  'estudio+templo': {
    nombre: 'El Propósito con Firma',
    esencia: 'Empresa con causa profunda que se expresa con autoría reconocible. Cada cosa que entrega lleva el sello de su misión y de su sensibilidad estética.',
    fortaleza: 'Identidad de marca poderosa. Los clientes la siguen por lo que representa y por cómo lo entrega.',
    debilidad: "Rigidez creativa. 'Así somos' se vuelve excusa para no evolucionar. Costos altos que el mercado no siempre absorbe.",
    rasgos_a_explorar: [
      'Subir Comercio para aterrizar la firma en operación rentable sin diluirla.',
      'Subir Laboratorio para permitir evolución sin perder coherencia.',
      'Dosificar Templo si la causa está bloqueando decisiones comerciales.',
    ],
  },
  'fabrica+templo': {
    nombre: 'La Misión Organizada',
    esencia: 'Empresa con causa profunda traducida en sistema operativo eficiente. La misión se ejecuta a escala porque hay procesos detrás.',
    fortaleza: 'Impacto medible. La causa no se queda en discurso — se vuelve operación que sostiene resultados.',
    debilidad: 'La causa puede congelarse en proceso. Los rituales reemplazan al sentido. La gente puede sentirse parte de una maquinaria de propósito.',
    rasgos_a_explorar: [
      'Subir Familia para re-humanizar el sistema sin perder eficiencia.',
      'Subir Laboratorio modesto para evitar que los procesos se anquilosen.',
      'Auditar qué procesos sirven a la causa y cuáles solo se mantienen por inercia.',
    ],
  },
  'comercio+templo': {
    nombre: 'La Causa Sostenible',
    esencia: 'Empresa con propósito claro que aprende a venderlo bien. No vende a pesar de su causa — vende gracias a su causa.',
    fortaleza: 'Narrativa comercial auténtica. Los clientes pagan premium porque sienten que compran significado, no producto.',
    debilidad: "Tensión interna constante entre 'vendemos esto' y 'esto es lo que defendemos'. Si la balanza se va al comercio, pierde alma.",
    rasgos_a_explorar: [
      'Subir Fábrica para sistematizar cuándo el negocio se subordina a la causa.',
      'Subir Estudio para diferenciar más la propuesta y evitar la commoditización.',
      'Mantener Templo intacto — es lo que sostiene el premium pricing.',
    ],
  },
  'laboratorio+templo': {
    nombre: 'El Propósito en Movimiento',
    esencia: 'Empresa con causa firme que se permite reinventarse para servirla mejor. La misión es fija, los métodos son flexibles.',
    fortaleza: 'Relevancia constante. La causa siempre encuentra nueva forma de llegar a sus públicos.',
    debilidad: 'Confusión interna. Si la gente no distingue qué es esencia y qué es experimento, se desorienta.',
    rasgos_a_explorar: [
      'Subir Fábrica para declarar explícitamente qué es inamovible (la causa) y qué se experimenta.',
      'Subir Taller para consolidar oficio sobre los experimentos que sí funcionaron.',
      'Subir Familia para sostener emocionalmente al equipo frente al cambio constante.',
    ],
  },
  'taller+templo': {
    nombre: 'El Oficio con Propósito',
    esencia: 'Empresa donde el saber hacer profundo está al servicio de un propósito mayor. La hechura impecable no es un fin — es el medio de honrar la misión.',
    fortaleza: 'Combinación rara de calidad técnica y sentido. Genera lealtad de clientes que valoran ambas cosas — los mejores clientes del mundo.',
    debilidad: "Difícil de escalar y difícil de comercializar. Hay resistencia interna a 'vender' porque se siente que devalúa la causa.",
    rasgos_a_explorar: [
      'Subir Comercio para profesionalizar la dimensión comercial sin traicionar el oficio.',
      'Subir Fábrica para sistematizar la transmisión del oficio a nuevas generaciones.',
      'No bajar Templo ni Taller — son la combinación distintiva.',
    ],
  },
  'estudio+familia': {
    nombre: 'La Casa Creativa',
    esencia: 'Empresa donde el vínculo entre las personas alimenta la creatividad. Se crea bien porque hay confianza humana de fondo.',
    fortaleza: 'Trabajo creativo de alta calidad sostenido por equipos estables. La cultura emocional protege la chispa creativa.',
    debilidad: 'Los favoritismos sabotean el mérito creativo. La crítica honesta se evita por miedo a herir relaciones. Talento nuevo le cuesta entrar.',
    rasgos_a_explorar: [
      'Subir Fábrica para abrir canales formales de crítica creativa.',
      'Subir Laboratorio para empujar al equipo a probar más allá de la zona de confort.',
      'Subir Comercio para que la creatividad encuentre mercado más amplio.',
    ],
  },
  'fabrica+familia': {
    nombre: 'El Sistema Cercano',
    esencia: 'Empresa con procesos sólidos sostenidos por vínculos humanos auténticos. La eficiencia no anula la calidez.',
    fortaleza: 'Retención brutal. La gente da más de lo esperado. Sistemas robustos con baja rotación.',
    debilidad: 'Dificultad para promover por mérito puro. Los procesos se relajan por excepciones personales. Crece el riesgo de mediocridad cómoda.',
    rasgos_a_explorar: [
      'Subir Comercio para introducir criterios objetivos de desempeño.',
      'Subir Estudio para elevar el estándar creativo sin enfriar la cultura.',
      'Mantener Familia — es lo que sostiene la retención.',
    ],
  },
  'comercio+familia': {
    nombre: 'El Negocio de Confianza',
    esencia: 'Empresa comercial donde la relación humana es el activo principal. Los clientes son personas, no transacciones.',
    fortaleza: 'Cartera de clientes leales construida en años. Recompra natural. Recomendaciones constantes.',
    debilidad: 'Dependencia extrema de pocas relaciones. Si se va el vendedor estrella, se va el cliente. Difícil escalar.',
    rasgos_a_explorar: [
      'Subir Fábrica para convertir relaciones individuales en activos de la empresa.',
      'Subir Estudio para construir propuesta de valor que vaya más allá del vínculo personal.',
      'Subir Laboratorio para explorar canales nuevos de cliente.',
    ],
  },
  'familia+taller': {
    nombre: 'La Casa-Oficio',
    esencia: 'Empresa donde la tribu se forjó alrededor de un saber hacer profundo. El oficio se enseña en familia, se aprende en años.',
    fortaleza: 'Maestría técnica preservada generacionalmente. Conocimiento profundo que la competencia no puede replicar.',
    debilidad: 'Todo el conocimiento vive en pocas cabezas vinculadas por vínculo personal. Si esos vínculos se rompen, se rompe el oficio.',
    rasgos_a_explorar: [
      'Subir Fábrica para documentar el oficio sin matarlo.',
      'Subir Comercio para que el oficio encuentre mercado más amplio.',
      'Subir Estudio para refinar la firma del oficio.',
    ],
  },
  'familia+laboratorio': {
    nombre: 'El Equipo Inquieto',
    esencia: 'Empresa donde la gente unida prueba cosas juntas. La confianza humana hace posible el riesgo creativo colectivo.',
    fortaleza: 'Capacidad de pivotar sin fracturas internas. Cuando una idea falla, el equipo no se desmorona — sigue.',
    debilidad: 'La cohesión se confunde con consenso. Las apuestas se toman para que todos estén cómodos, no para ganar.',
    rasgos_a_explorar: [
      'Subir Comercio para introducir criterios objetivos de qué se mantiene y qué se mata.',
      'Subir Fábrica para disciplinar las apuestas con datos.',
      'Subir Estudio para que las apuestas tengan firma reconocible.',
    ],
  },
  'estudio+fabrica': {
    nombre: 'La Producción con Firma',
    esencia: 'Empresa que produce a escala sin perder identidad de autor. Cada unidad lleva el sello creativo, aunque se fabriquen miles.',
    fortaleza: 'Marca con personalidad reconocible que llega a muchos. Diferenciación sostenida en volumen.',
    debilidad: 'Tensión constante entre el creador y el sistema. Si gana el sistema, se pierde la firma.',
    rasgos_a_explorar: [
      'Subir Templo para proteger la firma del sistema con un norte claro.',
      'Subir Familia para humanizar la maquinaria.',
      'Subir Laboratorio modesto para evitar que la firma se estanque.',
    ],
  },
  'comercio+estudio': {
    nombre: 'El Autor Comercial',
    esencia: 'Empresa con sensibilidad creativa que sabe leer el mercado. Crea con firma pero también vende bien.',
    fortaleza: 'Producto distinto que además se mueve. No es arte que nadie compra ni commodity sin alma.',
    debilidad: 'El mercado puede empujar a diluir la firma. Si se cede demasiado al cliente, se pierde la autoría.',
    rasgos_a_explorar: [
      'Subir Templo para anclar la firma a una causa que el mercado no pueda diluir.',
      'Subir Taller para profundizar la maestría técnica que sostiene la firma.',
      'Subir Laboratorio para innovar antes que la firma se vuelva fórmula.',
    ],
  },
  'estudio+taller': {
    nombre: 'El Estudio de Oficio',
    esencia: 'Empresa donde el oficio profundo se hace con firma reconocible. Cada pieza es técnica y artística a la vez.',
    fortaleza: 'Trabajo inigualable en calidad y diferenciación. Los clientes pagan premium y vuelven por la firma.',
    debilidad: 'Brutalmente difícil de escalar. Todo depende de pocas personas insustituibles. Los egos artísticos chocan.',
    rasgos_a_explorar: [
      'Subir Familia para sostener egos con vínculo humano.',
      'Subir Fábrica para sistematizar lo replicable del oficio.',
      'Subir Comercio para que el oficio encuentre el mercado correcto a su altura.',
    ],
  },
  'estudio+laboratorio': {
    nombre: 'El Estudio Inquieto',
    esencia: 'Empresa creativa que nunca deja de experimentar. La firma evoluciona porque se atreve a cambiarla cada cierto tiempo.',
    fortaleza: 'Capacidad de mantenerse fresca por años. Mientras otros se vuelven anticuados, esta empresa se reinventa con coherencia.',
    debilidad: 'Los clientes pueden perder la referencia. Crisis de identidad recurrente.',
    rasgos_a_explorar: [
      'Subir Templo para anclar lo que NO cambia, aunque todo lo demás evolucione.',
      'Subir Comercio para validar las evoluciones con el mercado antes que con el ego.',
      'Subir Familia para sostener al equipo en los pivotes.',
    ],
  },
  'comercio+fabrica': {
    nombre: 'El Sistema Productivo',
    esencia: 'Empresa optimizada para producir y vender. Los procesos son tan eficientes como las señales de mercado son leídas.',
    fortaleza: 'Crecimiento sólido y predecible. Ningún competidor le gana en costo-velocidad.',
    debilidad: 'Pierde alma en el camino. La gente se vuelve recurso. La cultura se enfría. Difícil retener talento de oficio profundo o creativo.',
    rasgos_a_explorar: [
      'Subir Familia para re-introducir capas humanas al sistema.',
      'Subir Templo para conectar la maquinaria con un propósito que la gente sienta.',
      'Subir Estudio para diferenciar la producción de la commoditización.',
    ],
  },
  'fabrica+taller': {
    nombre: 'El Oficio Escalado',
    esencia: 'Empresa que escaló un saber hacer profundo sin perderlo del todo. Hay sistema, pero también queda hechura.',
    fortaleza: 'Ofrece calidad técnica a volúmenes que el taller puro no puede. Transición entre artesano y manufactura inteligente.',
    debilidad: 'La calidad se diluye gradualmente. Los maestros viejos se quejan. Los procesos ganan pero el oficio sufre.',
    rasgos_a_explorar: [
      'Subir Estudio para refinar lo que la escala diluye.',
      'Subir Templo para proteger el estándar del oficio como causa.',
      'Subir Familia para sostener a los maestros y a los nuevos.',
    ],
  },
  'fabrica+laboratorio': {
    nombre: 'El Sistema en Iteración',
    esencia: 'Empresa con procesos sólidos que se atreven a mejorarse a sí mismos. Eficiencia presente y eficiencia futura conviven.',
    fortaleza: 'Capacidad de mejora continua estructurada. No se queda obsoleta porque el sistema mismo se actualiza.',
    debilidad: 'Cambiar lo que funciona puede dañar lo que funciona. Si se experimenta demasiado, se pierde la confiabilidad.',
    rasgos_a_explorar: [
      'Subir Templo para definir qué procesos son sagrados y cuáles se tocan.',
      'Subir Familia para sostener al equipo entre cambios.',
      'Subir Estudio para que las iteraciones tengan firma, no solo eficiencia.',
    ],
  },
  'comercio+taller': {
    nombre: 'El Oficio en el Mercado',
    esencia: 'Empresa con dominio técnico profundo que sabe venderlo. La calidad existe, y el mercado se entera.',
    fortaleza: 'Premium pricing sostenido. Los clientes reconocen el oficio y pagan por él porque la empresa sabe articularlo.',
    debilidad: 'El comercial empuja a hacer más de lo que el taller puede sostener con calidad. Cuello de botella en producción.',
    rasgos_a_explorar: [
      'Subir Fábrica para alinear capacidad comercial con capacidad técnica.',
      'Subir Templo para anclar el oficio a una causa que evite la sobreventa.',
      'Subir Familia para sostener a los maestros que sostienen el oficio.',
    ],
  },
  'comercio+laboratorio': {
    nombre: 'El Explorador Comercial',
    esencia: 'Empresa que experimenta con disciplina comercial. Prueba rápido, mide rápido, mata rápido lo que no funciona.',
    fortaleza: 'Velocidad de innovación que la competencia no puede igualar. Encuentra océanos azules antes que nadie.',
    debilidad: 'Dispersión crónica. Demasiadas apuestas abiertas. Difícil construir identidad estable.',
    rasgos_a_explorar: [
      'Subir Templo para construir identidad estable bajo la experimentación.',
      'Subir Estudio para que las apuestas tengan firma reconocible.',
      'Subir Familia para sostener al equipo en el cambio constante.',
    ],
  },
  'laboratorio+taller': {
    nombre: 'El Taller Experimental',
    esencia: 'Empresa de oficio profundo que se atreve a empujar los límites técnicos. Maestría con espíritu de descubrimiento.',
    fortaleza: 'Innovación técnica genuina. La empresa avanza el estado del arte de su industria.',
    debilidad: "Riesgo de perder el oficio establecido por perseguir el nuevo. Tensión entre 'lo que dominamos' y 'lo que estamos probando'.",
    rasgos_a_explorar: [
      'Subir Templo para definir qué del oficio es no-negociable.',
      'Subir Comercio para que la innovación encuentre mercado.',
      'Subir Familia para sostener a los maestros que cambian de método.',
    ],
  },
};

/**
 * Dado el mix porcentual de rasgos, devuelve los 2 rasgos dominantes y el
 * híbrido correspondiente (clave = 2 rasgos ordenados alfabéticamente).
 */
export function obtenerHibrido(mix: Record<string, number>): {
  rasgos_dominantes: string[];
  clave: string;
  hibrido: HibridoInfo | null;
} {
  const ordenados = Object.entries(mix)
    .sort((a, b) => b[1] - a[1])
    .map(([rasgo]) => rasgo);

  const top2 = ordenados.slice(0, 2);
  const clave = top2.slice().sort().join('+');

  return {
    rasgos_dominantes: top2,
    clave,
    hibrido: HIBRIDOS[clave] || null,
  };
}
