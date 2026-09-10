import type { Pregunta } from '@/types/scanx';

/**
 * Banco de escenarios · SCANx Nivel 1 (Radiografía rápida) — BORRADOR v1.
 * Formato psicométrico: cada opción reparte pesos ocultos a varias dimensiones.
 * Escala: E=4 (evidente) · D=2.67 (en desarrollo) · P=1.33 (por desarrollar) · Z=0 (sin evidencia).
 * Las dimensiones que una opción NO toca simplemente se omiten (cuentan como null, no cero).
 */
export const BANCO_VERSION = 'n1-v1';

const E = 4.0;
const D = 2.67;
const P = 1.33;
const Z = 0.0;

export const BANCO_N1: Pregunta[] = [
  {
    id: 'q1',
    escenario: 'Cuando hay que tomar una decisión importante sobre un nuevo producto, servicio o inversión, lo más común es que…',
    opciones: [
      { id: 'q1a', texto: 'Yo (el dueño) decido solo, basado en mi experiencia e instinto.', pesos: { liderazgo: P, estrategia: Z, innovacion: P } },
      { id: 'q1b', texto: 'Lo platico informalmente con mi equipo cercano y luego decido.', pesos: { liderazgo: D, estrategia: P, innovacion: D } },
      { id: 'q1c', texto: 'Tenemos un comité o proceso definido para evaluar nuevas iniciativas.', pesos: { liderazgo: E, estrategia: D, innovacion: D } },
      { id: 'q1d', texto: 'Hacemos investigación y un caso de negocio con datos antes de decidir.', pesos: { liderazgo: E, estrategia: E, innovacion: E } },
    ],
  },
  {
    id: 'q2',
    escenario: 'Un cliente importante se queja por un retraso en la entrega. Lo más probable en tu empresa es que…',
    opciones: [
      { id: 'q2a', texto: 'El dueño se entera por el cliente y lo resuelve personalmente.', pesos: { liderazgo: P, operacion: Z, cliente: P, escalabilidad: Z } },
      { id: 'q2b', texto: 'Depende de quién reciba la queja y cómo ande ese día.', pesos: { operacion: Z, cliente: Z, talento: P } },
      { id: 'q2c', texto: 'Hay un responsable que lo atiende, aunque sin un protocolo claro.', pesos: { operacion: D, cliente: D, escalabilidad: P } },
      { id: 'q2d', texto: 'Existe un protocolo de escalamiento con tiempos, y luego se analiza para que no se repita.', pesos: { operacion: E, cliente: E, escalabilidad: D, innovacion: D } },
    ],
  },
  {
    id: 'q3',
    escenario: 'Si te pregunto por la utilidad real del mes pasado y el margen por producto o servicio…',
    opciones: [
      { id: 'q3a', texto: 'No lo sé con precisión; me guío por lo que hay en el banco.', pesos: { finanzas: Z, liderazgo: P } },
      { id: 'q3b', texto: 'Tengo una idea aproximada pero no números exactos.', pesos: { finanzas: P } },
      { id: 'q3c', texto: 'Reviso reportes mensuales de ingresos y gastos.', pesos: { finanzas: D, liderazgo: D } },
      { id: 'q3d', texto: 'Tengo estados financieros y márgenes por línea, actualizados.', pesos: { finanzas: E, liderazgo: E } },
    ],
  },
  {
    id: 'q4',
    escenario: 'Sobre cómo se venden tus productos o servicios hoy…',
    opciones: [
      { id: 'q4a', texto: 'Las ventas llegan por recomendación o suerte; no hay proceso.', pesos: { comercial: Z, estrategia: P } },
      { id: 'q4b', texto: 'Cada vendedor lo hace a su manera.', pesos: { comercial: P, tecnologia: P } },
      { id: 'q4c', texto: 'Hay un proceso de venta definido que la mayoría sigue.', pesos: { comercial: D, tecnologia: D } },
      { id: 'q4d', texto: 'Tenemos pipeline en un sistema, con etapas, metas y seguimiento.', pesos: { comercial: E, tecnologia: E, escalabilidad: D } },
    ],
  },
  {
    id: 'q5',
    escenario: 'Cuando entra alguien nuevo al equipo…',
    opciones: [
      { id: 'q5a', texto: 'Aprende sobre la marcha, viendo a los demás.', pesos: { talento: Z, operacion: P } },
      { id: 'q5b', texto: 'Alguien le explica lo básico los primeros días.', pesos: { talento: P, operacion: P } },
      { id: 'q5c', texto: 'Hay una inducción y materiales para su puesto.', pesos: { talento: D, operacion: D } },
      { id: 'q5d', texto: 'Existe onboarding estructurado con objetivos y seguimiento.', pesos: { talento: E, operacion: D, escalabilidad: D } },
    ],
  },
  {
    id: 'q6',
    escenario: 'Tus procesos clave (cómo se hacen las cosas) están…',
    opciones: [
      { id: 'q6a', texto: 'En la cabeza de las personas; nada escrito.', pesos: { operacion: Z, escalabilidad: Z, tecnologia: P } },
      { id: 'q6b', texto: 'Algunos anotados, la mayoría por costumbre.', pesos: { operacion: P, escalabilidad: P } },
      { id: 'q6c', texto: 'Documentados los principales y se usan como referencia.', pesos: { operacion: D, escalabilidad: D, tecnologia: D } },
      { id: 'q6d', texto: 'Documentados, con responsables y puntos de control/auditoría.', pesos: { operacion: E, escalabilidad: E, tecnologia: D } },
    ],
  },
  {
    id: 'q7',
    escenario: 'Si te pido el plan de la empresa para los próximos 2-3 años…',
    opciones: [
      { id: 'q7a', texto: 'Está en mi cabeza; no lo he puesto por escrito.', pesos: { estrategia: P, liderazgo: P } },
      { id: 'q7b', texto: 'Tengo metas generales pero sin un plan formal.', pesos: { estrategia: D, liderazgo: P } },
      { id: 'q7c', texto: 'Hay un plan escrito que reviso de vez en cuando.', pesos: { estrategia: D, liderazgo: D } },
      { id: 'q7d', texto: 'Hay plan documentado, con objetivos medibles y revisión periódica.', pesos: { estrategia: E, liderazgo: E, escalabilidad: D } },
    ],
  },
  {
    id: 'q8',
    escenario: 'Cuando un cliente elige tu empresa en vez de la competencia, es principalmente porque…',
    opciones: [
      { id: 'q8a', texto: 'La verdad no lo tengo claro; supongo que precio.', pesos: { innovacion: Z, comercial: P, cliente: P } },
      { id: 'q8b', texto: 'Por confianza o relación personal.', pesos: { innovacion: P, cliente: D, comercial: P } },
      { id: 'q8c', texto: 'Tenemos algo que nos distingue y lo sabemos comunicar.', pesos: { innovacion: D, comercial: D, cliente: D } },
      { id: 'q8d', texto: 'Tenemos una propuesta de valor clara y diferenciada, difícil de copiar.', pesos: { innovacion: E, comercial: E, cliente: E, estrategia: D } },
    ],
  },
  {
    id: 'q9',
    escenario: 'Para el trabajo del día a día, tu empresa se apoya en…',
    opciones: [
      { id: 'q9a', texto: 'WhatsApp, papel y hojas sueltas, sobre todo.', pesos: { tecnologia: Z, operacion: P } },
      { id: 'q9b', texto: 'Excel y algunas apps sueltas sin conectar.', pesos: { tecnologia: P, operacion: P } },
      { id: 'q9c', texto: 'Algunos sistemas para áreas clave (ventas, contabilidad).', pesos: { tecnologia: D, operacion: D } },
      { id: 'q9d', texto: 'Sistemas integrados con datos conectados y algo de automatización.', pesos: { tecnologia: E, operacion: D, escalabilidad: D } },
    ],
  },
  {
    id: 'q10',
    escenario: 'Si el dueño o líder principal se ausentara un mes completo, la empresa…',
    opciones: [
      { id: 'q10a', texto: 'Se paralizaría; casi todo pasa por él/ella.', pesos: { liderazgo: Z, escalabilidad: Z, operacion: P } },
      { id: 'q10b', texto: 'Funcionaría a medias, con muchas dudas.', pesos: { liderazgo: P, escalabilidad: P, operacion: P } },
      { id: 'q10c', texto: 'Seguiría operando, aunque las decisiones grandes esperarían.', pesos: { liderazgo: D, escalabilidad: D } },
      { id: 'q10d', texto: 'Operaría con normalidad; hay roles y autonomía para decidir.', pesos: { liderazgo: E, escalabilidad: E, talento: D } },
    ],
  },
  {
    id: 'q11',
    escenario: 'Sobre saber si tus clientes quedaron satisfechos…',
    opciones: [
      { id: 'q11a', texto: 'Me entero solo cuando alguien se queja.', pesos: { cliente: Z, operacion: P } },
      { id: 'q11b', texto: 'Pregunto informalmente de vez en cuando.', pesos: { cliente: P } },
      { id: 'q11c', texto: 'Damos seguimiento posventa a la mayoría.', pesos: { cliente: D, comercial: D } },
      { id: 'q11d', texto: 'Medimos satisfacción (encuestas/NPS) y actuamos sobre eso.', pesos: { cliente: E, comercial: D, innovacion: D } },
    ],
  },
  {
    id: 'q12',
    escenario: 'Cuando alguien del equipo renuncia, normalmente es porque…',
    opciones: [
      { id: 'q12a', texto: 'No sé bien por qué; pasa seguido.', pesos: { talento: Z, liderazgo: P } },
      { id: 'q12b', texto: 'Por sueldo o una mejor oferta.', pesos: { talento: P } },
      { id: 'q12c', texto: 'A veces por crecimiento; retenemos a los clave.', pesos: { talento: D, liderazgo: D } },
      { id: 'q12d', texto: 'Es raro; tenemos buen clima, desarrollo y planes de carrera.', pesos: { talento: E, liderazgo: D, escalabilidad: D } },
    ],
  },
  {
    id: 'q13',
    escenario: 'Los precios de tus productos o servicios se definen…',
    opciones: [
      { id: 'q13a', texto: 'Más o menos, comparando con lo que cobra otro.', pesos: { finanzas: Z, comercial: P } },
      { id: 'q13b', texto: 'Sumando costos y un margen "al tanteo".', pesos: { finanzas: P, comercial: P } },
      { id: 'q13c', texto: 'Con costos reales y un margen objetivo definido.', pesos: { finanzas: D, comercial: D, estrategia: D } },
      { id: 'q13d', texto: 'Con estrategia de precios por valor, revisada periódicamente.', pesos: { finanzas: E, comercial: E, estrategia: E } },
    ],
  },
  {
    id: 'q14',
    escenario: 'Sobre las metas del negocio y su seguimiento…',
    opciones: [
      { id: 'q14a', texto: 'No tenemos metas claras y medibles.', pesos: { estrategia: Z, liderazgo: P, operacion: P } },
      { id: 'q14b', texto: 'Hay metas pero casi no les damos seguimiento.', pesos: { estrategia: P, liderazgo: P } },
      { id: 'q14c', texto: 'Revisamos avances en juntas periódicas.', pesos: { estrategia: D, liderazgo: D, operacion: D } },
      { id: 'q14d', texto: 'Metas con indicadores y ritmo de seguimiento constante.', pesos: { estrategia: E, liderazgo: E, operacion: D } },
    ],
  },
  {
    id: 'q15',
    escenario: 'Cuando algo sale mal (un error, un problema recurrente)…',
    opciones: [
      { id: 'q15a', texto: 'Se apaga el fuego y seguimos; suele repetirse.', pesos: { operacion: Z, innovacion: Z } },
      { id: 'q15b', texto: 'Lo resolvemos y a veces comentamos qué pasó.', pesos: { operacion: P, innovacion: P } },
      { id: 'q15c', texto: 'Lo analizamos para entender la causa.', pesos: { operacion: D, innovacion: D, liderazgo: D } },
      { id: 'q15d', texto: 'Hay mejora continua: se documenta la causa y se ajusta el proceso.', pesos: { operacion: E, innovacion: E, liderazgo: D } },
    ],
  },
  {
    id: 'q16',
    escenario: 'Para conseguir nuevos clientes, tu empresa…',
    opciones: [
      { id: 'q16a', texto: 'Espera a que lleguen por recomendación.', pesos: { comercial: Z, estrategia: P, innovacion: P } },
      { id: 'q16b', texto: 'Hace esfuerzos esporádicos cuando bajan las ventas.', pesos: { comercial: P, estrategia: P } },
      { id: 'q16c', texto: 'Tiene acciones de marketing/ventas más o menos constantes.', pesos: { comercial: D, estrategia: D, innovacion: D } },
      { id: 'q16d', texto: 'Tiene un motor de captación con canales y metas definidas.', pesos: { comercial: E, estrategia: D, innovacion: D } },
    ],
  },
  {
    id: 'q17',
    escenario: 'Sobre el flujo de caja (el dinero que entra y sale)…',
    opciones: [
      { id: 'q17a', texto: 'Vivo al día; a veces no alcanza y no sé bien por qué.', pesos: { finanzas: Z } },
      { id: 'q17b', texto: 'Lo llevo de memoria o en una libreta.', pesos: { finanzas: P } },
      { id: 'q17c', texto: 'Tengo control de cuentas por cobrar y pagar.', pesos: { finanzas: D } },
      { id: 'q17d', texto: 'Proyecto el flujo a semanas/meses y decido con base en eso.', pesos: { finanzas: E, estrategia: D } },
    ],
  },
  {
    id: 'q18',
    escenario: 'La capacitación y el desarrollo de tu equipo…',
    opciones: [
      { id: 'q18a', texto: 'No hay; cada quien se las arregla.', pesos: { talento: Z, escalabilidad: P } },
      { id: 'q18b', texto: 'Algo informal cuando surge la necesidad.', pesos: { talento: P } },
      { id: 'q18c', texto: 'Hay capacitaciones ocasionales planeadas.', pesos: { talento: D, escalabilidad: D } },
      { id: 'q18d', texto: 'Plan de desarrollo por rol, con seguimiento.', pesos: { talento: E, escalabilidad: D } },
    ],
  },
  {
    id: 'q19',
    escenario: 'Para tomar decisiones importantes, te apoyas en…',
    opciones: [
      { id: 'q19a', texto: 'Sobre todo intuición; no tengo datos a la mano.', pesos: { tecnologia: Z, finanzas: P, liderazgo: P } },
      { id: 'q19b', texto: 'Algunos números que junto cuando los necesito.', pesos: { tecnologia: P, finanzas: P } },
      { id: 'q19c', texto: 'Reportes de las áreas principales.', pesos: { tecnologia: D, finanzas: D, liderazgo: D } },
      { id: 'q19d', texto: 'Indicadores/tableros actualizados que reviso seguido.', pesos: { tecnologia: E, finanzas: D, liderazgo: E } },
    ],
  },
  {
    id: 'q20',
    escenario: 'Si quisieras crecer fuerte (más volumen, otra sucursal o línea) en los próximos meses…',
    opciones: [
      { id: 'q20a', texto: 'Sería muy difícil; apenas con lo actual vamos justos.', pesos: { escalabilidad: Z, operacion: P, finanzas: P } },
      { id: 'q20b', texto: 'Podríamos, pero improvisando mucho.', pesos: { escalabilidad: P, operacion: P } },
      { id: 'q20c', texto: 'Tenemos parte de lo necesario para soportarlo.', pesos: { escalabilidad: D, operacion: D, finanzas: D } },
      { id: 'q20d', texto: 'Tenemos procesos y recursos replicables para escalar.', pesos: { escalabilidad: E, operacion: E, finanzas: D } },
    ],
  },
  {
    id: 'q21',
    escenario: 'Sobre los roles y responsabilidades en tu empresa…',
    opciones: [
      { id: 'q21a', texto: 'No están claros; todos hacen de todo.', pesos: { liderazgo: Z, talento: P, operacion: P } },
      { id: 'q21b', texto: 'Se entienden más o menos, pero sin definirlos formalmente.', pesos: { liderazgo: P, talento: P } },
      { id: 'q21c', texto: 'Cada quien sabe de qué es responsable.', pesos: { liderazgo: D, talento: D, operacion: D } },
      { id: 'q21d', texto: 'Roles definidos, con expectativas y rendición de cuentas.', pesos: { liderazgo: E, talento: D, operacion: D } },
    ],
  },
  {
    id: 'q22',
    escenario: 'Después de vender/entregar, con tus clientes normalmente…',
    opciones: [
      { id: 'q22a', texto: 'No hay seguimiento; ahí termina la relación.', pesos: { cliente: Z, comercial: P } },
      { id: 'q22b', texto: 'Los contactamos si necesitan algo más.', pesos: { cliente: P, comercial: P } },
      { id: 'q22c', texto: 'Hacemos seguimiento posventa a la mayoría.', pesos: { cliente: D, comercial: D } },
      { id: 'q22d', texto: 'Cultivamos la relación para recompra y referidos, de forma sistemática.', pesos: { cliente: E, comercial: E, escalabilidad: D } },
    ],
  },
  {
    id: 'q23',
    escenario: 'Sobre mejorar o renovar tu oferta (productos/servicios)…',
    opciones: [
      { id: 'q23a', texto: 'Seguimos igual desde hace años; funciona.', pesos: { innovacion: Z, estrategia: P } },
      { id: 'q23b', texto: 'Cambiamos algo cuando el cliente lo pide.', pesos: { innovacion: P, cliente: P } },
      { id: 'q23c', texto: 'Buscamos mejoras de forma ocasional.', pesos: { innovacion: D, estrategia: D } },
      { id: 'q23d', texto: 'Innovamos de forma continua atentos al mercado.', pesos: { innovacion: E, estrategia: D, cliente: D } },
    ],
  },
  {
    id: 'q24',
    escenario: '¿Qué tanto depende la operación de una o dos personas irremplazables?',
    opciones: [
      { id: 'q24a', texto: 'Totalmente; si faltan, se detiene todo.', pesos: { escalabilidad: Z, talento: Z, operacion: P } },
      { id: 'q24b', texto: 'Bastante; ciertas cosas solo ellos las saben hacer.', pesos: { escalabilidad: P, talento: P, operacion: P } },
      { id: 'q24c', texto: 'Algo, pero hay quien puede cubrir.', pesos: { escalabilidad: D, talento: D, operacion: D } },
      { id: 'q24d', texto: 'Poco; el conocimiento está documentado y compartido.', pesos: { escalabilidad: E, talento: E, operacion: D } },
    ],
  },
  {
    id: 'q25',
    escenario: 'Sobre tu mercado y competencia…',
    opciones: [
      { id: 'q25a', texto: 'No los sigo de cerca; me concentro en operar.', pesos: { estrategia: Z, innovacion: P } },
      { id: 'q25b', texto: 'Sé lo básico de mis competidores directos.', pesos: { estrategia: P, comercial: P } },
      { id: 'q25c', texto: 'Conozco bien mi mercado y sus tendencias.', pesos: { estrategia: D, innovacion: D, comercial: D } },
      { id: 'q25d', texto: 'Analizo mercado y competencia para decidir estrategia.', pesos: { estrategia: E, innovacion: D, comercial: D } },
    ],
  },
  {
    id: 'q26',
    escenario: 'Cuando defines un objetivo o cambio importante, el equipo…',
    opciones: [
      { id: 'q26a', texto: 'Se entera poco a poco o cuando ya está pasando.', pesos: { estrategia: Z, liderazgo: P, talento: P } },
      { id: 'q26b', texto: 'Lo sabe, pero no siempre entiende el porqué.', pesos: { estrategia: P, liderazgo: P, talento: P } },
      { id: 'q26c', texto: 'Lo comunicamos y explicamos en general.', pesos: { estrategia: D, liderazgo: D, talento: D } },
      { id: 'q26d', texto: 'Lo comunicamos con claridad y todos saben su parte.', pesos: { estrategia: E, liderazgo: E, talento: E } },
    ],
  },
];
