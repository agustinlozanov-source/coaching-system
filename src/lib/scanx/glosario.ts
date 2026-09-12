/** Glosario contextual de SCANx. Términos clave con definición aterrizada. */
export type Termino = { termino: string; definicion: string; ejemplo?: string };

export const GLOSARIO: Termino[] = [
  { termino: 'proceso habilitador', definicion: 'Una capacidad transversal que hace funcionar a la empresa sin importar cómo esté organizada (captar clientes, entregar, cobrar). No es un departamento, es una función que siempre debe existir.' },
  { termino: 'diferenciación', definicion: 'Aquello que hace que un cliente te elija en vez de la competencia y que es difícil de copiar. Si el único diferenciador es el precio, no hay diferenciación real.' },
  { termino: 'propuesta de valor', definicion: 'La promesa clara de por qué tu producto/servicio vale lo que cuesta, para un cliente específico.' },
  { termino: 'pipeline', definicion: 'El embudo de oportunidades comerciales por etapa (prospecto → propuesta → cierre). Ver el pipeline dice cuántas ventas vienen y dónde se atoran.', ejemplo: 'Ej.: 20 prospectos, 8 propuestas, 3 por cerrar.' },
  { termino: 'NPS', definicion: 'Net Promoter Score: mide cuántos clientes te recomendarían. Se pregunta "del 0 al 10, ¿qué tanto nos recomendarías?" y se resta detractores de promotores.' },
  { termino: 'flujo de caja', definicion: 'El dinero real que entra y sale en el tiempo. Una empresa puede ser rentable en papel y aun así quedarse sin efectivo.' },
  { termino: 'escalabilidad', definicion: 'La capacidad de crecer (más volumen, sucursales, clientes) sin que los costos ni el caos crezcan en la misma proporción.' },
  { termino: 'gobierno corporativo', definicion: 'La estructura de toma de decisiones y rendición de cuentas: consejos, asambleas, roles claros. Da orden y credibilidad.' },
  { termino: 'rendición de cuentas', definicion: 'Que cada responsable reporte resultados ante alguien, con métricas y periodicidad. Sin esto, las metas se diluyen.' },
  { termino: 'benchmarking', definicion: 'Compararte contra un estándar (tu industria, un competidor, una empresa pública) para saber si estás bien o mal en términos relativos.' },
  { termino: 'KPI', definicion: 'Indicador clave de desempeño: la métrica que de verdad importa para un objetivo (margen, conversión, rotación).' },
  { termino: 'EBITDA', definicion: 'Utilidad antes de intereses, impuestos, depreciación y amortización. Aproxima cuánto genera la operación pura del negocio.' },
  { termino: 'margen operativo', definicion: 'Qué porcentaje de tus ingresos queda como utilidad de la operación. Alto = eficiente; bajo = te cuesta mucho operar.' },
  { termino: 'forecasting', definicion: 'Proyectar hacia adelante (ventas, flujo, demanda) con base en datos, para anticiparse en vez de reaccionar.' },
];

const MAP = new Map(GLOSARIO.map((t) => [t.termino.toLowerCase(), t]));

/** Términos del glosario que aparecen en un texto (para mostrarlos como chips). */
export function terminosEn(texto: string): Termino[] {
  const t = texto.toLowerCase();
  return GLOSARIO.filter((g) => t.includes(g.termino.toLowerCase()));
}
export const buscarTermino = (k: string) => MAP.get(k.toLowerCase()) ?? null;
