'use client';

import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { SeccionCompetencias, CompetenciaConfig } from '@/types/competencia';
import { useOrganization } from '@/contexts/OrganizationContext';

export function useCompetencias() {
  const { organization } = useOrganization();

  async function getSeccionesByOrganization(): Promise<SeccionCompetencias[]> {
    if (!organization) return [];

    try {
      const q = query(
        collection(db, 'secciones_competencias'),
        where('organizationId', '==', organization.id),
        where('activo', '==', true),
        orderBy('orden', 'asc')
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // Si no hay secciones, usar las default
        const { getDefaultSecciones } = await import('@/lib/constants/competencias');
        return getDefaultSecciones(organization.id);
      }

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SeccionCompetencias[];
    } catch (error) {
      console.error('Error loading secciones:', error);
      // Si hay error, devolver las default
      const { getDefaultSecciones } = await import('@/lib/constants/competencias');
      return getDefaultSecciones(organization.id);
    }
  }

  function getCompetenciasAplicables(
    seccion: SeccionCompetencias,
    empleadoCategorias: Record<string, string>
  ): CompetenciaConfig[] {
    return seccion.competencias.filter((comp) => {
      if (!comp.activo) return false;
      if (!comp.aplicaA) return true; // Si no tiene restricciones, aplica a todos

      // Verificar si aplica según categorías del empleado
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
