'use client';

import { createClient } from '@/lib/supabase/client';
import { Timestamp } from '@/lib/firestore-compat';
import { SeccionCompetencias, CompetenciaConfig } from '@/types/competencia';
import { useOrganization } from '@/contexts/OrganizationContext';

const TABLE = 'teamx_secciones_competencias';

function rowToSeccion(row: any): SeccionCompetencias {
  return {
    id: row.id,
    organizationId: row.organizacion_id,
    nombre: row.nombre,
    descripcion: row.descripcion ?? undefined,
    orden: row.orden,
    activo: row.activo,
    competencias: row.competencias ?? [],
    createdAt: Timestamp.fromISO(row.created_at) ?? Timestamp.now(),
    updatedAt: Timestamp.fromISO(row.updated_at) ?? Timestamp.now(),
  };
}

export function useCompetencias() {
  const { organization } = useOrganization();

  async function getSeccionesByOrganization(): Promise<SeccionCompetencias[]> {
    if (!organization) return [];
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('organizacion_id', organization.id)
        .eq('activo', true)
        .order('orden', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        const { getDefaultSecciones } = await import('@/lib/constants/competencias');
        return getDefaultSecciones(organization.id);
      }
      return data.map(rowToSeccion);
    } catch (error) {
      console.error('Error loading secciones:', error);
      const { getDefaultSecciones } = await import('@/lib/constants/competencias');
      return getDefaultSecciones(organization.id);
    }
  }

  function getCompetenciasAplicables(
    seccion: SeccionCompetencias,
    empleadoCategorias: Record<string, string>,
  ): CompetenciaConfig[] {
    return seccion.competencias.filter((comp) => {
      if (!comp.activo) return false;
      if (!comp.aplicaA) return true;

      if (comp.aplicaA.categorias) {
        for (const [tipo, valores] of Object.entries(comp.aplicaA.categorias)) {
          const categoriaEmpleado = empleadoCategorias[tipo];
          if (categoriaEmpleado && valores.includes(categoriaEmpleado)) {
            return true;
          }
        }
        return false;
      }
      return true;
    });
  }

  return {
    getSeccionesByOrganization,
    getCompetenciasAplicables,
  };
}
