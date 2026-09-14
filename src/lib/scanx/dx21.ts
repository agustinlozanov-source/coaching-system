// DX21 — Motor de evaluación: escala, lentes, scoring (roll-up), perfiles de
// brecha (diagnóstico diferencial), niveles de madurez y correlaciones entre
// pilares. Fuente de la taxonomía: ./dx21-marco.
import { PILARES, type Pilar, type Dimension } from './dx21-marco';

export type LenteId = 'D' | 'Dp' | 'Ds';

/** Respuestas del diagnóstico: por sub-dimensión, un valor 0-4 por lente. */
export type RespuestasDX21 = Record<string, Partial<Record<LenteId, number>>>;

/** Estado completo del diagnóstico DX21 persistido en scanx_diagnosticos.dx21. */
export type PlanAccion = { inmediato: string[]; corto: string[]; mediano: string[] };
export type DX21State = {
  respuestas: RespuestasDX21;
  cualitativo?: Record<string, string>;   // dimId -> nota cualitativa
  narrativa?: string;                      // resultados fase 1 (IA)
  plan?: PlanAccion | null;                // plan de acción (IA)
  firma?: string;                          // hash de inputs para no recalcular IA
  tabsCompletos?: string[];                // ids de tabs completados (progresión bloqueada)
  completedAt?: string | null;
};

export const LENTES: { id: LenteId; nombre: string; pregunta: string }[] = [
  { id: 'D', nombre: 'Diseño', pregunta: '¿Lo tienen pensado?' },
  { id: 'Dp', nombre: 'Despliegue', pregunta: '¿Lo están haciendo?' },
  { id: 'Ds', nombre: 'Desempeño', pregunta: '¿Les está funcionando?' },
];

/** Escala 0-4 de madurez por lente. */
export const ESCALA: { v: number; label: string; desc: string }[] = [
  { v: 0, label: 'Inexistente', desc: 'No existe evidencia alguna' },
  { v: 1, label: 'Inicial', desc: 'Esfuerzos aislados, informales, reactivos' },
  { v: 2, label: 'En desarrollo', desc: 'Existe parcialmente, en proceso de formalización' },
  { v: 3, label: 'Establecido', desc: 'Formalizado, consistente, aplicado en la mayoría de áreas' },
  { v: 4, label: 'Optimizado', desc: 'Maduro, medido, mejorado continuamente, referente' },
];

/** Niveles de madurez organizacional (rangos del score 0-4). */
export type NivelMadurez = { nivel: string; interpretacion: string; min: number; max: number };
export const MADUREZ: NivelMadurez[] = [
  { nivel: 'Crítico', interpretacion: 'Opera sin estructura en esta área. Riesgo alto.', min: 0.0, max: 0.9 },
  { nivel: 'Reactivo', interpretacion: 'Existe algo, pero informal y dependiente de personas.', min: 1.0, max: 1.9 },
  { nivel: 'En construcción', interpretacion: 'Se está formalizando. Hay avances pero falta consistencia.', min: 2.0, max: 2.9 },
  { nivel: 'Profesional', interpretacion: 'Estructura sólida. Funciona y produce resultados.', min: 3.0, max: 3.5 },
  { nivel: 'De clase mundial', interpretacion: 'Referente. Optimizado, medido, mejorado continuamente.', min: 3.6, max: 4.0 },
];

export function nivelMadurez(score: number | null): NivelMadurez | null {
  if (score == null) return null;
  return MADUREZ.find((m) => score >= m.min && score <= m.max) ?? MADUREZ[MADUREZ.length - 1];
}

/** Umbral por lente para considerar que "existe/funciona" (✓) en el perfil de brecha. */
export const UMBRAL_OK = 2.5;

export type PerfilBrecha = 'madurez' | 'efectividad' | 'ejecucion' | 'sostenibilidad' | 'sin_direccion' | 'ausencia';

