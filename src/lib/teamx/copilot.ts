// Helpers del Copiloto de Coaching IA (TEAMx).
// Construye el contexto que se envía al modelo a partir de una evaluación,
// y expone el fetcher que usa la página cliente para llamar a la API route.

import { Evaluacion, VALOR_MAX, pctDimension } from '@/types/teamx';

/** Resumen de desempeño por dimensión, listo para mandar al modelo. */
export interface CopilotDimensionContexto {
  nombre: string;
  pct: number | null;
}

/** Un aspecto puntual con desempeño bajo. */
export interface CopilotAspectoDebil {
  nombre: string;
  dimension: string;
  pct: number;
}

/** Contexto de la evaluación que arma la página y consume la API route. */
export interface CopilotContexto {
  promedioGeneral: number | null;
  semana: number | null;
  fecha: string;
  dimensiones: CopilotDimensionContexto[];
  aspectosDebiles: CopilotAspectoDebil[];
  tendencia: string;
}

/** Respuesta del copiloto: preguntas poderosas, observaciones y plan de acción. */
export interface CopilotResponse {
  preguntas: string[];
  observaciones: string[];
  plan: string[];
}

/** Cuántos aspectos débiles como máximo se incluyen en el contexto enviado al modelo. */
const MAX_ASPECTOS_DEBILES = 5;

/** Arma el contexto de coaching (dimensiones, aspectos débiles, tendencia) desde una evaluación. */
export function buildCopilotContexto(ev: Evaluacion): CopilotContexto {
  const dimsCompetencia = (ev.configSnapshot?.dimensiones ?? []).filter(
    (d) => d.naturaleza === 'competencia'
  );

  const dimensiones: CopilotDimensionContexto[] = dimsCompetencia.map((d) => ({
    nombre: d.nombre,
    pct: pctDimension(d, ev.respuestas),
  }));

  const aspectos: CopilotAspectoDebil[] = [];
  for (const d of dimsCompetencia) {
    for (const a of d.aspectos) {
      const r = ev.respuestas[a.id];
      if (!r || r.na || r.valor === null || r.valor === undefined) continue;
      aspectos.push({
        nombre: a.nombre,
        dimension: d.nombre,
        pct: Math.round((r.valor / VALOR_MAX) * 100),
      });
    }
  }
  const aspectosDebiles = aspectos.sort((a, b) => a.pct - b.pct).slice(0, MAX_ASPECTOS_DEBILES);

  const cambios = Object.values(ev.resumen ?? {})
    .map((r) => r?.cambio)
    .filter((c): c is number => c !== null && c !== undefined);

  let tendencia = 'Sin comparación previa (primera evaluación del ciclo para este colaborador).';
  if (cambios.length > 0) {
    const avg = cambios.reduce((s, c) => s + c, 0) / cambios.length;
    if (avg > 2) tendencia = `En mejora (promedio +${Math.round(avg)}% vs. la evaluación anterior).`;
    else if (avg < -2) tendencia = `En descenso (promedio ${Math.round(avg)}% vs. la evaluación anterior).`;
    else tendencia = 'Estable respecto a la evaluación anterior.';
  }

  return {
    promedioGeneral: ev.promedioGeneral ?? null,
    semana: ev.semana ?? null,
    fecha: ev.fecha,
    dimensiones,
    aspectosDebiles,
    tendencia,
  };
}

/** Llama a la API route del copiloto y devuelve el resultado, o lanza con un mensaje amable. */
export async function generarCopiloto(
  empleadoNombre: string,
  contexto: CopilotContexto
): Promise<CopilotResponse> {
  const res = await fetch('/api/teamx/copilot', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ empleadoNombre, contexto }),
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    throw new Error('No se pudo interpretar la respuesta del copiloto. Intenta de nuevo.');
  }

  if (json?.error) {
    throw new Error(json.error as string);
  }
  if (!Array.isArray(json?.preguntas) || !Array.isArray(json?.observaciones) || !Array.isArray(json?.plan)) {
    throw new Error('El copiloto devolvió una respuesta inesperada. Intenta de nuevo.');
  }

  return json as CopilotResponse;
}
