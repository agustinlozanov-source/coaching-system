'use client';

import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  format,
  differenceInDays,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { getEvaluaciones, getEvaluacionesByEmpleado } from './useEvaluaciones';
import { getEmpleados } from './useEmpleados';
import type { Evaluacion } from '@/types/evaluacion';
import type { Empleado } from '@/types/empleado';
import type {
  ReporteData,
  ReporteEmpleado,
  ReporteTrimestral,
  TendenciaSemanal,
  EstadisticasGenerales,
  TopPerformer,
  NecesitaAtencion,
} from '@/types/reporte';

/**
 * Obtiene reporte de ejecutivos
 */
export async function getReporteEjecutivos(): Promise<ReporteData> {
  try {
    const empleados = await getEmpleados();
    const ejecutivos = empleados.filter((e) => e.tipoPuesto === 'ejecutivo');
    return await generarReporte(ejecutivos);
  } catch (error) {
    console.error('Error al obtener reporte de ejecutivos:', error);
    throw error;
  }
}

/**
 * Obtiene reporte de telemarketing
 */
export async function getReporteTelemarketing(): Promise<ReporteData> {
  try {
    const empleados = await getEmpleados();
    const telemarketing = empleados.filter((e) => e.tipoPuesto === 'telemarketing');
    return await generarReporte(telemarketing);
  } catch (error) {
    console.error('Error al obtener reporte de telemarketing:', error);
    throw error;
  }
}

/**
 * Obtiene reporte de asesores
 */
export async function getReporteAsesores(): Promise<ReporteData> {
  try {
    const empleados = await getEmpleados();
    const asesores = empleados.filter((e) => e.tipoPuesto === 'asesor');
    return await generarReporte(asesores);
  } catch (error) {
    console.error('Error al obtener reporte de asesores:', error);
    throw error;
  }
}

/**
 * Genera reporte para un grupo de empleados
 */
async function generarReporte(empleados: Empleado[]): Promise<ReporteData> {
  const reporteEmpleados: ReporteEmpleado[] = [];
  const areasMap = new Map<string, number>();
  let sumaEfectividad = 0;
  let evaluados = 0;

  for (const empleado of empleados) {
    try {
      const evaluaciones = await getEvaluacionesByEmpleado(empleado.id);
      const ultimaEvaluacion = evaluaciones[0] || null;

      const reporteEmp: ReporteEmpleado = {
        ...empleado,
        ultimaEvaluacion: ultimaEvaluacion || undefined,
        efectividadUltima: ultimaEvaluacion?.efectividad || undefined,
      };

      if (ultimaEvaluacion) {
        reporteEmp.diasSinEvaluar = differenceInDays(new Date(), ultimaEvaluacion.fecha.toDate());
        sumaEfectividad += ultimaEvaluacion.efectividad;
        evaluados++;

        // Contar áreas comunes
        ultimaEvaluacion.areasOportunidad?.forEach((area) => {
          areasMap.set(area, (areasMap.get(area) || 0) + 1);
        });
      }

      reporteEmpleados.push(reporteEmp);
    } catch (error) {
      console.error(`Error procesando empleado ${empleado.id}:`, error);
    }
  }

  const areasComunes = Array.from(areasMap.entries())
    .map(([area, frecuencia]) => ({ area, frecuencia }))
    .sort((a, b) => b.frecuencia - a.frecuencia)
    .slice(0, 5);

  return {
    empleados: reporteEmpleados,
    promedioEfectividad: evaluados > 0 ? sumaEfectividad / evaluados : 0,
    evaluados,
    total: empleados.length,
    areasComunes,
  };
}

/**
 * Obtiene reporte trimestral
 */
