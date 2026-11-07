/**
 * Lector de tableros escritos a mano.
 *
 * Alguien que ya trabajó sus dimensiones en otro lado no tiene por qué
 * volver a dictárselas a nadie: suelta el documento y se carga. Esto lo lee
 * SIN IA — parseo directo, gratis, instantáneo y sin riesgo de que algo se
 * invente. La revisión con IA es un paso aparte y opcional.
 *
 * Reglas, en orden de precedencia por línea:
 *   - Un encabezado Markdown (#, ##, ###…) abre una dimensión.
 *   - Una línea que sea solo negritas (**Algo**) también abre una dimensión:
 *     es como queda un documento pegado desde Word.
 *   - Una viñeta (-, *, •) o un numeral (1. / 1)) es un aspecto.
 *   - `peso: 2` debajo del título le pone peso a esa dimensión.
 *   - `(KPI)` o `[KPI]` en el título la marca como KPI, fuera del promedio.
 *   - La prosa que va justo debajo de un título es la DESCRIPCIÓN de esa
 *     dimensión: para qué sirve, qué se busca ahí. Se corta en la primera
 *     viñeta.
 *   - Dentro de una viñeta, `nombre — descripción` separa el aspecto de su
 *     explicación. Sirven el guión largo, el corto con espacios, la barra y
 *     los dos puntos.
 */

export type AspectoImportado = { nombre: string; descripcion?: string };

export type DimensionImportada = {
  nombre: string;
  descripcion?: string;
  naturaleza: 'competencia' | 'kpi';
  peso: number;
  aspectos: AspectoImportado[];
};

export type ResultadoImportacion = {
  dimensiones: DimensionImportada[];
  /** Líneas que no se pudieron acomodar; se le enseñan a la persona. */
  ignoradas: string[];
};

const RE_ENCABEZADO = /^\s{0,3}#{1,6}\s+(.*)$/;
const RE_NEGRITAS = /^\s*\*\*(.+?)\*\*\s*:?\s*$/;
const RE_VINETA = /^\s*[-*•·—]\s+(.*)$/;
const RE_NUMERAL = /^\s*\d+\s*[.)]\s+(.*)$/;
const RE_PESO = /^\s*peso\s*[:=]\s*([\d.]+)\s*$/i;
const RE_KPI = /[([]\s*kpi\s*[)\]]/i;
/** Lo que separa el nombre de un aspecto de su explicación. */
const RE_SEPARADOR = /\s+[—–|]\s+|\s+-\s+|\s*:\s+/;

/** Parte «nombre — explicación» sin romper nombres que traen guiones pegados. */
function partirAspecto(crudo: string): { nombre: string; descripcion?: string } {
  const m = crudo.match(RE_SEPARADOR);
  if (!m || m.index === undefined) return { nombre: limpiar(crudo) };
  const nombre = limpiar(crudo.slice(0, m.index));
  const descripcion = limpiar(crudo.slice(m.index + m[0].length));
  // Si cualquiera de los dos lados queda muy corto, no era un separador.
  if (nombre.length < 3 || descripcion.length < 3) return { nombre: limpiar(crudo) };
  return { nombre, descripcion };
}

/** Quita negritas, cursivas, backticks y la numeración que venga pegada. */
function limpiar(t: string): string {
  return t
    .replace(/\*\*/g, '')
    .replace(/[`_]/g, '')
    .replace(/^\s*\d+\s*[.)]\s*/, '')
    .replace(/\s*[:：]\s*$/, '')
    .trim();
}

export function leerTablero(texto: string): ResultadoImportacion {
  const dimensiones: DimensionImportada[] = [];
  const ignoradas: string[] = [];
  let actual: DimensionImportada | null = null;
  // Solo la prosa pegada al título cuenta como descripción; la primera viñeta
  // cierra esa ventana para que el resto del documento no se cuele ahí.
  let esperandoDescripcion = false;

  /** Devuelve la dimensión que queda abierta, para que la asigne el ciclo. */
  function abrirDimension(crudo: string): DimensionImportada | null {
    const esKpi = RE_KPI.test(crudo);
    const nombre = limpiar(crudo.replace(RE_KPI, ''));
    if (!nombre) return null;
    // Un mismo título dos veces no crea dos bloques: se continúa el primero.
    const yaEsta = dimensiones.find((d) => d.nombre.toLowerCase() === nombre.toLowerCase());
    if (yaEsta) return yaEsta;
    const nueva: DimensionImportada = {
      nombre, naturaleza: esKpi ? 'kpi' : 'competencia', peso: 1, aspectos: [],
    };
    dimensiones.push(nueva);
    return nueva;
  }

  function agregarAspecto(dim: DimensionImportada, crudo: string) {
    const { nombre, descripcion } = partirAspecto(crudo);
    if (!nombre) return;
    if (dim.aspectos.some((a) => a.nombre.toLowerCase() === nombre.toLowerCase())) return;
    dim.aspectos.push(descripcion ? { nombre, descripcion } : { nombre });
  }

  for (const linea of texto.split(/\r?\n/)) {
    if (!linea.trim()) continue;

    const peso = linea.match(RE_PESO);
    if (peso) {
      if (actual) actual.peso = Number(peso[1]) || 1;
      continue;
    }

    const enc = linea.match(RE_ENCABEZADO);
    if (enc) { actual = abrirDimension(enc[1]) ?? actual; esperandoDescripcion = true; continue; }

    const vin = linea.match(RE_VINETA);
    const num = vin ? null : linea.match(RE_NUMERAL);
    if (vin || num) {
      // Viñetas antes del primer título: se guardan sin perderlas.
      if (!actual) actual = abrirDimension('Sin clasificar');
      if (actual) agregarAspecto(actual, (vin ?? num)![1]);
      esperandoDescripcion = false;
      continue;
    }

    const neg = linea.match(RE_NEGRITAS);
    if (neg) { actual = abrirDimension(neg[1]) ?? actual; esperandoDescripcion = true; continue; }

    if (esperandoDescripcion && actual) {
      const t = limpiar(linea);
      if (t) actual.descripcion = actual.descripcion ? `${actual.descripcion} ${t}` : t;
      continue;
    }

    ignoradas.push(linea.trim());
  }

  // Un título sin un solo aspecto casi siempre es prosa, no una dimensión.
  const vacias = dimensiones.filter((d) => d.aspectos.length === 0);
  const utiles = dimensiones.filter((d) => d.aspectos.length > 0);
  vacias.forEach((d) => ignoradas.push(d.nombre));

  return { dimensiones: utiles, ignoradas };
}

/** Las ocho de la casa, para decirle a la persona qué no trae su documento. */
export const CANON = [
  'Planeación y Organización',
  'No Negociables',
  'Uso de Sistemas',
  'Conocimiento Institucional',
  'Conocimiento del Producto',
  'Conocimientos Técnicos',
  'Actitud',
] as const;

/** Compara sin acentos ni mayúsculas, para que «Planeacion» cuente igual. */
function normal(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function faltantesDelCanon(dims: { nombre: string }[]): string[] {
  const traidas = dims.map((d) => normal(d.nombre));
  return CANON.filter((c) => !traidas.some((t) => t.includes(normal(c)) || normal(c).includes(t)));
}

export const COLORES_DIMENSION = [
  '#3533cd', '#1aab99', '#8b5cf6', '#ec4899', '#f59e0b', '#14806a', '#ef4444', '#0ea5a3',
];
