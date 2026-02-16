import { Timestamp } from 'firebase/firestore';

export type TipoPuesto = 'ejecutivo' | 'telemarketing' | 'asesor';

export interface Empleado {
  id: string;
  organizationId: string;
  consecutivo: number;
  nombre: string;
  cargo: string;
  tipoPuesto: TipoPuesto;
  fechaIngreso: Timestamp;
  activo: boolean;
  coachAsignado?: string;
  email?: string;
  telefono?: string;
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface EmpleadoFormData {
  nombre: string;
  cargo: string;
  tipoPuesto: TipoPuesto;
  fechaIngreso: Date;
  activo: boolean;
  coachAsignado?: string;
  email?: string;
  telefono?: string;
}
