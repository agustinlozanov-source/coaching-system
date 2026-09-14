// DX21 — Marco diagnóstico propietario de SCANx. Fuente única de verdad de la
// taxonomía: 7 Pilares × dimensiones × sub-dimensiones. Cada sub-dimensión se
// evalúa por 3 lentes (Diseño/Despliegue/Desempeño) en escala 0-4.
// Ref: MD "DX21 — Marco Diagnóstico + Especificación de Interfaz", v2.0.

export type SubDimension = { id: string; n: string; e: string };            // n=nombre, e=qué evalúa
export type Dimension = { id: string; n: string; subs: SubDimension[] };
export type Pilar = {
  code: string;      // P1..P7
  n: string;         // nombre
  pregunta: string;  // pregunta fundamental
  evalua: string;    // qué evalúa
  dimensiones: Dimension[];
};

export const PILARES: Pilar[] = [
  {
    code: 'P1', n: 'Liderazgo y Gobernanza', pregunta: '¿Quién dirige y cómo?',
    evalua: 'La capacidad de dirección, gobierno y toma de decisiones.',
    dimensiones: [
      { id: '1.1', n: 'Perfil y estilo de liderazgo', subs: [
        { id: '1.1.1', n: 'Formación y experiencia del CEO/fundador', e: 'Capacitación formal e informal, años de experiencia en el sector, trayectoria.' },
        { id: '1.1.2', n: 'Estilo de liderazgo predominante', e: 'Autocrático, participativo, delegativo, situacional — y si es consciente de su estilo.' },
        { id: '1.1.3', n: 'Dedicación al negocio', e: 'Tiempo completo vs parcial, operativo vs estratégico, distribución del tiempo.' },
        { id: '1.1.4', n: 'Desarrollo personal continuo', e: 'Invierte en su propia capacitación, mentoría, redes profesionales, lectura.' },
      ]},
      { id: '1.2', n: 'Estructura de gobierno', subs: [
        { id: '1.2.1', n: 'Tipo societario y formalidad legal', e: 'Persona física, SA, S de RL, SAPI — nivel de institucionalización.' },
        { id: '1.2.2', n: 'Consejo de administración', e: 'Existe, frecuencia de reunión, composición, actas.' },
        { id: '1.2.3', n: 'Consejo técnico/consultivo', e: 'Existe, multidisciplinario, frecuencia, calidad de aportes.' },
        { id: '1.2.4', n: 'Asambleas y rendición de cuentas', e: 'Se realizan, frecuencia, documentación, cumplimiento de acuerdos.' },
      ]},
      { id: '1.3', n: 'Visión, propósito y valores', subs: [
        { id: '1.3.1', n: 'Declaración de visión y misión', e: 'Existe, actualizada, comunicada, comprendida por el equipo.' },
        { id: '1.3.2', n: 'Propósito organizacional', e: 'Claro, compartido, inspirador — más allá de ganar dinero.' },
        { id: '1.3.3', n: 'Valores definidos vs vividos', e: 'Brecha entre lo declarado y lo practicado día a día.' },
        { id: '1.3.4', n: 'Identidad organizacional', e: 'La organización tiene una personalidad reconocible interna y externamente.' },
      ]},
      { id: '1.4', n: 'Toma de decisiones', subs: [
        { id: '1.4.1', n: 'Centralización vs distribución', e: '¿Todo pasa por una persona o hay autonomía por niveles?' },
        { id: '1.4.2', n: 'Velocidad de decisión', e: '¿Las decisiones se toman en tiempo razonable o se estancan?' },
        { id: '1.4.3', n: 'Base informacional', e: '¿Se decide con datos, con intuición, con consenso, o con la opinión del que grita más?' },
        { id: '1.4.4', n: 'Documentación de decisiones', e: '¿Quedan registradas las decisiones estratégicas y su razonamiento?' },
      ]},
      { id: '1.5', n: 'Comunicación del liderazgo', subs: [
        { id: '1.5.1', n: 'Frecuencia y canales', e: '¿El líder se comunica regularmente con todo el equipo? ¿Por qué medios?' },
        { id: '1.5.2', n: 'Transparencia', e: '¿Qué se comparte y qué no? ¿El equipo entiende el porqué de las decisiones?' },
        { id: '1.5.3', n: 'Cascadeo de información', e: '¿La información llega a todos los niveles o se pierde en el camino?' },
        { id: '1.5.4', n: 'Escucha ascendente', e: '¿Existen mecanismos para que la información suba? ¿Se actúa sobre ella?' },
      ]},
      { id: '1.6', n: 'Desarrollo de líderes y sucesión', subs: [
        { id: '1.6.1', n: 'Segundo nivel de liderazgo', e: '¿Existe? ¿Está preparado? ¿Tiene autonomía real?' },
        { id: '1.6.2', n: 'Plan de sucesión', e: '¿Existe un plan de qué pasa si el líder no está?' },
        { id: '1.6.3', n: 'Delegación efectiva', e: '¿El líder delega con confianza o todo requiere su aprobación?' },
        { id: '1.6.4', n: 'Riesgo persona clave', e: '¿Qué tan dependiente es la organización de una sola persona?' },
      ]},
    ],
  },
  {
    code: 'P2', n: 'Estrategia y Dirección', pregunta: '¿Hacia dónde va?',
    evalua: 'La claridad, viabilidad y ejecución del rumbo.',
    dimensiones: [
      { id: '2.1', n: 'Formulación estratégica', subs: [
        { id: '2.1.1', n: 'Existencia y formalización', e: '¿Hay plan estratégico? ¿Documentado? ¿Con horizonte temporal definido?' },
        { id: '2.1.2', n: 'Proceso de formulación', e: '¿Quién participa? ¿Con qué diagnóstico previo? ¿Con qué información?' },
        { id: '2.1.3', n: 'Frecuencia de revisión', e: '¿Se revisa periódicamente o se hizo una vez y se archivó?' },
        { id: '2.1.4', n: 'Análisis del entorno', e: '¿Se realizó diagnóstico externo (PESTEL, Porter, FODA) como base?' },
      ]},
      { id: '2.2', n: 'Propuesta de valor y diferenciación', subs: [
        { id: '2.2.1', n: 'Claridad de la propuesta', e: '¿Puede articularse en una frase? ¿Todo el equipo la conoce?' },
        { id: '2.2.2', n: 'Diferenciación real vs percibida', e: '¿El cliente percibe la diferencia? ¿O solo la ve la empresa?' },
        { id: '2.2.3', n: 'Consistencia en puntos de contacto', e: '¿La propuesta se refleja en web, ventas, servicio, producto?' },
        { id: '2.2.4', n: 'Validación con el mercado', e: '¿Se ha validado con clientes reales que la propuesta es relevante?' },
      ]},
      { id: '2.3', n: 'Modelo de negocio', subs: [
        { id: '2.3.1', n: 'Fuentes de ingreso', e: 'Diversificación, recurrencia, concentración de clientes.' },
        { id: '2.3.2', n: 'Estructura de costos', e: 'Proporción fijos vs variables, escalabilidad del modelo.' },
        { id: '2.3.3', n: 'Viabilidad y sostenibilidad', e: '¿El modelo es económicamente viable a mediano plazo?' },
        { id: '2.3.4', n: 'Potencial de escala', e: '¿Puede crecer sin proporcionar recursos linealmente?' },
      ]},
      { id: '2.4', n: 'Posicionamiento competitivo', subs: [
        { id: '2.4.1', n: 'Conocimiento de competidores', e: 'Directos, indirectos, sustitutos — ¿los conoce?' },
        { id: '2.4.2', n: 'Participación de mercado', e: 'Conocida, estimada o desconocida.' },
        { id: '2.4.3', n: 'Ventaja competitiva sostenible', e: '¿Tiene algo que la competencia no pueda copiar fácilmente?' },
        { id: '2.4.4', n: 'Monitoreo del entorno', e: '¿Observa sistemáticamente qué hace la competencia y qué cambia en el mercado?' },
      ]},
      { id: '2.5', n: 'Gestión del cambio y adaptabilidad', subs: [
        { id: '2.5.1', n: 'Capacidad de adaptación', e: '¿Historial de respuesta ante cambios del mercado, regulación, tecnología?' },
        { id: '2.5.2', n: 'Agilidad estratégica', e: '¿Velocidad de respuesta ante oportunidades o amenazas?' },
        { id: '2.5.3', n: 'Resistencia al cambio', e: '¿El equipo y la cultura resisten o abrazan el cambio?' },
        { id: '2.5.4', n: 'Gestión de la incertidumbre', e: '¿Tiene escenarios alternativos o planifica solo para el mejor caso?' },
      ]},
      { id: '2.6', n: 'Alineación estratégica', subs: [
        { id: '2.6.1', n: 'Cascadeo estratégico', e: '¿La estrategia se traduce en objetivos → indicadores → acciones por área?' },
        { id: '2.6.2', n: 'Conocimiento por área', e: '¿Cada área conoce su contribución específica a la estrategia global?' },
        { id: '2.6.3', n: 'Mecanismos de alineación', e: 'OKRs, BSC, tableros de gestión, reuniones de seguimiento.' },
        { id: '2.6.4', n: 'Accountability estratégico', e: '¿Se mide y se rinde cuentas sobre la ejecución estratégica?' },
      ]},
    ],
  },
  {
    code: 'P3', n: 'Clientes y Mercado', pregunta: '¿A quién sirve y cómo?',
    evalua: 'La relación con el mercado y la capacidad comercial.',
    dimensiones: [
      { id: '3.1', n: 'Conocimiento del cliente', subs: [
        { id: '3.1.1', n: 'Segmentación', e: '¿Tiene segmentos definidos? ¿Con qué criterios? ¿Actualizada?' },
        { id: '3.1.2', n: 'Perfil / buyer persona', e: '¿Existe documentación del cliente ideal? ¿Validada con datos?' },
        { id: '3.1.3', n: 'Data disponible', e: '¿Tiene datos reales de sus clientes (historial, preferencias, comportamiento)?' },
        { id: '3.1.4', n: 'Investigación de mercado', e: '¿Hace investigación? ¿Con qué frecuencia y profundidad?' },
      ]},
      { id: '3.2', n: 'Experiencia del cliente', subs: [
        { id: '3.2.1', n: 'Journey map', e: '¿Tiene mapeado el viaje del cliente? ¿Identificados los puntos de contacto?' },
        { id: '3.2.2', n: 'Momentos de verdad', e: '¿Sabe cuáles son los momentos críticos donde se gana o pierde al cliente?' },
        { id: '3.2.3', n: 'Medición de satisfacción', e: 'NPS, CSAT, encuestas, reviews — ¿mide y actúa?' },
        { id: '3.2.4', n: 'Gestión de quejas y feedback', e: '¿Sistema para capturar, responder y aprender de las quejas?' },
      ]},
      { id: '3.3', n: 'Proceso comercial', subs: [
        { id: '3.3.1', n: 'Pipeline de ventas', e: '¿Definido, documentado, medido? ¿Cuántas etapas?' },
        { id: '3.3.2', n: 'Ciclo de venta', e: 'Duración promedio, conversión por etapa, cuellos de botella.' },
        { id: '3.3.3', n: 'Metodología de venta', e: '¿Existe un método? ¿Estandarizado? ¿Entrenado?' },
        { id: '3.3.4', n: 'Predictibilidad de ingresos', e: '¿Puede proyectar sus ventas con razonable certeza?' },
      ]},
      { id: '3.4', n: 'Retención y fidelización', subs: [
        { id: '3.4.1', n: 'Tasa de retención / churn', e: '¿La mide? ¿Tendencia? ¿Analiza causas?' },
        { id: '3.4.2', n: 'Lifetime value (LTV)', e: '¿Conoce el valor de un cliente a lo largo del tiempo?' },
        { id: '3.4.3', n: 'Programas de lealtad', e: '¿Tiene estrategias activas de fidelización?' },
        { id: '3.4.4', n: 'Upsell y cross-sell', e: '¿Maximiza el valor de cada cliente existente?' },
      ]},
      { id: '3.5', n: 'Gestión de la relación', subs: [
        { id: '3.5.1', n: 'CRM o sistema de gestión', e: '¿Existe? ¿Se usa realmente? ¿Está actualizado?' },
        { id: '3.5.2', n: 'Seguimiento postventa', e: '¿Sistemático, esporádico o inexistente?' },
        { id: '3.5.3', n: 'Personalización', e: '¿Adapta la comunicación y el servicio al perfil de cada cliente?' },
        { id: '3.5.4', n: 'Referidos', e: '¿Gestiona las recomendaciones como un canal activo?' },
      ]},
      { id: '3.6', n: 'Inteligencia de mercado', subs: [
        { id: '3.6.1', n: 'Monitoreo de tendencias', e: '¿Observa cambios en su mercado de manera sistemática?' },
        { id: '3.6.2', n: 'Análisis competitivo', e: '¿Conoce qué hace su competencia y cómo se compara?' },
        { id: '3.6.3', n: 'Identificación de oportunidades', e: '¿Detecta nuevos segmentos, necesidades o nichos?' },
        { id: '3.6.4', n: 'Anticipación de amenazas', e: '¿Ve venir los riesgos antes de que impacten?' },
      ]},
    ],
  },
  {
    code: 'P4', n: 'Talento y Cultura', pregunta: '¿Con quién opera y en qué ambiente?',
    evalua: 'Las personas, la cultura y el ambiente organizacional.',
    dimensiones: [
      { id: '4.1', n: 'Atracción y selección', subs: [
        { id: '4.1.1', n: 'Proceso de reclutamiento', e: '¿Definido? ¿Fuentes diversificadas? ¿Tiempos controlados?' },
        { id: '4.1.2', n: 'Criterios de selección', e: '¿Evalúa competencias, fit cultural, potencial? ¿O solo experiencia y CV?' },
        { id: '4.1.3', n: 'Marca empleadora', e: '¿Es atractiva como lugar para trabajar? ¿Lo trabaja activamente?' },
        { id: '4.1.4', n: 'Efectividad de contratación', e: '¿Las personas que contrata se quedan y rinden?' },
      ]},
      { id: '4.2', n: 'Onboarding y desarrollo', subs: [
        { id: '4.2.1', n: 'Programa de inducción', e: '¿Existe? ¿Estructurado? ¿Cuánto dura? ¿Se mide su efectividad?' },
        { id: '4.2.2', n: 'Plan de capacitación', e: '¿Individual por rol? ¿Con presupuesto? ¿Con calendario?' },
        { id: '4.2.3', n: 'Plan de carrera', e: '¿La gente sabe hacia dónde puede crecer? ¿Es visible y funcional?' },
        { id: '4.2.4', n: 'Formación continua', e: '¿Acceso a cursos, certificaciones, eventos? ¿Se incentiva?' },
      ]},
      { id: '4.3', n: 'Evaluación del desempeño', subs: [
        { id: '4.3.1', n: 'Sistema de evaluación', e: '¿Existe? ¿Frecuencia? ¿Criterios claros?' },
        { id: '4.3.2', n: 'Retroalimentación', e: '¿Frecuente? ¿De calidad? ¿Bidireccional?' },
        { id: '4.3.3', n: 'Vinculación con consecuencias', e: '¿La evaluación impacta compensación, desarrollo, promociones?' },
        { id: '4.3.4', n: 'Objetivos individuales', e: '¿Alineados con los de la organización? ¿Medibles?' },
      ]},
      { id: '4.4', n: 'Cultura organizacional', subs: [
        { id: '4.4.1', n: 'Valores declarados vs vividos', e: '¿La brecha es pequeña, mediana o abismal?' },
        { id: '4.4.2', n: 'Rituales y prácticas', e: 'Reuniones, celebraciones, reconocimientos — ¿existen y son consistentes?' },
        { id: '4.4.3', n: 'Identidad y pertenencia', e: '¿La gente se siente parte de algo o solo cobra un sueldo?' },
        { id: '4.4.4', n: 'Coherencia cultural', e: '¿Lo que se predica se practica? ¿Los líderes modelan los valores?' },
      ]},
      { id: '4.5', n: 'Compromiso y bienestar', subs: [
        { id: '4.5.1', n: 'Nivel de engagement', e: '¿Medido formalmente o solo percibido?' },
        { id: '4.5.2', n: 'Rotación de personal', e: 'Tasa, causas principales, costo de rotación.' },
        { id: '4.5.3', n: 'Clima laboral', e: '¿Medido? ¿Con qué instrumento? ¿Se actúa sobre los resultados?' },
        { id: '4.5.4', n: 'Bienestar y equilibrio', e: '¿Se promueve equilibrio vida-trabajo? ¿Hay burnout sistemático?' },
      ]},
      { id: '4.6', n: 'Estructura organizacional', subs: [
        { id: '4.6.1', n: 'Organigrama', e: '¿Existe? ¿Actualizado? ¿Funcional vs real?' },
        { id: '4.6.2', n: 'Claridad de roles', e: '¿Cada persona sabe exactamente qué le toca y qué no?' },
        { id: '4.6.3', n: 'Tramos de control', e: 'Ratio líder/colaboradores — ¿razonable o sobrecargado?' },
        { id: '4.6.4', n: 'Agilidad estructural', e: '¿Puede reorganizarse sin trauma cuando las circunstancias lo requieren?' },
      ]},
      { id: '4.7', n: 'Comunicación interna', subs: [
        { id: '4.7.1', n: 'Canales definidos', e: '¿Cuáles usa? ¿Están definidos formalmente o es caos?' },
        { id: '4.7.2', n: 'Estructura de comunicación', e: '¿Hay grupos organizados por función? ¿Protocolos? ¿Reglas?' },
        { id: '4.7.3', n: 'Herramientas digitales', e: 'WhatsApp, Slack, Teams, correo — ¿cuáles? ¿las usan bien?' },
        { id: '4.7.4', n: 'Efectividad', e: '¿La información llega, se entiende y se actúa sobre ella?' },
      ]},
    ],
  },
  {
    code: 'P5', n: 'Operaciones y Procesos', pregunta: '¿Cómo ejecuta?',
    evalua: 'La maquinaria operativa que entrega valor.',
    dimensiones: [
      { id: '5.1', n: 'Procesos core', subs: [
        { id: '5.1.1', n: 'Identificación', e: '¿Sabe cuáles son sus procesos críticos? ¿Los tiene listados?' },
        { id: '5.1.2', n: 'Documentación y estandarización', e: '¿Están documentados? ¿Alguien nuevo puede seguirlos?' },
        { id: '5.1.3', n: 'Dueños de proceso', e: '¿Cada proceso tiene un responsable claro?' },
        { id: '5.1.4', n: 'Trazabilidad', e: '¿Se puede rastrear qué pasó, cuándo y por quién en cada proceso?' },
      ]},
      { id: '5.2', n: 'Eficiencia operativa', subs: [
        { id: '5.2.1', n: 'Productividad', e: 'Output vs input — ¿la mide? ¿la gestiona?' },
        { id: '5.2.2', n: 'Cuellos de botella', e: '¿Identifica dónde se frena la operación?' },
        { id: '5.2.3', n: 'Tiempos de ciclo', e: '¿Cuánto tarda en entregar? ¿Es competitivo?' },
        { id: '5.2.4', n: 'Desperdicio y optimización', e: '¿Busca activamente eliminar actividades sin valor?' },
      ]},
      { id: '5.3', n: 'Calidad', subs: [
        { id: '5.3.1', n: 'Estándares definidos', e: '¿Tiene estándares de calidad? ¿Medibles? ¿Comunicados?' },
        { id: '5.3.2', n: 'Control de calidad', e: '¿Preventivo, correctivo o predictivo? ¿En qué puntos?' },
        { id: '5.3.3', n: 'Satisfacción con la calidad', e: '¿El cliente interno y externo está satisfecho con la calidad?' },
        { id: '5.3.4', n: 'Certificaciones', e: '¿Tiene acreditaciones relevantes para su sector?' },
      ]},
      { id: '5.4', n: 'Cadena de valor y proveedores', subs: [
        { id: '5.4.1', n: 'Gestión de proveedores', e: '¿Selección, evaluación y desarrollo sistemático?' },
        { id: '5.4.2', n: 'Dependencia', e: '¿Hay proveedores críticos sin alternativa?' },
        { id: '5.4.3', n: 'Integración', e: '¿Nivel de coordinación y comunicación con la cadena?' },
        { id: '5.4.4', n: 'Condiciones comerciales', e: '¿Negocia desde la fuerza o desde la necesidad?' },
      ]},
      { id: '5.5', n: 'Gestión de riesgos operativos', subs: [
        { id: '5.5.1', n: 'Identificación de riesgos', e: '¿Tiene mapeados sus riesgos operativos principales?' },
        { id: '5.5.2', n: 'Planes de contingencia', e: '¿Sabe qué hacer si falla un proceso crítico?' },
        { id: '5.5.3', n: 'Continuidad de negocio', e: '¿Puede seguir operando ante un evento disruptivo?' },
        { id: '5.5.4', n: 'Aprendizaje de incidentes', e: '¿Cuando algo falla, aprende y previene la recurrencia?' },
      ]},
      { id: '5.6', n: 'Infraestructura y capacidad', subs: [
        { id: '5.6.1', n: 'Capacidad instalada vs utilizada', e: '¿Opera al tope o tiene margen?' },
        { id: '5.6.2', n: 'Estado de infraestructura', e: '¿Adecuada para la operación actual y para crecer?' },
        { id: '5.6.3', n: 'Logística y distribución', e: '¿Eficiente? ¿Escalable? (si aplica por sector)' },
        { id: '5.6.4', n: 'Inventarios y almacenamiento', e: '¿Gestionados o caóticos? (si aplica por sector)' },
      ]},
    ],
  },
  {
    code: 'P6', n: 'Innovación y Tecnología', pregunta: '¿Cómo evoluciona?',
    evalua: 'La capacidad de adaptación, digitalización y transformación.',
    dimensiones: [
      { id: '6.1', n: 'Madurez digital', subs: [
        { id: '6.1.1', n: 'Presencia digital', e: 'Sitio web (estático/dinámico/e-commerce), redes sociales, contenido digital.' },
        { id: '6.1.2', n: 'Sistemas de gestión', e: 'ERP, CRM, contabilidad, RRHH — ¿tiene? ¿integrados? ¿los usa?' },
        { id: '6.1.3', n: 'Infraestructura tecnológica', e: 'Hardware, redes, seguridad informática, respaldos.' },
        { id: '6.1.4', n: 'Alfabetización digital del equipo', e: '¿El equipo sabe usar las herramientas? ¿Hay resistencia?' },
      ]},
      { id: '6.2', n: 'Automatización', subs: [
        { id: '6.2.1', n: 'Procesos automatizados', e: '¿Cuántos de sus procesos repetitivos están automatizados?' },
        { id: '6.2.2', n: 'Herramientas en uso', e: '¿Qué usa? ¿Integradas o aisladas?' },
        { id: '6.2.3', n: 'ROI de automatización', e: '¿Mide el retorno? ¿Sabe cuánto ahorra?' },
        { id: '6.2.4', n: 'Pipeline de automatización', e: '¿Sabe qué sigue? ¿Tiene un roadmap de digitalización?' },
      ]},
      { id: '6.3', n: 'Gestión de datos', subs: [
        { id: '6.3.1', n: 'Captura de datos', e: '¿Qué mide? ¿Con qué frecuencia? ¿Automatizado o manual?' },
        { id: '6.3.2', n: 'Almacenamiento y accesibilidad', e: '¿Centralizado o disperso? ¿Quién puede acceder?' },
        { id: '6.3.3', n: 'Análisis', e: '¿Descriptivo (qué pasó), predictivo (qué pasará), prescriptivo (qué hacer)?' },
        { id: '6.3.4', n: 'Decisiones basadas en datos', e: '¿Los datos influyen realmente en las decisiones o se ignoran?' },
      ]},
      { id: '6.4', n: 'Capacidad de innovación', subs: [
        { id: '6.4.1', n: 'Lanzamientos', e: '¿Frecuencia de nuevos productos/servicios en los últimos 2-3 años?' },
        { id: '6.4.2', n: 'Cultura de experimentación', e: '¿Se permite probar y fallar? ¿Se prototipa?' },
        { id: '6.4.3', n: 'Inversión en innovación', e: '¿Asigna recursos (tiempo, presupuesto, personas) a innovar?' },
        { id: '6.4.4', n: 'Fuentes de innovación', e: '¿De dónde vienen las ideas? ¿Internas, clientes, competencia, tendencias?' },
      ]},
      { id: '6.5', n: 'Aprendizaje organizacional', subs: [
        { id: '6.5.1', n: 'Gestión del conocimiento', e: '¿El conocimiento crítico está documentado o vive solo en cabezas?' },
        { id: '6.5.2', n: 'Transferencia de conocimiento', e: '¿Cuando alguien se va, el conocimiento se queda?' },
        { id: '6.5.3', n: 'Lecciones aprendidas', e: '¿Se capturan y se aplican? ¿O se repiten los mismos errores?' },
        { id: '6.5.4', n: 'Benchmarking', e: '¿Se compara con otros (internamente y externamente) para mejorar?' },
      ]},
    ],
  },
  {
    code: 'P7', n: 'Desempeño Financiero', pregunta: '¿Qué resultados produce?',
    evalua: 'La salud financiera y la sostenibilidad económica.',
    dimensiones: [
      { id: '7.1', n: 'Rentabilidad', subs: [
        { id: '7.1.1', n: 'Márgenes', e: 'Bruto, operativo y neto — ¿los conoce? ¿Tendencia?' },
        { id: '7.1.2', n: 'Rentabilidad por línea', e: '¿Sabe qué productos/servicios/clientes son más rentables?' },
        { id: '7.1.3', n: 'Punto de equilibrio', e: '¿Lo conoce? ¿Lo monitorea?' },
        { id: '7.1.4', n: 'Comparación vs industria', e: '¿Está por encima, en la media o por debajo de su sector?' },
      ]},
      { id: '7.2', n: 'Flujo de efectivo', subs: [
        { id: '7.2.1', n: 'Flujo operativo', e: '¿Positivo? ¿Suficiente? ¿Tendencia?' },
        { id: '7.2.2', n: 'Ciclo de conversión', e: 'Días por cobrar, días por pagar, días de inventario.' },
        { id: '7.2.3', n: 'Capital de trabajo', e: '¿Suficiente, apretado o deficitario?' },
        { id: '7.2.4', n: 'Gestión de tesorería', e: '¿Planifica, proyecta y controla el efectivo?' },
      ]},
      { id: '7.3', n: 'Estructura financiera', subs: [
        { id: '7.3.1', n: 'Apalancamiento', e: 'Nivel de deuda vs capital propio.' },
        { id: '7.3.2', n: 'Fuentes de financiamiento', e: '¿Diversificadas? ¿Concentradas en una sola fuente?' },
        { id: '7.3.3', n: 'Costo de capital', e: '¿Conoce cuánto le cuesta el dinero que usa?' },
        { id: '7.3.4', n: 'Capacidad de endeudamiento', e: '¿Tiene margen para financiarse si lo necesita?' },
      ]},
      { id: '7.4', n: 'Control y presupuesto', subs: [
        { id: '7.4.1', n: 'Presupuesto anual', e: '¿Existe? ¿Se respeta? ¿Se revisa periódicamente?' },
        { id: '7.4.2', n: 'Control de gastos', e: '¿Sistemático, reactivo o inexistente?' },
        { id: '7.4.3', n: 'Contabilidad', e: '¿Al día? ¿Mensual? ¿Trimestral? ¿Caótica?' },
        { id: '7.4.4', n: 'Cumplimiento fiscal', e: '¿Cumple en tiempo y forma? ¿Riesgos pendientes?' },
      ]},
      { id: '7.5', n: 'Indicadores y gestión financiera', subs: [
        { id: '7.5.1', n: 'KPIs financieros', e: '¿Definidos? ¿Monitoreados? ¿Accionados?' },
        { id: '7.5.2', n: 'Dashboard financiero', e: '¿Existe? ¿Con qué frecuencia se revisa?' },
        { id: '7.5.3', n: 'Accesibilidad de la información', e: '¿El líder puede ver su estado financiero en cualquier momento?' },
        { id: '7.5.4', n: 'Planeación financiera', e: '¿Hace proyecciones? ¿Escenarios? ¿Modelos?' },
      ]},
    ],
  },
];

// --- Índices de conveniencia ---
export const PILAR_POR_CODE: Record<string, Pilar> = Object.fromEntries(PILARES.map((p) => [p.code, p]));
export const TODAS_SUBDIMENSIONES: SubDimension[] = PILARES.flatMap((p) => p.dimensiones.flatMap((d) => d.subs));
export const TODAS_DIMENSIONES: Dimension[] = PILARES.flatMap((p) => p.dimensiones);

/** Code de pilar (P1..P7) a partir del id de dimensión o sub-dimensión ("4.2" | "4.2.1"). */
export const pilarCodeDe = (id: string) => `P${id.split('.')[0]}`;