export const BRECHAS: Record<PerfilBrecha, { label: string; significado: string; intervencion: string }> = {
  madurez: { label: 'Madurez', significado: 'Sistema funcionando — diseñado, ejecutado y produciendo.', intervencion: 'Optimización y escala.' },
  efectividad: { label: 'Brecha de efectividad', significado: 'Hacen lo que diseñaron, pero no funciona.', intervencion: 'Rediseñar el enfoque (el plan está mal).' },
  ejecucion: { label: 'Brecha de ejecución', significado: 'Saben qué hacer, pero no lo hacen.', intervencion: 'Implementación, capacitación, accountability.' },
  sostenibilidad: { label: 'Riesgo de sostenibilidad', significado: 'Funciona, pero por inercia o suerte, sin diseño.', intervencion: 'Formalizar y documentar antes de que se pierda.' },
  sin_direccion: { label: 'Actividad sin dirección', significado: 'Hacen cosas sin saber por qué ni con qué resultado.', intervencion: 'Detenerse, diseñar, luego reejecutar.' },
  ausencia: { label: 'Ausencia', significado: 'No existe, no se hace, no produce.', intervencion: 'Construir desde cero.' },
};

/** Deriva el perfil de brecha a partir de las 3 lentes (0-4 o null). */
export function perfilBrecha(D: number | null, Dp: number | null, Ds: number | null): PerfilBrecha | null {
  if (D == null && Dp == null && Ds == null) return null;
  const d = (D ?? 0) >= UMBRAL_OK, dp = (Dp ?? 0) >= UMBRAL_OK, ds = (Ds ?? 0) >= UMBRAL_OK;
  if (d && dp && ds) return 'madurez';
  if (d && dp && !ds) return 'efectividad';
  if (d && !dp) return 'ejecucion';                 // ✓✗✗ y ✓✗✓ → la brecha está en el despliegue
  if (!d && dp && ds) return 'sostenibilidad';
  if (!d && dp && !ds) return 'sin_direccion';
  if (!d && !dp && ds) return 'sostenibilidad';     // resultados sin diseño ni despliegue = suerte
  return 'ausencia';
}

// --- Roll-up de scores ---
const prom = (xs: (number | null | undefined)[]): number | null => {
  const v = xs.filter((x): x is number => typeof x === 'number' && !isNaN(x));
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100 : null;
};

export type SubResult = { id: string; n: string; D: number | null; Dp: number | null; Ds: number | null; score: number | null };
export type LentesTriple = { D: number | null; Dp: number | null; Ds: number | null };
export type DimResult = { id: string; n: string; score: number | null; lentes: LentesTriple; brecha: PerfilBrecha | null; subs: SubResult[] };
export type PilarResult = { code: string; n: string; score: number | null; lentes: LentesTriple; brecha: PerfilBrecha | null; madurez: NivelMadurez | null; dimensiones: DimResult[] };
export type Correlacion = { id: string; texto: string };
export type DX21Resultado = {
  pilares: PilarResult[];
  general: number | null;
  madurez: NivelMadurez | null;
  brechaDominante: PerfilBrecha | null;
  correlaciones: Correlacion[];
  completitud: number; // 0..1 — puntos de lente respondidos / total (480)
};

function subResult(subId: string, subN: string, r: RespuestasDX21): SubResult {
  const a = r[subId] ?? {};
  const D = a.D ?? null, Dp = a.Dp ?? null, Ds = a.Ds ?? null;
  return { id: subId, n: subN, D, Dp, Ds, score: prom([D, Dp, Ds]) };
}

/** Promedio por lente sobre un conjunto de sub-resultados. */
function lentesDe(subs: SubResult[]): LentesTriple {
  return { D: prom(subs.map((s) => s.D)), Dp: prom(subs.map((s) => s.Dp)), Ds: prom(subs.map((s) => s.Ds)) };
}

function dimResult(dim: Dimension, r: RespuestasDX21): DimResult {
  const subs = dim.subs.map((s) => subResult(s.id, s.n, r));
  const lentes = lentesDe(subs);
  return { id: dim.id, n: dim.n, score: prom(subs.map((s) => s.score)), lentes, brecha: perfilBrecha(lentes.D, lentes.Dp, lentes.Ds), subs };
}

