// Cálculos puros para "Áreas de Oportunidad del Equipo" (sin dependencias de React).
// Agrega la ÚLTIMA evaluación de cada empleado por dimensión y por aspecto para
// identificar automáticamente las brechas del equipo, priorizarlas por impacto
// y sugerir foco de capacitación.

import { Dimension, Evaluacion, VALOR_MAX, pctDimension } from '@/types/teamx';

export interface MiembroPct {
  empleadoId: string;
  nombre: string;
  pct: number;
}

export interface DimensionAgg {
  id: string;
  nombre: string;
  color: string;
  orden: number;
  hasData: boolean; // false = ningún miembro tiene esta dimensión respondida aún
  avgPct: number;
  miembros: MiembroPct[]; // empleados con dato en esta dimensión, ordenados asc por pct
  bajo30: MiembroPct[]; // por debajo del 30% (umbral crítico)
  bajo50: MiembroPct[]; // por debajo del 50% ("afectados" para priorización)
  impacto: number; // debilidad (100-avgPct) × personas afectadas (bajo50)
}

export interface AspectoAgg {
  id: string;
  nombre: string;
  dimensionId: string;
  dimensionNombre: string;
  dimensionColor: string;
  avgPct: number;
  n: number; // miembros con dato en este aspecto
}

export interface Sugerencia {
  dimensionId: string;
  dimensionNombre: string;
  color: string;
  texto: string;
}

export interface AreasOportunidadData {
  totalEmpleados: number;
  totalConEvaluacion: number;
  dimensiones: DimensionAgg[]; // ordenadas asc por avgPct (más débil primero)
  dimensionesPorImpacto: DimensionAgg[]; // ordenadas desc por impacto
  aspectosDebiles: AspectoAgg[]; // ordenados asc por avgPct
  headline: string | null;
  sugerencias: Sugerencia[];
}

const UMBRAL_CRITICO = 30;
const UMBRAL_AFECTADO = 50;

