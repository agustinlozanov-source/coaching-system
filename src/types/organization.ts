import { Timestamp } from 'firebase/firestore';

export interface Organization {
  id: string;
  nombre: string;
  descripcion?: string;
  email?: string;
  telefono?: string;
  logo?: string;
  plan: 'free' | 'pro' | 'enterprise';
  configuracion: OrganizationConfig;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface OrganizationConfig {
  nombreEmpleado: string; // "Empleado", "Colaborador", "Coachee"
  nombreCoach: string; // "Coach", "Supervisor", "Líder"
  nombrePuesto: string; // "Puesto", "Rol", "Cargo"
  nombreDepartamento: string; // "Departamento", "Área", "División"
  categorias: Record<string, CategoriaPersonalizada>; // ID → Categoría
  escalaPuntuacion: EscalaPuntuacion;
  departamentos?: Departamento[];
}

export interface CategoriaPersonalizada {
  id: string;
  nombre: string; // "Ejecutivo", "Vendedor", etc.
  color?: string;
  posicion: number;
  activa: boolean;
}

export interface EscalaPuntuacion {
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
}

export interface Departamento {
  id: string;
  organizationId: string;
  nombre: string;
  descripcion?: string;
  coachPrincipal?: string;
  activo: boolean;
  createdAt: Timestamp;
}
