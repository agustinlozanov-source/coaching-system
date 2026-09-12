import { dimensiones as calcDims } from './calculo';
import { BANCO_N1 } from './preguntas';
import { DIMENSIONES, VALOR_MAX, type Respuesta } from '@/types/scanx';
import type { Participante } from './participantes';

export type Congruencia = {
  general: number | null; // 0-100
  porDimension: { id: string; nombre: string; indice: number | null }[];
};

/** Índice de congruencia: qué tan cerca están las percepciones (CEO vs participantes). */
export function calcularCongruencia(ceoResp: Respuesta[], participantes: Participante[]): Congruencia {
  const completos = participantes.filter((p) => p.estado === 'completado' && Object.keys(p.respuestas ?? {}).length);
  const ceoDims = calcDims(ceoResp, BANCO_N1);

  // Radar de cada participante
  const partDims = completos.map((p) => {
    const resp: Respuesta[] = Object.entries(p.respuestas).map(([preguntaId, opcionId]) => ({ preguntaId, opcionId }));
    return calcDims(resp, BANCO_N1);
  });

  const porDimension = DIMENSIONES.map((d) => {
    const ceo = ceoDims.find((x) => x.id === d.id)?.valor;
    if (ceo == null || !partDims.length) return { id: d.id, nombre: d.nombre, indice: null };
    const vals = partDims.map((pd) => pd.find((x) => x.id === d.id)?.valor).filter((v): v is number => v != null);
    if (!vals.length) return { id: d.id, nombre: d.nombre, indice: null };
    const prom = vals.reduce((s, v) => s + v, 0) / vals.length;
    const dist = Math.abs(ceo - prom); // 0..4
    const indice = Math.round((1 - dist / VALOR_MAX) * 100);
    return { id: d.id, nombre: d.nombre, indice };
  });

  const validos = porDimension.map((x) => x.indice).filter((v): v is number => v != null);
  const general = validos.length ? Math.round(validos.reduce((s, v) => s + v, 0) / validos.length) : null;
  return { general, porDimension };
}
