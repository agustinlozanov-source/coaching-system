import { Timestamp } from 'firebase/firestore';

export interface Empleado {
  id: string;
  organizationId: string;
  consecutivo: number;
  nombre: string;
  cargo: string;
  // CAMBIO PRINCIPAL: reemplazar tipoPuesto por categorias
  categorias: Record<string, string>; // Ej: { "puesto": "Ejecutivo", "nivel": "Senior" }
  departamentoId?: string;
  coachAsignado?: string;
  email?: string;
  telefono?: string;
  photoURL?: string;
  fechaIngreso: Timestamp;
  activo: boolean;
  customFields?: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface EmpleadoFormData {
  nombre: string;
  cargo: string;
  categorias: Record<string, string>;
  departamentoId?: string;
  fechaIngreso: Date;
  activo: boolean;
  coachAsignado?: string;
  email?: string;
  telefono?: string;
  customFields?: Record<string, any>;
}
