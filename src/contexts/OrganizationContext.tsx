'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Organization, CategoriaPersonalizada, EscalaPuntuacion } from '@/types/organization';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

interface OrganizationContextType {
  organization: Organization | null;
  loading: boolean;
  getCategoriasByTipo: (tipo: string) => CategoriaPersonalizada[];
  getTiposCategorias: () => string[];
  getNombreEmpleado: () => string;
  getNombreCoach: () => string;
  getNombrePuesto: () => string;
  getNombreDepartamento: () => string;
  getEscalaPuntuacion: () => EscalaPuntuacion;
  refreshOrganization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Por ahora, usar organizationId fijo 'org-default'
        // En el futuro, obtener del user.organizationId
        await loadOrganization('org-default');
      } else {
        setOrganization(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  async function loadOrganization(orgId: string) {
    try {
      const docRef = doc(db, 'organizations', orgId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setOrganization({ id: docSnap.id, ...docSnap.data() } as Organization);
      } else {
        // Crear organización por defecto si no existe
        await createDefaultOrganization(orgId);
        await loadOrganization(orgId);
      }
    } catch (error) {
      console.error('Error loading organization:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createDefaultOrganization(orgId: string) {
    // Implementar creación de organización default con categorías básicas
    const now = Timestamp.now();
    const defaultOrg = {
      nombre: 'Mi Organización',
      plan: 'free',
      configuracion: {
        nombreEmpleado: 'Empleado',
        nombreCoach: 'Coach',
        nombrePuesto: 'Puesto',
        nombreDepartamento: 'Departamento',
        categoriasPersonalizadas: [
          { id: '1', nombre: 'Ejecutivo', tipo: 'puesto', activo: true, color: '#3B82F6', orden: 1 },
          { id: '2', nombre: 'Telemarketing', tipo: 'puesto', activo: true, color: '#10B981', orden: 2 },
          { id: '3', nombre: 'Asesor', tipo: 'puesto', activo: true, color: '#F59E0B', orden: 3 },
        ],
        escalaPuntuacion: {
          1: 'Evidente',
          2: 'En Desarrollo',
          3: 'Por Desarrollar',
          4: 'Sin Evidencia',
          5: 'No Aplica',
        },
      },
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'organizations', orgId), defaultOrg);
  }

  const getCategoriasByTipo = (tipo: string): CategoriaPersonalizada[] => {
    return (
      organization?.configuracion.categoriasPersonalizadas
        .filter((cat) => cat.tipo === tipo && cat.activo)
        .sort((a, b) => a.orden - b.orden) || []
    );
  };

  const getTiposCategorias = (): string[] => {
    const tipos = new Set(
      organization?.configuracion.categoriasPersonalizadas
        .filter((cat) => cat.activo)
        .map((cat) => cat.tipo) || []
    );
    return Array.from(tipos);
  };

  const getNombreEmpleado = () => organization?.configuracion.nombreEmpleado || 'Empleado';
  const getNombreCoach = () => organization?.configuracion.nombreCoach || 'Coach';
  const getNombrePuesto = () => organization?.configuracion.nombrePuesto || 'Puesto';
  const getNombreDepartamento = () => organization?.configuracion.nombreDepartamento || 'Departamento';
  const getEscalaPuntuacion = () =>
    organization?.configuracion.escalaPuntuacion || {
      1: 'Evidente',
      2: 'En Desarrollo',
      3: 'Por Desarrollar',
      4: 'Sin Evidencia',
      5: 'No Aplica',
    };

  const refreshOrganization = async () => {
    if (organization) {
      await loadOrganization(organization.id);
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        loading,
        getCategoriasByTipo,
        getTiposCategorias,
        getNombreEmpleado,
        getNombreCoach,
        getNombrePuesto,
        getNombreDepartamento,
        getEscalaPuntuacion,
        refreshOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
}
