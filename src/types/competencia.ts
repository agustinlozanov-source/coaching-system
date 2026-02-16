import { Timestamp } from 'firebase/firestore';

export interface SeccionCompetencias {
  id: string;
  organizationId: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  activo: boolean;
  competencias: CompetenciaConfig[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CompetenciaConfig {
  id: string;
  nombre: string;
  descripcion?: string;
  requerida: boolean;
  orden: number;
  activo: boolean;
  aplicaA?: AplicacionCompetencia;
}

export interface AplicacionCompetencia {
  categorias?: Record<string, string[]>; // Ej: { "puesto": ["Ejecutivo", "Gerente"] }
  departamentos?: string[];
}