export async function getReporteTrimestral(
  startDate: Date,
  endDate: Date
): Promise<ReporteTrimestral> {
  try {
    const todasLasEvaluaciones = await getEvaluaciones();
    const evaluacionesEnRango = todasLasEvaluaciones.filter((e) =>
      isWithinInterval(e.fecha.toDate(), { start: startDate, end: endDate })
    );

    // Generar tendencia semanal
    const tendenciaSemanal = generarTendenciaSemanal(evaluacionesEnRango, startDate, endDate);

    // Identificar top performers
    const topPerformers = identificarTopPerformers(evaluacionesEnRango);

    // Identificar empleados que necesitan atención
    const necesitanAtencion = await identificarNecesitanAtencion(
      evaluacionesEnRango,
      startDate
    );

    return {
      evaluaciones: evaluacionesEnRango,
      tendenciaSemanal,
      topPerformers,
      necesitanAtencion,
      periodo: { inicio: startDate, fin: endDate },
    };
  } catch (error) {
    console.error('Error al obtener reporte trimestral:', error);
    throw error;
  }
}

/**
 * Genera tendencia semanal
 */
function generarTendenciaSemanal(
  evaluaciones: Evaluacion[],
  startDate: Date,
  endDate: Date
): TendenciaSemanal[] {
  const semanas = new Map<string, { efectividades: number[]; count: number }>();
  let currentWeekStart = startOfWeek(startDate);

  while (currentWeekStart <= endDate) {
    const currentWeekEnd = endOfWeek(currentWeekStart);
    const semanaKey = format(currentWeekStart, 'yyyy-ww', { locale: es });

    const evaluacionesSemana = evaluaciones.filter((e) =>
      isWithinInterval(e.fecha.toDate(), { start: currentWeekStart, end: currentWeekEnd })
    );

    if (evaluacionesSemana.length > 0) {
      const efectividades = evaluacionesSemana.map((e) => e.efectividad);
      const promedio = efectividades.reduce((a, b) => a + b, 0) / efectividades.length;

      semanas.set(semanaKey, {
        efectividades,
        count: evaluacionesSemana.length,
      });
    }

    currentWeekStart = new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  return Array.from(semanas.entries()).map(([semanaKey, data]) => ({
    semana: semanaKey,
    efectividadPromedio: data.efectividades.reduce((a, b) => a + b, 0) / data.efectividades.length,
    evaluacionesRealizadas: data.count,
    startDate: startOfWeek(new Date()),
    endDate: endOfWeek(new Date()),
  }));
}

/**
 * Identifica top performers
 */
function identificarTopPerformers(evaluaciones: Evaluacion[]): TopPerformer[] {
  const empleadosMap = new Map<string, { efectividades: number[]; ultimaEval: Evaluacion }>();

  evaluaciones.forEach((e) => {
    const emp = empleadosMap.get(e.empleadoId);
    if (!emp) {
      empleadosMap.set(e.empleadoId, {
        efectividades: [e.efectividad],
        ultimaEval: e,
      });
    } else {
      emp.efectividades.push(e.efectividad);
      if (e.fecha > emp.ultimaEval.fecha) {
        emp.ultimaEval = e;
      }
    }
  });

  return Array.from(empleadosMap.entries())
    .map(([empleadoId, data]) => ({
      empleado: {
        id: empleadoId,
        nombre: data.ultimaEval.empleadoNombre,
      } as Empleado,
      efectividadPromedio: data.efectividades.reduce((a, b) => a + b, 0) / data.efectividades.length,
      ultimaEvaluacion: data.ultimaEval,
    }))
    .sort((a, b) => b.efectividadPromedio - a.efectividadPromedio)
    .slice(0, 10);
}

/**
 * Identifica empleados que necesitan atención
 */
async function identificarNecesitanAtencion(
  evaluaciones: Evaluacion[],
  periodStart: Date
): Promise<NecesitaAtencion[]> {
  const empleadosMap = new Map<string, { efectividades: number[]; ultimaEval: Evaluacion }>();

  evaluaciones.forEach((e) => {
    const emp = empleadosMap.get(e.empleadoId);
    if (!emp) {
      empleadosMap.set(e.empleadoId, {
        efectividades: [e.efectividad],
        ultimaEval: e,
      });
    } else {
      emp.efectividades.push(e.efectividad);
      if (e.fecha > emp.ultimaEval.fecha) {
        emp.ultimaEval = e;
      }
    }
  });

  return Array.from(empleadosMap.entries())
    .map(([empleadoId, data]) => {
      const promedio = data.efectividades.reduce((a, b) => a + b, 0) / data.efectividades.length;
      const diasSinEvaluar = differenceInDays(new Date(), data.ultimaEval.fecha.toDate());

      return {
        empleado: {
          id: empleadoId,
          nombre: data.ultimaEval.empleadoNombre,
        } as Empleado,
        efectividadPromedio: promedio,
        ultimaEvaluacion: data.ultimaEval,
        razon: promedio < 3 ? 'baja_efectividad' : 'sin_evaluar_recientemente',
      };
    })
    .filter((e) => e.efectividadPromedio < 3 || differenceInDays(new Date(), e.ultimaEvaluacion.fecha.toDate()) > 30)
    .sort((a, b) => a.efectividadPromedio - b.efectividadPromedio)
    .slice(0, 10);
}

/**
 * Obtiene estadísticas generales
 */
export async function getEstadisticasGenerales(): Promise<EstadisticasGenerales> {
  try {
    const empleados = await getEmpleados();
    const evaluaciones = await getEvaluaciones();

    // Evaluaciones este mes
    const ahora = new Date();
    const inicioMes = startOfMonth(ahora);
    const finMes = endOfMonth(ahora);

    const evaluacionesEsteMes = evaluaciones.filter((e) =>
      isWithinInterval(e.fecha.toDate(), { start: inicioMes, end: finMes })
    );

    // Evaluaciones última semana
    const inicioSemana = startOfWeek(ahora);
    const finSemana = endOfWeek(ahora);

    const evaluacionesUltimaSemana = evaluaciones.filter((e) =>
      isWithinInterval(e.fecha.toDate(), { start: inicioSemana, end: finSemana })
    );

    // Borradores pendientes
    const borradores = evaluaciones.filter((e) => e.status === 'borrador').length;

    // Empleados sin evaluar en 30+ días
    const sinEvaluarDias30: ReporteEmpleado[] = [];
    for (const empleado of empleados) {
      const evaluacionesEmp = evaluaciones.filter((e) => e.empleadoId === empleado.id);
      if (evaluacionesEmp.length === 0) {
        sinEvaluarDias30.push(empleado as ReporteEmpleado);
      } else {
        const ultimaEval = evaluacionesEmp[0];
        const diasSinEvaluar = differenceInDays(new Date(), ultimaEval.fecha.toDate());
        if (diasSinEvaluar > 30) {
          sinEvaluarDias30.push({
            ...empleado,
            diasSinEvaluar,
            ultimaEvaluacion: ultimaEval,
          });
        }
      }
    }

    // Efectividad promedio global
    const efectividadPromediaGlobal =
      evaluacionesEsteMes.length > 0
        ? evaluacionesEsteMes.reduce((sum, e) => sum + e.efectividad, 0) / evaluacionesEsteMes.length
        : 0;

    return {
      totalEmpleados: empleados.length,
      evaluacionesEsteMes: evaluacionesEsteMes.length,
      efectividadPromediaGlobal: Math.round(efectividadPromediaGlobal * 100) / 100,
      borradores,
      sinEvaluarDias30,
      evaluacionesUltimaSemana: evaluacionesUltimaSemana.length,
    };
  } catch (error) {
    console.error('Error al obtener estadísticas generales:', error);
    throw error;
  }
}

/**
 * Custom hook para acceder a las funciones de reportes
 */
export function useReportes() {
  return {
    getReporteEjecutivos,
    getReporteTelemarketing,
    getReporteAsesores,
    getReporteTrimestral,
    getEstadisticasGenerales,
  };
}