function pilarResult(pilar: Pilar, r: RespuestasDX21): PilarResult {
  const dimensiones = pilar.dimensiones.map((d) => dimResult(d, r));
  const subs = dimensiones.flatMap((d) => d.subs);
  const lentes = lentesDe(subs);
  const score = prom(dimensiones.map((d) => d.score));
  return { code: pilar.code, n: pilar.n, score, lentes, brecha: perfilBrecha(lentes.D, lentes.Dp, lentes.Ds), madurez: nivelMadurez(score), dimensiones };
}

const ALTO = 3.0, BAJO = 2.0;
/** Correlaciones entre pilares (tabla 10.5). Devuelve las que se activan. */
export function correlacionesActivas(s: Record<string, number | null>): Correlacion[] {
  const g = (c: string) => s[c];
  const alto = (c: string) => { const v = g(c); return v != null && v >= ALTO; };
  const bajo = (c: string) => { const v = g(c); return v != null && v < BAJO; };
  const out: Correlacion[] = [];
  if (bajo('P1') && bajo('P2')) out.push({ id: 'P1P2', texto: 'Sin liderazgo claro no hay estrategia — problema de origen.' });
  if (alto('P2') && bajo('P5')) out.push({ id: 'P2P5', texto: 'Estrategia clara pero operación débil — no ejecutan lo que planean.' });
  if (alto('P3') && bajo('P7')) out.push({ id: 'P3P7', texto: 'Buenos con clientes pero no generan dinero — modelo de negocio roto.' });
  if (bajo('P4') && bajo('P5')) out.push({ id: 'P4P5', texto: 'Sin talento preparado no hay operación eficiente — el talento es prerrequisito.' });
  if (bajo('P6') && alto('P2')) out.push({ id: 'P6P2', texto: 'Estrategia clara pero sin innovación — riesgo de obsolescencia.' });
  if (alto('P1') && bajo('P4')) out.push({ id: 'P1P4', texto: 'Buen líder pero mal equipo — problema de atracción o desarrollo.' });
  if (alto('P7') && bajo('P6')) out.push({ id: 'P7P6', texto: 'Rentable hoy pero sin evolución — bonanza temporal.' });
  return out;
}

/** Perfil de brecha dominante: el más frecuente entre los 7 pilares (con datos). */
function brechaDominante(pilares: PilarResult[]): PerfilBrecha | null {
  const cuenta = new Map<PerfilBrecha, number>();
  for (const p of pilares) if (p.brecha) cuenta.set(p.brecha, (cuenta.get(p.brecha) ?? 0) + 1);
  let best: PerfilBrecha | null = null, max = 0;
  for (const [k, v] of Array.from(cuenta)) if (v > max) { best = k; max = v; }
  return best;
}

/** Cálculo completo del diagnóstico DX21 a partir de las respuestas por lente. */
export function calcularDX21(r: RespuestasDX21): DX21Resultado {
  const pilares = PILARES.map((p) => pilarResult(p, r));
  const general = prom(pilares.map((p) => p.score));
  const scoreMap: Record<string, number | null> = Object.fromEntries(pilares.map((p) => [p.code, p.score]));
  // completitud: puntos de lente respondidos / total teórico (subs × 3)
  const totalPuntos = PILARES.reduce((a, p) => a + p.dimensiones.reduce((b, d) => b + d.subs.length, 0), 0) * 3;
  let respondidos = 0;
  for (const k of Object.keys(r)) for (const l of ['D', 'Dp', 'Ds'] as LenteId[]) if (typeof r[k]?.[l] === 'number') respondidos++;
  return {
    pilares,
    general,
    madurez: nivelMadurez(general),
    brechaDominante: brechaDominante(pilares),
    correlaciones: correlacionesActivas(scoreMap),
    completitud: totalPuntos ? Math.round((respondidos / totalPuntos) * 100) / 100 : 0,
  };
}
