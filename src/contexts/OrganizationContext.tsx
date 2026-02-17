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
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const createDefaultOrganization = async (orgId: string) => {
      try {
        console.log('[Organization] Creating default organization:', orgId);
        const now = Timestamp.now();
        const defaultOrg = {
          nombre: 'Mi Organización',
          plan: 'free',
          configuracion: {
            nombreEmpleado: 'Empleado',
            nombreCoach: 'Coach',
            nombrePuesto: 'Puesto',
            nombreDepartamento: 'Departamento',
            categorias: {
              '1': { id: '1', nombre: 'Ejecutivo', color: '#3B82F6', posicion: 1, activa: true },
              '2': { id: '2', nombre: 'Telemarketing', color: '#10B981', posicion: 2, activa: true },
              '3': { id: '3', nombre: 'Asesor', color: '#F59E0B', posicion: 3, activa: true },
            },
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
        console.log('[Organization] Default organization created successfully');
      } catch (error) {
        console.error('[Organization] Error creating default organization:', error);
        throw error;
      }
    };

    const loadOrganization = async (orgId: string): Promise<void> => {
      try {
        console.log('[Organization] Loading organization:', orgId);
        const docRef = doc(db, 'organizations', orgId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          console.log('[Organization] Found organization:', docSnap.data());
          if (isMounted) {
            setOrganization({ id: docSnap.id, ...docSnap.data() } as Organization);
            setLoading(false);
          }
        } else {
          console.log('[Organization] Organization does not exist, creating default...');
          await createDefaultOrganization(orgId);
          if (isMounted) {
            await loadOrganization(orgId);
          }
        }
      } catch (error) {
        console.error('[Organization] Error loading organization:', error);
        if (isMounted) {
          setOrganization(null);
          setLoading(false);
        }
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;

      try {
        if (user) {
          console.log('[Organization] User authenticated:', user.uid);
        } else {
          console.log('[Organization] No user authenticated');
        }
        
        await loadOrganization('org-default');
      } catch (error) {
        console.error('[Organization] Error in auth state change:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    // Safety timeout
    timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('[Organization] Loading timeout - force completing');
        setLoading(false);
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const getCategoriasByTipo = (tipo: string): CategoriaPersonalizada[] => {
    return (
      Object.values(organization?.configuracion.categorias || {})
        .filter((cat) => cat.activa)
        .sort((a, b) => a.posicion - b.posicion) || []
    );
  };

  const getTiposCategorias = (): string[] => {
    const categorias = Object.values(organization?.configuracion.categorias || {})
      .filter((cat) => cat.activa)
      .map((cat) => cat.nombre);
    return categorias;
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
      setLoading(true);
      try {
        const docRef = doc(db, 'organizations', organization.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setOrganization({ id: docSnap.id, ...docSnap.data() } as Organization);
        }
      } catch (error) {
        console.error('[Organization] Error refreshing organization:', error);
      } finally {
        setLoading(false);
      }
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