export function buildAreasOportunidad(
  evaluaciones: Evaluacion[],
  empleados: { id: string; nombre: string }[],
  dimensionesActuales: Dimension[] = [],
): AreasOportunidadData {
  const nombrePorId = new Map(empleados.map((e) => [e.id, e.nombre]));

  // Última evaluación por empleado. `evaluaciones` viene ordenada desc por fecha
  // (listEvaluaciones), así que la primera ocurrencia por empleadoId es la más reciente.
  const latest = new Map<string, Evaluacion>();
  for (const ev of evaluaciones) {
    if (!latest.has(ev.empleadoId)) latest.set(ev.empleadoId, ev);
  }

  const ordenPorId = new Map(dimensionesActuales.map((d) => [d.id, d.orden]));

  const dimMap = new Map<string, { nombre: string; color: string; miembros: MiembroPct[] }>();
  const aspMap = new Map<
    string,
    { nombre: string; dimensionId: string; dimensionNombre: string; dimensionColor: string; valores: number[] }
  >();

  // Pre-siembra con las dimensiones de competencia vigentes (aunque nadie tenga dato aún),
  // así el radar del equipo muestra el perfil completo y no solo lo respondido.
  for (const d of dimensionesActuales.filter((d) => d.naturaleza === 'competencia')) {
    dimMap.set(d.id, { nombre: d.nombre, color: d.color, miembros: [] });
  }

  Array.from(latest.values()).forEach((ev) => {
    // Solo empleados activos (presentes en `empleados`); si no está en el mapa, usa el nombre guardado en la evaluación.
    const nombre = nombrePorId.get(ev.empleadoId);
    if (!nombre) return;

    const dims = (ev.configSnapshot?.dimensiones ?? []).filter((d) => d.naturaleza === 'competencia');
    dims.forEach((dim) => {
      const pct = pctDimension(dim, ev.respuestas);
      if (pct !== null) {
        const entry = dimMap.get(dim.id) ?? { nombre: dim.nombre, color: dim.color, miembros: [] };
        entry.miembros.push({ empleadoId: ev.empleadoId, nombre, pct });
        if (!dimMap.has(dim.id)) dimMap.set(dim.id, entry);
      }

      dim.aspectos.forEach((asp) => {
        const r = ev.respuestas[asp.id];
        if (!r || r.na || r.valor === null || r.valor === undefined) return;
        const valuePct = (r.valor / VALOR_MAX) * 100;
        const ae =
          aspMap.get(asp.id) ??
          { nombre: asp.nombre, dimensionId: dim.id, dimensionNombre: dim.nombre, dimensionColor: dim.color, valores: [] };
        ae.valores.push(valuePct);
        if (!aspMap.has(asp.id)) aspMap.set(asp.id, ae);
      });
    });
  });

  const dimensiones: DimensionAgg[] = Array.from(dimMap.entries())
    .map(([id, v], i) => {
      const hasData = v.miembros.length > 0;
      const avgPct = hasData ? Math.round(v.miembros.reduce((s, m) => s + m.pct, 0) / v.miembros.length) : 0;
      const miembrosOrdenados = [...v.miembros].sort((a, b) => a.pct - b.pct);
      const bajo30 = miembrosOrdenados.filter((m) => m.pct < UMBRAL_CRITICO);
      const bajo50 = miembrosOrdenados.filter((m) => m.pct < UMBRAL_AFECTADO);
      return {
        id,
        nombre: v.nombre,
        color: v.color,
        orden: ordenPorId.get(id) ?? 1000 + i,
        hasData,
        avgPct,
        miembros: miembrosOrdenados,
        bajo30,
        bajo50,
        impacto: hasData ? Math.round((100 - avgPct) * bajo50.length) : 0,
      };
    })
    // más débil primero; las dimensiones sin datos van al final
    .sort((a, b) => {
      if (a.hasData !== b.hasData) return a.hasData ? -1 : 1;
      return a.avgPct - b.avgPct;
    });

  const dimensionesPorImpacto = [...dimensiones].filter((d) => d.hasData).sort((a, b) => b.impacto - a.impacto);

  const aspectosDebiles: AspectoAgg[] = Array.from(aspMap.entries())
    .map(([id, v]) => ({
      id,
      nombre: v.nombre,
      dimensionId: v.dimensionId,
      dimensionNombre: v.dimensionNombre,
      dimensionColor: v.dimensionColor,
      avgPct: Math.round(v.valores.reduce((s, x) => s + x, 0) / v.valores.length),
      n: v.valores.length,
    }))
    .sort((a, b) => a.avgPct - b.avgPct);

  const weakest = dimensiones.find((d) => d.hasData) ?? null;
  const headline = weakest
    ? `La dimensión más débil es ${weakest.nombre} al ${weakest.avgPct}% — ${weakest.bajo30.length} de ${weakest.miembros.length} miembros por debajo del ${UMBRAL_CRITICO}%.`
    : null;

  const FORMATOS = [
    'talleres prácticos y mentorías cruzadas',
    'sesiones de role-play y feedback en vivo',
    'revisión de casos reales en coaching 1:1',
    'micro-capacitaciones quincenales y acompañamiento en campo',
  ];

  const sugerencias: Sugerencia[] = dimensiones
    .filter((d) => d.hasData && d.avgPct < 70)
    .slice(0, 4)
    .map((d, i) => {
      const aspBajos = aspectosDebiles.filter((a) => a.dimensionId === d.id).slice(0, 2);
      const foco = aspBajos.length
        ? `enfocada en “${aspBajos.map((a) => a.nombre).join('” y “')}”`
        : 'con foco en los comportamientos clave de esta competencia';
      const formato = FORMATOS[i % FORMATOS.length];
      return {
        dimensionId: d.id,
        dimensionNombre: d.nombre,
        color: d.color,
        texto: `Capacitación sugerida ${foco}: ${formato} durante las próximas semanas para elevar ${d.nombre} (hoy en ${d.avgPct}%, ${d.bajo50.length} de ${d.miembros.length} miembros por debajo del ${UMBRAL_AFECTADO}%).`,
      };
    });

  const totalConEvaluacion = Array.from(latest.keys()).filter((id) => nombrePorId.has(id)).length;

  return {
    totalEmpleados: empleados.length,
    totalConEvaluacion,
    dimensiones,
    dimensionesPorImpacto,
    aspectosDebiles,
    headline,
    sugerencias,
  };
}
