import { Timestamp } from 'firebase/firestore';

export type EscalaEvaluacion = 1 | 2 | 3 | 4 | 5;

export interface ItemEvaluacion {
  competencia: string;
  puntuacion: EscalaEvaluacion;
  observaciones?: string;
}

export interface SeccionEvaluacion {
  items: ItemEvaluacion[];
  promedio: number;
}

export interface Evaluacion {
  id: string;
  organizationId: string;
  empleadoId: string;
  empleadoNombre: string;
  coachId: string;
  coachNombre: string;
  fecha: Timestamp;
  status: 'borrador' | 'finalizada';
  secciones: {
    planeacionOrganizacion: SeccionEvaluacion;
    noNegociables: SeccionEvaluacion;
    usoSistemas: SeccionEvaluacion;
    conocimientoProducto: SeccionEvaluacion;
  };
  promedioGeneral: number;
  efectividad: number;
  areasOportunidad: string[];
  fortalezas: string[];
  observacionesGenerales?: string;
  compromisos: string[];
  proximaRevision?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface EvaluacionFormData {
  fecha: Date;
  secciones: {
    planeacionOrganizacion: ItemEvaluacion[];
    noNegociables: ItemEvaluacion[];
    usoSistemas: ItemEvaluacion[];
    conocimientoProducto: ItemEvaluacion[];
  };
  observacionesGenerales?: string;
  compromisos: string[];
  proximaRevision?: Date;
}
