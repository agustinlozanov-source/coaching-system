import { Evaluacion } from './evaluacion';
import { Empleado } from './empleado';

export interface ReporteEmpleado extends Empleado {
  ultimaEvaluacion?: Evaluacion;
  efectividadUltima?: number;
  diasSinEvaluar?: number;
}

export interface ReporteData {
  empleados: ReporteEmpleado[];
  promedioEfectividad: number;
  evaluados: number;
  total: number;
  areasComunes: Array<{
    area: string;
    frecuencia: number;
  }>;
}

export interface TendenciaSemanal {
  semana: string;
  efectividadPromedio: number;
  evaluacionesRealizadas: number;
  startDate: Date;
  endDate: Date;
}

export interface TopPerformer {
  empleado: Empleado;
  efectividadPromedio: number;
  ultimaEvaluacion: Evaluacion;
}

export interface NecesitaAtencion {
  empleado: Empleado;
  efectividadPromedio: number;
  ultimaEvaluacion: Evaluacion;
  razon: string; // 'baja_efectividad' | 'sin_evaluar_recientemente'
}

export interface ReporteTrimestral {
  evaluaciones: Evaluacion[];
  tendenciaSemanal: TendenciaSemanal[];
  topPerformers: TopPerformer[];
  necesitanAtencion: NecesitaAtencion[];
  periodo: {
    inicio: Date;
    fin: Date;
  };
}

export interface EstadisticasGenerales {
  totalEmpleados: number;
  evaluacionesEsteMes: number;
  efectividadPromediaGlobal: number;
  borradores: number;
  sinEvaluarDias30: ReporteEmpleado[];
  evaluacionesUltimaSemana: number;
}
