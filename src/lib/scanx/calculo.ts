import {
  DIMENSIONES,
  VALOR_MAX,
  semaforoDe,
  type DimensionId,
  type Pregunta,
  type Respuesta,
  type Resultado,
  type ResultadoDimension,
  type TipoEmpresa,
} from '@/types/scanx';

/** Nº mínimo de preguntas para considerar una dimensión "confiable" (no en gris). */
export const UMBRAL_CONFIANZA = 2;

/** Dimensiones fundacionales: si están bajas, bloquean a las demás → pesan más en prioridad. */
const FUNDACIONALES: DimensionId[] = ['liderazgo', 'estrategia', 'operacion', 'finanzas'];

/** Acumula los valores recibidos por cada dimensión a partir de las respuestas y el banco. */
export function acumular(respuestas: Respuesta[], banco: Pregunta[]): Record<DimensionId, number[]> {
  const acc = {} as Record<DimensionId, number[]>;
  for (const d of DIMENSIONES) acc[d.id] = [];

  const porId = new Map(banco.map((p) => [p.id, p]));
  for (const r of respuestas) {
    const preg = porId.get(r.preguntaId);
    const op = preg?.opciones.find((o) => o.id === r.opcionId);
    if (!op) continue;
    for (const [dim, valor] of Object.entries(op.pesos)) {
      if (valor == null) continue;
      acc[dim as DimensionId]?.push(valor);
    }
  }
  return acc;
}

/** Resultado por dimensión (promedio ponderado; null si no fue medida). */
export function dimensiones(respuestas: Respuesta[], banco: Pregunta[]): ResultadoDimension[] {
  const acc = acumular(respuestas, banco);
  return DIMENSIONES.map((d) => {
    const vals = acc[d.id];
    const valor = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    const confiable = vals.length >= UMBRAL_CONFIANZA;
    return {
      id: d.id,
      nombre: d.nombre,
      valor: valor == null ? null : Math.round(valor * 100) / 100,
      preguntas: vals.length,
      confiable,
      semaforo: confiable ? semaforoDe(valor) : 'gris',
    };
  });
}

function promedioGeneral(dims: ResultadoDimension[]): number | null {
  const medidas = dims.filter((d) => d.valor != null).map((d) => d.valor as number);
  if (!medidas.length) return null;
  return Math.round((medidas.reduce((s, v) => s + v, 0) / medidas.length) * 100) / 100;
}

function clasificar(prom: number | null): TipoEmpresa {
  if (prom == null || prom < 1.5) return 1; // Arrancando
  if (prom < 2.75) return 2; // Atorada
  return 3; // Lista para escalar
}

/** Top 3 prioridades: brecha (4 - valor) con boost a dimensiones fundacionales. */
function topPrioridades(dims: ResultadoDimension[]): DimensionId[] {
  return dims
    .filter((d) => d.valor != null)
    .map((d) => {
      const brecha = VALOR_MAX - (d.valor as number);
      const boost = FUNDACIONALES.includes(d.id) ? 1.25 : 1;
      return { id: d.id, score: brecha * boost };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.id);
}

/** Resultado completo del diagnóstico. */
export function calcularResultado(respuestas: Respuesta[], banco: Pregunta[]): Resultado {
  const dims = dimensiones(respuestas, banco);
  const prom = promedioGeneral(dims);
  return {
    dimensiones: dims,
    promedioGeneral: prom,
    tipoEmpresa: clasificar(prom),
    top3: topPrioridades(dims),
  };
}
