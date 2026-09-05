'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Organization, CategoriaPersonalizada, EscalaPuntuacion } from '@/types/organization';
import { Timestamp } from '@/lib/firestore-compat';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/teamx/org';

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

const DEFAULT_CONFIG = {
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
} as Organization['configuracion'];

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadOrganization(): Promise<Organization | null> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const orgId = await getActiveOrgId();
    if (!orgId) return null;

    const { data: org } = await supabase
      .from('organizaciones')
      .select('nombre, logo_url')
      .eq('id', orgId)
      .maybeSingle();

    let { data: cfg } = await supabase
      .from('teamx_config')
      .select('*')
      .eq('organizacion_id', orgId)
      .maybeSingle();

    if (!cfg) {
      const { data: created } = await supabase
        .from('teamx_config')
        .insert({ organizacion_id: orgId, configuracion: DEFAULT_CONFIG })
        .select('*')
        .single();
      cfg = created;
    }

    return {
      id: orgId,
      nombre: org?.nombre ?? 'Mi Organización',
      logo: org?.logo_url ?? undefined,
      plan: 'pro',
      configuracion: cfg?.configuracion ?? DEFAULT_CONFIG,
      createdAt: Timestamp.fromISO(cfg?.created_at) ?? Timestamp.now(),
      updatedAt: Timestamp.fromISO(cfg?.updated_at) ?? Timestamp.now(),
    } as Organization;
  }

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const run = async () => {
      try {
        const org = await loadOrganization();
        if (mounted) {
          setOrganization(org);
          setLoading(false);
        }
      } catch (error) {
        console.error('[Organization] Error:', error);
        if (mounted) {
          setOrganization(null);
          setLoading(false);
        }
      }
    };
    run();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => run());

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCategoriasByTipo = (_tipo: string): CategoriaPersonalizada[] =>
    Object.values(organization?.configuracion.categorias || {})
      .filter((cat) => cat.activa)
      .sort((a, b) => a.posicion - b.posicion);

  const getTiposCategorias = (): string[] =>
    Object.values(organization?.configuracion.categorias || {})
      .filter((cat) => cat.activa)
      .map((cat) => cat.nombre);

  const getNombreEmpleado = () => organization?.configuracion.nombreEmpleado || 'Empleado';
  const getNombreCoach = () => organization?.configuracion.nombreCoach || 'Coach';
  const getNombrePuesto = () => organization?.configuracion.nombrePuesto || 'Puesto';
  const getNombreDepartamento = () => organization?.configuracion.nombreDepartamento || 'Departamento';
  const getEscalaPuntuacion = () =>
    organization?.configuracion.escalaPuntuacion || DEFAULT_CONFIG.escalaPuntuacion;

  const refreshOrganization = async () => {
    setLoading(true);
    try {
      const org = await loadOrganization();
      setOrganization(org);
    } finally {
      setLoading(false);
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
