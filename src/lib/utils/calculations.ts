import { Timestamp } from 'firebase/firestore';
import { differenceInDays, differenceInWeeks } from 'date-fns';

export function calcularDiasAntiguedad(fechaIngreso: Timestamp | Date): number {
  const fecha = fechaIngreso instanceof Timestamp ? fechaIngreso.toDate() : fechaIngreso;
  return differenceInDays(new Date(), fecha);
}

export function calcularSemanasAntiguedad(fechaIngreso: Timestamp | Date): number {
  const fecha = fechaIngreso instanceof Timestamp ? fechaIngreso.toDate() : fechaIngreso;
  return differenceInWeeks(new Date(), fecha);
}

export function calcularPromedioSeccion(puntuaciones: number[]): number {
  if (puntuaciones.length === 0) return 0;
  
  // Filtrar puntuaciones "No Aplica" (5)
  const puntuacionesValidas = puntuaciones.filter(p => p !== 5);
  
  if (puntuacionesValidas.length === 0) return 0;
  
  const suma = puntuacionesValidas.reduce((acc, val) => acc + val, 0);
  return suma / puntuacionesValidas.length;
}

export function calcularEfectividad(promedioGeneral: number): number {
  // Convertir escala 1-4 a porcentaje
  // 1 (Evidente) = 100%
  // 2 (En Desarrollo) = 75%
  // 3 (Por Desarrollar) = 50%
  // 4 (Sin Evidencia) = 25%
  
  const porcentajePorPuntuacion = {
    1: 100,
    2: 75,
    3: 50,
    4: 25,
  };
  
  // Invertir la escala (menor puntuación = mayor efectividad)
  const puntuacionInvertida = 5 - promedioGeneral;
  const porcentaje = (puntuacionInvertida / 4) * 100;
  
  return Math.round(porcentaje);
}

export function identificarAreasOportunidad(
  secciones: Record<string, { items: Array<{ competencia: string; puntuacion: number }> }>
): string[] {
  const areas: string[] = [];
  
  Object.values(secciones).forEach(seccion => {
    seccion.items.forEach(item => {
      // Puntuaciones 3 y 4 son áreas de oportunidad
      if (item.puntuacion >= 3 && item.puntuacion !== 5) {
        areas.push(item.competencia);
      }
    });
  });
  
  return areas;
}

export function identificarFortalezas(
  secciones: Record<string, { items: Array<{ competencia: string; puntuacion: number }> }>
): string[] {
  const fortalezas: string[] = [];
  
  Object.values(secciones).forEach(seccion => {
    seccion.items.forEach(item => {
      // Puntuación 1 son fortalezas
      if (item.puntuacion === 1) {
        fortalezas.push(item.competencia);
      }
    });
  });
  
  return fortalezas;
}
