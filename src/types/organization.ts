import { Timestamp } from 'firebase/firestore';

export interface Organization {
  id: string;
  nombre: string;
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
  categoriasPersonalizadas: CategoriaPersonalizada[];
  escalaPuntuacion: EscalaPuntuacion;
}

export interface CategoriaPersonalizada {
  id: string;
  nombre: string; // "Ejecutivo", "Vendedor", etc.
  tipo: string; // "puesto", "nivel", "turno", "area" - totalmente personalizable
  activo: boolean;
  color?: string;
  orden: number;
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
