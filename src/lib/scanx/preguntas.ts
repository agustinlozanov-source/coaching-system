import type { Pregunta } from '@/types/scanx';

/**
 * Banco de escenarios · SCANx — TRONCO COMÚN (26 escenarios psicométricos).
 * Cada opción reparte pesos ocultos a varias dimensiones (matriz del banco maestro).
 * Escala: E=4 (evidente) · D=2.67 (en desarrollo) · P=1.33 (por desarrollar) · Z=0 (sin evidencia).
 * Las dimensiones que una opción NO toca se omiten (cuentan como null, no cero).
 */
export const BANCO_VERSION = 'tc-v2';

const E = 4.0;
const D = 2.67;
const P = 1.33;
const Z = 0.0;

export const BANCO_TC: Pregunta[] = [
  { id: 'tc01', escenario: 'Cuando hay que tomar una decisión importante sobre un nuevo producto, servicio o inversión, lo más común en tu empresa es que…', opciones: [
    { id: 'tc01a', texto: 'Yo (el dueño) decido solo, basado en mi experiencia e instinto.', pesos: { liderazgo: Z, estrategia: Z, escalabilidad: Z } },
    { id: 'tc01b', texto: 'Lo platico informalmente con mi equipo cercano y luego decido yo.', pesos: { liderazgo: P, estrategia: P, escalabilidad: P } },
    { id: 'tc01c', texto: 'Tenemos un comité o proceso formal donde se evalúan opciones antes de decidir.', pesos: { liderazgo: D, estrategia: D, operacion: D, escalabilidad: D } },
    { id: 'tc01d', texto: 'Hacemos análisis con datos, consultamos al equipo relevante, y la decisión se documenta.', pesos: { liderazgo: E, estrategia: E, operacion: E, escalabilidad: E } },
  ] },
  { id: 'tc02', escenario: 'Si en este momento necesitaras saber exactamente cuánto ganó o perdió tu empresa el mes pasado, lo más probable es que…', opciones: [
    { id: 'tc02a', texto: 'Tendría que buscar entre recibos, facturas y cuentas bancarias para armarlo.', pesos: { finanzas: Z, tecnologia: Z, operacion: Z } },
    { id: 'tc02b', texto: 'Mi contador lo tiene, pero me toma unos días pedirlo y recibirlo.', pesos: { finanzas: P, tecnologia: Z, operacion: P } },
    { id: 'tc02c', texto: 'Tengo acceso a un reporte, aunque a veces no está actualizado al día.', pesos: { finanzas: D, tecnologia: D, operacion: D } },
    { id: 'tc02d', texto: 'Lo puedo ver en mi sistema en menos de 5 minutos, actualizado.', pesos: { finanzas: E, tecnologia: E, operacion: E, escalabilidad: E } },
  ] },
  { id: 'tc03', escenario: 'Cuando un cliente importante se queja de un retraso o error en la entrega, lo más probable en tu empresa es que…', opciones: [
    { id: 'tc03a', texto: 'El dueño se entera directamente por el cliente y resuelve personalmente.', pesos: { liderazgo: Z, operacion: Z, cliente: P, escalabilidad: Z } },
    { id: 'tc03b', texto: 'Alguien del equipo lo atiende, pero no hay proceso definido — depende de quién lo reciba.', pesos: { operacion: Z, cliente: Z, escalabilidad: Z } },
    { id: 'tc03c', texto: 'Existe un protocolo de atención y el área responsable lo gestiona con tiempos definidos.', pesos: { liderazgo: D, operacion: D, cliente: D, escalabilidad: D } },
    { id: 'tc03d', texto: 'El equipo lo resuelve con protocolo, se registra el incidente, y después se analiza para que no se repita.', pesos: { liderazgo: E, operacion: E, cliente: E, escalabilidad: E } },
  ] },
  { id: 'tc04', escenario: 'Si mañana renunciara la persona más importante de tu operación (no el dueño), lo más probable es que…', opciones: [
    { id: 'tc04a', texto: 'Sería un caos — esa persona es la única que sabe cómo funcionan muchas cosas.', pesos: { talento: Z, operacion: Z, escalabilidad: Z, liderazgo: Z } },
    { id: 'tc04b', texto: 'Nos costaría mucho, pero eventualmente alguien más lo cubriría aprendiendo sobre la marcha.', pesos: { talento: P, operacion: P, escalabilidad: Z } },
    { id: 'tc04c', texto: 'Hay alguien que podría cubrir lo básico, aunque con una curva de aprendizaje importante.', pesos: { talento: D, operacion: P, escalabilidad: P } },
    { id: 'tc04d', texto: 'Los procesos están documentados y hay al menos una persona capacitada para asumir sus funciones.', pesos: { talento: E, operacion: E, escalabilidad: E, liderazgo: D } },
  ] },
  { id: 'tc05', escenario: "Si le preguntaras a cualquier empleado '¿hacia dónde va la empresa en los próximos 3 años?', lo más probable es que…", opciones: [
    { id: 'tc05a', texto: 'No sabría responder — ni yo tengo eso claro todavía.', pesos: { estrategia: Z, liderazgo: Z, escalabilidad: Z } },
    { id: 'tc05b', texto: "Diría algo vago como 'crecer' o 'vender más', pero sin detalles concretos.", pesos: { estrategia: P, liderazgo: P, talento: Z } },
    { id: 'tc05c', texto: 'Los líderes de área lo saben, pero el resto del equipo probablemente no.', pesos: { estrategia: D, liderazgo: D, talento: P, escalabilidad: P } },
    { id: 'tc05d', texto: 'Cualquiera podría explicar la dirección general porque se comunica regularmente.', pesos: { estrategia: E, liderazgo: E, talento: E, escalabilidad: E } },
  ] },
  { id: 'tc06', escenario: 'Cuando un prospecto muestra interés en tu producto o servicio, lo que sigue normalmente es…', opciones: [
    { id: 'tc06a', texto: 'Depende — a veces lo atiendo yo, a veces alguien del equipo, no hay proceso fijo.', pesos: { comercial: Z, operacion: Z, escalabilidad: Z } },
    { id: 'tc06b', texto: 'Yo o un vendedor lo contactamos, pero cada quien lo hace a su manera.', pesos: { comercial: P, operacion: Z, escalabilidad: Z } },
    { id: 'tc06c', texto: 'Hay un proceso de seguimiento definido, aunque no siempre se cumple al pie de la letra.', pesos: { comercial: D, operacion: D, escalabilidad: P, cliente: P } },
    { id: 'tc06d', texto: 'El prospecto entra a un pipeline con etapas claras, seguimiento sistemático y métricas de conversión.', pesos: { comercial: E, operacion: E, escalabilidad: E, cliente: D } },
  ] },
  { id: 'tc07', escenario: 'Las herramientas tecnológicas que tu equipo usa todos los días para trabajar son…', opciones: [
    { id: 'tc07a', texto: 'Básicamente WhatsApp, Excel y quizá algún correo — lo esencial.', pesos: { tecnologia: Z, operacion: Z, escalabilidad: Z } },
    { id: 'tc07b', texto: 'Tenemos algunas herramientas, pero cada quien usa lo que le funciona, sin estandarizar.', pesos: { tecnologia: P, operacion: Z, escalabilidad: Z } },
    { id: 'tc07c', texto: 'Tenemos herramientas definidas por área (CRM, ERP, proyectos), aunque no todos las dominan.', pesos: { tecnologia: D, operacion: D, escalabilidad: P, innovacion: P } },
    { id: 'tc07d', texto: 'Usamos un ecosistema integrado de herramientas que se comunican entre sí y todo el equipo está capacitado.', pesos: { tecnologia: E, operacion: E, escalabilidad: E, innovacion: D } },
  ] },
  { id: 'tc08', escenario: 'Las reuniones de trabajo en tu empresa suelen ser…', opciones: [
    { id: 'tc08a', texto: 'No tenemos reuniones regulares — nos comunicamos cuando surge algo.', pesos: { liderazgo: Z, operacion: Z, estrategia: Z } },
    { id: 'tc08b', texto: 'Nos juntamos cuando hay un problema o cuando yo convoco, sin agenda fija.', pesos: { liderazgo: P, operacion: Z, estrategia: P } },
    { id: 'tc08c', texto: 'Hay reuniones periódicas con agenda, aunque no siempre se da seguimiento a los acuerdos.', pesos: { liderazgo: D, operacion: D, estrategia: D, talento: P } },
    { id: 'tc08d', texto: 'Reuniones estructuradas con agenda, minutas, responsables y seguimiento de compromisos.', pesos: { liderazgo: E, operacion: E, estrategia: E, talento: D } },
  ] },
  { id: 'tc09', escenario: 'Si te preguntara qué tan satisfechos están tus clientes y por qué, tú dirías…', opciones: [
    { id: 'tc09a', texto: 'Creo que están contentos porque no se quejan mucho, pero realmente no lo mido.', pesos: { cliente: Z, comercial: Z } },
    { id: 'tc09b', texto: 'Recibo comentarios informales de algunos clientes, pero no tengo un sistema para medirlo.', pesos: { cliente: P, comercial: P, innovacion: Z } },
    { id: 'tc09c', texto: 'Hago encuestas o pido retroalimentación de vez en cuando, aunque no de forma sistemática.', pesos: { cliente: D, comercial: D, estrategia: P, innovacion: P } },
    { id: 'tc09d', texto: 'Mido satisfacción regularmente con indicadores claros (NPS, encuestas, retención) y actúo sobre los resultados.', pesos: { cliente: E, comercial: E, estrategia: D, innovacion: D } },
  ] },
  { id: 'tc10', escenario: 'Cuando se trata de saber exactamente cuánto te cuesta producir o entregar lo que vendes, la realidad es que…', opciones: [
    { id: 'tc10a', texto: 'Tengo una idea general, pero nunca he hecho un cálculo detallado.', pesos: { finanzas: Z, operacion: Z, estrategia: Z } },
    { id: 'tc10b', texto: 'Sé mis costos principales, pero hay gastos ocultos que no tengo bien identificados.', pesos: { finanzas: P, operacion: P, comercial: P } },
    { id: 'tc10c', texto: 'Tengo un costeo bastante preciso, aunque no siempre lo actualizo cuando cambian los precios.', pesos: { finanzas: D, operacion: D, estrategia: D, comercial: D } },
    { id: 'tc10d', texto: 'Conozco mi estructura de costos al detalle, la actualizo y tomo decisiones de precio basado en eso.', pesos: { finanzas: E, operacion: E, estrategia: E, comercial: E } },
  ] },
  { id: 'tc11', escenario: 'Cuando necesitas contratar a alguien nuevo para tu equipo, lo más común es que…', opciones: [
    { id: 'tc11a', texto: 'Pregunto a conocidos, recibo recomendaciones y contrato rápido al que me parece bien.', pesos: { talento: Z, liderazgo: Z, escalabilidad: Z } },
    { id: 'tc11b', texto: 'Publico la vacante, entrevisto a algunos candidatos y elijo al que mejor me cae.', pesos: { talento: P, liderazgo: P, escalabilidad: Z } },
    { id: 'tc11c', texto: 'Tengo un perfil de puesto definido, hago entrevistas estructuradas y evalúo competencias.', pesos: { talento: D, liderazgo: D, operacion: D, escalabilidad: D } },
    { id: 'tc11d', texto: 'Proceso formal con perfil, publicación, filtros, entrevistas por competencias, referencias y prueba con evaluación.', pesos: { talento: E, liderazgo: E, operacion: E, escalabilidad: E } },
  ] },
  { id: 'tc12', escenario: 'La última vez que tu empresa hizo algo realmente nuevo o diferente (un producto, proceso, forma de vender), fue…', opciones: [
    { id: 'tc12a', texto: 'No recuerdo — llevamos tiempo haciendo lo mismo.', pesos: { innovacion: Z, estrategia: Z, escalabilidad: Z } },
    { id: 'tc12b', texto: 'Hace más de un año, y surgió por necesidad, no por planeación.', pesos: { innovacion: P, estrategia: P, escalabilidad: P } },
    { id: 'tc12c', texto: 'Lo hacemos de vez en cuando, cuando detectamos una oportunidad o un competidor nos presiona.', pesos: { innovacion: D, estrategia: D, comercial: P, escalabilidad: D } },
    { id: 'tc12d', texto: 'Tenemos un proceso continuo de innovación: proponemos, evaluamos, probamos y lanzamos regularmente.', pesos: { innovacion: E, estrategia: E, comercial: D, escalabilidad: E } },
  ] },
  { id: 'tc13', escenario: 'Si tuvieras que irte de vacaciones 3 semanas sin teléfono ni internet, al regresar lo más probable es que…', opciones: [
    { id: 'tc13a', texto: 'Encontraría un desastre — sin mí nada funciona bien.', pesos: { liderazgo: Z, escalabilidad: Z, operacion: Z, talento: Z } },
    { id: 'tc13b', texto: 'Las cosas básicas seguirían, pero habría muchos problemas acumulados esperándome.', pesos: { liderazgo: P, escalabilidad: Z, operacion: P, talento: P } },
    { id: 'tc13c', texto: 'La mayoría de la operación seguiría, aunque las decisiones importantes se habrían pausado.', pesos: { liderazgo: D, escalabilidad: D, operacion: D, talento: D } },
    { id: 'tc13d', texto: 'Todo funcionaría normal — hay personas y procesos para manejar cualquier situación.', pesos: { liderazgo: E, escalabilidad: E, operacion: E, talento: E } },
  ] },
  { id: 'tc14', escenario: 'En cuanto a la capacitación y desarrollo de tu equipo, la situación es…', opciones: [
    { id: 'tc14a', texto: 'Cada quien aprende sobre la marcha — no hay presupuesto ni tiempo para capacitación formal.', pesos: { talento: Z, liderazgo: Z, innovacion: Z } },
    { id: 'tc14b', texto: 'De vez en cuando mandamos a alguien a un curso o taller, pero no es sistemático.', pesos: { talento: P, innovacion: P } },
    { id: 'tc14c', texto: 'Tenemos un plan de capacitación por área, aunque no siempre se cumple por completo.', pesos: { talento: D, liderazgo: D, innovacion: D, escalabilidad: D } },
    { id: 'tc14d', texto: 'Programa continuo de desarrollo con objetivos, presupuesto asignado y medición de impacto.', pesos: { talento: E, liderazgo: E, innovacion: E, escalabilidad: E } },
  ] },
  { id: 'tc15', escenario: 'Si hoy recibieras un pedido grande inesperado (el doble de lo normal), tu capacidad de financiarlo sería…', opciones: [
    { id: 'tc15a', texto: 'No podría — no tengo liquidez ni acceso a financiamiento rápido.', pesos: { finanzas: Z, escalabilidad: Z } },
    { id: 'tc15b', texto: 'Difícil — tendría que pedir pago por adelantado o un préstamo de emergencia.', pesos: { finanzas: P, escalabilidad: Z, operacion: P } },
    { id: 'tc15c', texto: 'Podría manejarlo con algo de esfuerzo — tengo líneas de crédito o reservas moderadas.', pesos: { finanzas: D, escalabilidad: D, operacion: D } },
    { id: 'tc15d', texto: 'Sin problema — tengo capital de trabajo, líneas de crédito establecidas y flujo predecible.', pesos: { finanzas: E, comercial: D, escalabilidad: E, operacion: E } },
  ] },
  { id: 'tc16', escenario: "Si un cliente te preguntara '¿por qué comprar contigo y no con la competencia?', tu respuesta sería…", opciones: [
    { id: 'tc16a', texto: 'Honestamente no sé bien en qué somos diferentes — competimos por precio o relación personal.', pesos: { innovacion: Z, comercial: Z, estrategia: Z } },
    { id: 'tc16b', texto: 'Tengo una idea de qué nos hace diferentes, pero no está articulada ni la comunico consistentemente.', pesos: { innovacion: P, comercial: P, estrategia: P } },
    { id: 'tc16c', texto: 'Sé en qué somos diferentes y mis vendedores lo comunican, aunque no todos igual.', pesos: { innovacion: D, comercial: D, estrategia: D, cliente: P } },
    { id: 'tc16d', texto: 'Propuesta de valor clara, documentada, que todo el equipo comunica y que los clientes reconocen.', pesos: { innovacion: E, comercial: E, estrategia: E, cliente: D } },
  ] },
  { id: 'tc17', escenario: 'Si alguien nuevo quisiera entender cómo funciona un proceso clave (atender un pedido, facturar, cobrar), encontraría…', opciones: [
    { id: 'tc17a', texto: 'Nada escrito — tendría que preguntarle a alguien con tiempo y aprender viéndolo.', pesos: { operacion: Z, escalabilidad: Z, talento: Z } },
    { id: 'tc17b', texto: 'Algunas instrucciones básicas o notas sueltas, pero no un manual completo.', pesos: { operacion: P, escalabilidad: Z, talento: P } },
    { id: 'tc17c', texto: 'Documentación parcial de los procesos principales, aunque no siempre actualizada.', pesos: { operacion: D, escalabilidad: D, talento: D } },
    { id: 'tc17d', texto: 'Manuales o guías documentadas de los procesos clave, actualizados y accesibles para todos.', pesos: { operacion: E, escalabilidad: E, talento: E, tecnologia: D } },
  ] },
  { id: 'tc18', escenario: 'Después de que un cliente te compra, lo que pasa normalmente es…', opciones: [
    { id: 'tc18a', texto: 'No pasa nada — esperamos a que vuelva a necesitar algo.', pesos: { cliente: Z, comercial: Z } },
    { id: 'tc18b', texto: 'A veces le damos seguimiento informalmente, pero no hay un proceso establecido.', pesos: { cliente: P, comercial: P } },
    { id: 'tc18c', texto: 'Tenemos acciones de seguimiento (una llamada, un email), aunque no consistentes con todos.', pesos: { cliente: D, comercial: D, operacion: P } },
    { id: 'tc18d', texto: 'Programa de postventa con seguimiento sistemático, medición de satisfacción y acciones de retención.', pesos: { cliente: E, comercial: E, operacion: E, innovacion: D } },
  ] },
  { id: 'tc19', escenario: 'En tu empresa, la planeación financiera del año (presupuesto, metas, proyección de gastos) funciona así…', opciones: [
    { id: 'tc19a', texto: 'No hacemos presupuesto — vamos viendo mes a mes cómo va.', pesos: { finanzas: Z, estrategia: Z, liderazgo: Z } },
    { id: 'tc19b', texto: 'Tengo metas generales en la cabeza, pero no están escritas ni detalladas.', pesos: { finanzas: P, estrategia: P, liderazgo: P } },
    { id: 'tc19c', texto: 'Hacemos un presupuesto anual, aunque a veces no lo revisamos o no lo cumplimos.', pesos: { finanzas: D, estrategia: D, liderazgo: D } },
    { id: 'tc19d', texto: 'Presupuesto detallado por área, lo revisamos mensualmente y ajustamos con resultados reales.', pesos: { finanzas: E, estrategia: E, liderazgo: E, operacion: D } },
  ] },
  { id: 'tc20', escenario: 'Si le preguntaras a tu equipo (en confianza) cómo se sienten trabajando en la empresa, lo más probable es que dirían…', opciones: [
    { id: 'tc20a', texto: 'No estoy seguro — nunca les he preguntado directamente ni de forma anónima.', pesos: { talento: Z, liderazgo: Z } },
    { id: 'tc20b', texto: 'Algunos están contentos, otros no tanto, pero no sé exactamente quién ni por qué.', pesos: { talento: P, liderazgo: P } },
    { id: 'tc20c', texto: 'Hemos hecho alguna encuesta o conversaciones, y tengo una idea general del clima.', pesos: { talento: D, liderazgo: D, innovacion: P } },
    { id: 'tc20d', texto: 'Medimos clima regularmente, conozco los indicadores de satisfacción y actuamos sobre los resultados.', pesos: { talento: E, liderazgo: E, cliente: D, innovacion: D } },
  ] },
  { id: 'tc21', escenario: 'En cuanto a la seguridad de tu información (datos de clientes, contraseñas, respaldos, archivos), la situación es…', opciones: [
    { id: 'tc21a', texto: 'Todo está en la computadora de alguien o en un disco duro — si se pierde, se perdió.', pesos: { tecnologia: Z, operacion: Z, escalabilidad: Z } },
    { id: 'tc21b', texto: 'Tenemos algunos respaldos, pero no automáticos ni frecuentes, y las contraseñas se comparten informalmente.', pesos: { tecnologia: P, operacion: P, escalabilidad: Z } },
    { id: 'tc21c', texto: 'Hacemos respaldos periódicos y tenemos políticas básicas de contraseñas, aunque no siempre se cumplen.', pesos: { tecnologia: D, operacion: D, escalabilidad: P } },
    { id: 'tc21d', texto: 'Respaldos automáticos, políticas de seguridad implementadas, control de accesos y plan de recuperación.', pesos: { tecnologia: E, operacion: E, escalabilidad: E, finanzas: D } },
  ] },
  { id: 'tc22', escenario: 'La forma en que tu empresa consigue clientes nuevos es…', opciones: [
    { id: 'tc22a', texto: 'Boca a boca y recomendaciones — no invertimos en marketing como tal.', pesos: { comercial: Z, estrategia: Z, escalabilidad: Z } },
    { id: 'tc22b', texto: 'Algunas acciones (redes, publicidad ocasional) pero sin plan ni medición.', pesos: { comercial: P, estrategia: P, tecnologia: P, escalabilidad: Z } },
    { id: 'tc22c', texto: 'Presencia activa en varios canales con algo de estrategia, aunque sin métricas de retorno.', pesos: { comercial: D, estrategia: D, tecnologia: D, escalabilidad: P } },
    { id: 'tc22d', texto: 'Estrategia de marketing con canales definidos, presupuesto, generación de leads y costo de adquisición.', pesos: { comercial: E, estrategia: E, tecnologia: E, escalabilidad: E } },
  ] },
  { id: 'tc23', escenario: 'Tu relación con tus proveedores clave se puede describir como…', opciones: [
    { id: 'tc23a', texto: 'Compro al que me da mejor precio o al que tengo a la mano — no hay relación formal.', pesos: { operacion: Z, finanzas: Z } },
    { id: 'tc23b', texto: 'Tengo proveedores frecuentes, pero dependo mucho de uno o dos y si fallan me afecta fuerte.', pesos: { operacion: P, finanzas: P, escalabilidad: Z } },
    { id: 'tc23c', texto: 'Tengo proveedores establecidos con acuerdos claros, aunque sin alternativas formalizadas.', pesos: { operacion: D, finanzas: D, escalabilidad: D } },
    { id: 'tc23d', texto: 'Proveedores evaluados, contratos, alternativas identificadas y un proceso de compras estructurado.', pesos: { operacion: E, finanzas: E, escalabilidad: E, comercial: D } },
  ] },
  { id: 'tc24', escenario: 'En cuanto a indicadores de desempeño (KPIs) para saber cómo va cada área de tu empresa…', opciones: [
    { id: 'tc24a', texto: 'No manejamos indicadores — sabemos cómo va por lo que sentimos y por las ventas.', pesos: { estrategia: Z, liderazgo: Z, operacion: Z } },
    { id: 'tc24b', texto: 'Veo las ventas y quizá la utilidad, pero no tengo indicadores por área ni por proceso.', pesos: { estrategia: P, liderazgo: P, operacion: Z } },
    { id: 'tc24c', texto: 'Tenemos algunos indicadores definidos, aunque no los revisamos consistentemente ni automatizados.', pesos: { estrategia: D, liderazgo: D, operacion: D, tecnologia: P } },
    { id: 'tc24d', texto: 'Cada área tiene sus KPIs, los revisamos en juntas periódicas y decidimos con base en ellos.', pesos: { estrategia: E, liderazgo: E, operacion: E, tecnologia: E } },
  ] },
  { id: 'tc25', escenario: 'Si quisieras abrir una segunda ubicación o duplicar tu operación actual, lo más probable es que…', opciones: [
    { id: 'tc25a', texto: 'Sería imposible ahora — todo depende de mí y de unas pocas personas clave.', pesos: { escalabilidad: Z, operacion: Z, liderazgo: Z, talento: Z } },
    { id: 'tc25b', texto: 'Podría intentarlo, pero tendría que estar yo presente en ambos lados y sería un caos.', pesos: { escalabilidad: P, operacion: P, liderazgo: P, talento: P } },
    { id: 'tc25c', texto: 'Difícil pero posible — algunos procesos son replicables, otros habría que reinventarlos.', pesos: { escalabilidad: D, operacion: D, liderazgo: D, talento: D } },
    { id: 'tc25d', texto: 'Viable — los procesos están documentados, el modelo es replicable y tengo equipo capaz de operarlo.', pesos: { escalabilidad: E, operacion: E, liderazgo: E, talento: E } },
  ] },
  { id: 'tc26', escenario: 'Cuando surge un conflicto entre dos personas o áreas de tu empresa, lo más común es que…', opciones: [
    { id: 'tc26a', texto: 'Yo intervengo directamente porque si no, nadie lo resuelve.', pesos: { liderazgo: Z, talento: Z, escalabilidad: Z } },
    { id: 'tc26b', texto: 'Se resuelve solo… o no se resuelve y la tensión queda ahí.', pesos: { liderazgo: Z, talento: Z, escalabilidad: Z } },
    { id: 'tc26c', texto: 'Los líderes de área lo manejan, aunque a veces necesitan que yo medie.', pesos: { liderazgo: D, talento: D, escalabilidad: D } },
    { id: 'tc26d', texto: 'Hay canales y procesos para resolver conflictos; los líderes están capacitados para manejarlos.', pesos: { liderazgo: E, talento: E, operacion: D, escalabilidad: E } },
  ] },
];

/** Alias: el runner y el motor de cálculo usan BANCO_N1 = tronco común. */
export const BANCO_N1 = BANCO_TC;
