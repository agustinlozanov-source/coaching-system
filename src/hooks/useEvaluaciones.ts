'use client';

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { Evaluacion, EvaluacionFormData } from '@/types/evaluacion';
import {
  calcularPromedioSeccion,
  calcularEfectividad,
  identificarAreasOportunidad,
  identificarFortalezas,
} from '@/lib/utils/calculations';

/**
 * Obtiene todas las evaluaciones ordenadas por fecha descendente
 */
export async function getEvaluaciones(): Promise<Evaluacion[]> {
  try {
    const q = query(
      collection(db, 'evaluaciones'),
      orderBy('fecha', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const evaluaciones: Evaluacion[] = [];
    querySnapshot.forEach((doc) => {
      evaluaciones.push({ id: doc.id, ...doc.data() } as Evaluacion);
    });
    return evaluaciones;
  } catch (error) {
    console.error('Error al obtener evaluaciones:', error);
    throw error;
  }
}

/**
 * Obtiene evaluaciones de un empleado específico
 */
export async function getEvaluacionesByEmpleado(
  empleadoId: string
): Promise<Evaluacion[]> {
  try {
    const q = query(
      collection(db, 'evaluaciones'),
      where('empleadoId', '==', empleadoId)
    );
    const querySnapshot = await getDocs(q);
    const evaluaciones: Evaluacion[] = [];
    querySnapshot.forEach((doc) => {
      evaluaciones.push({ id: doc.id, ...doc.data() } as Evaluacion);
    });
    // Ordenar en memoria en lugar de en la BD (evita necesidad de índice compuesto)
    evaluaciones.sort((a, b) => {
      const fechaA = a.fecha instanceof Object && 'toDate' in a.fecha 
        ? a.fecha.toDate().getTime()
        : new Date(a.fecha).getTime();
      const fechaB = b.fecha instanceof Object && 'toDate' in b.fecha 
        ? b.fecha.toDate().getTime()
        : new Date(b.fecha).getTime();
      return fechaB - fechaA; // Descendente (más reciente primero)
    });
    return evaluaciones;
  } catch (error) {
    console.error('Error al obtener evaluaciones del empleado:', error);
    throw error;
  }
}

/**
 * Obtiene una evaluación por ID
 */
export async function getEvaluacionById(id: string): Promise<Evaluacion | null> {
  try {
    const docRef = doc(db, 'evaluaciones', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Evaluacion;
    }
    return null;
  } catch (error) {
    console.error('Error al obtener evaluación:', error);
    throw error;
  }
}

/**
 * Calcula los promedios y métricas de una evaluación
 */
function calcularMetricasEvaluacion(data: EvaluacionFormData) {
  // Calcular promedio de cada sección
  const seccionesConPromedio = {
    planeacionOrganizacion: {
      items: data.secciones.planeacionOrganizacion,
      promedio: calcularPromedioSeccion(
        data.secciones.planeacionOrganizacion.map((i) => i.puntuacion)
      ),
    },
    noNegociables: {
      items: data.secciones.noNegociables,
      promedio: calcularPromedioSeccion(
        data.secciones.noNegociables.map((i) => i.puntuacion)
      ),
    },
    usoSistemas: {
      items: data.secciones.usoSistemas,
      promedio: calcularPromedioSeccion(
        data.secciones.usoSistemas.map((i) => i.puntuacion)
      ),
    },
    conocimientoProducto: {
      items: data.secciones.conocimientoProducto,
      promedio: calcularPromedioSeccion(
        data.secciones.conocimientoProducto.map((i) => i.puntuacion)
      ),
    },
  };

  // Calcular promedio general
  const promedios = Object.values(seccionesConPromedio).map((s) => s.promedio);
  const promedioGeneral = promedios.reduce((a, b) => a + b, 0) / promedios.length;

  // Calcular efectividad
  const efectividad = calcularEfectividad(promedioGeneral);

  // Identificar áreas de oportunidad y fortalezas
  const areasOportunidad = identificarAreasOportunidad(seccionesConPromedio);
  const fortalezas = identificarFortalezas(seccionesConPromedio);

  return {
    secciones: seccionesConPromedio,
    promedioGeneral: Math.round(promedioGeneral * 100) / 100,
    efectividad,
    areasOportunidad,
    fortalezas,
  };
}

/**
 * Crea una evaluación nueva
 */
export async function createEvaluacion(
  empleadoId: string,
  empleadoNombre: string,
  data: EvaluacionFormData
): Promise<string> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No hay usuario autenticado');
    }

    const metricas = calcularMetricasEvaluacion(data);
    const now = Timestamp.now();

    const newEvaluacion = {
      organizationId: 'org-default',
      empleadoId,
      empleadoNombre,
      coachId: user.uid,
      coachNombre: user.displayName || user.email,
      fecha: Timestamp.fromDate(data.fecha),
      status: 'finalizada' as const,
      secciones: metricas.secciones,
      promedioGeneral: metricas.promedioGeneral,
      efectividad: metricas.efectividad,
      areasOportunidad: metricas.areasOportunidad,
      fortalezas: metricas.fortalezas,
      observacionesGenerales: data.observacionesGenerales || null,
      compromisos: data.compromisos || [],
      proximaRevision: data.proximaRevision
        ? Timestamp.fromDate(data.proximaRevision)
        : null,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, 'evaluaciones'), newEvaluacion);
    return docRef.id;
  } catch (error) {
    console.error('Error al crear evaluación:', error);
    throw error;
  }
}

/**
 * Actualiza una evaluación recalculando todas las métricas
 */
export async function updateEvaluacion(
  id: string,
  data: Partial<EvaluacionFormData>
): Promise<void> {
  try {
    // Si hay datos de secciones, recalcular métricas
    let updateData: any = { ...data };

    if (data.secciones) {
      const metricas = calcularMetricasEvaluacion(data as EvaluacionFormData);
      updateData = {
        ...updateData,
        secciones: metricas.secciones,
        promedioGeneral: metricas.promedioGeneral,
        efectividad: metricas.efectividad,
        areasOportunidad: metricas.areasOportunidad,
        fortalezas: metricas.fortalezas,
      };
    }

    // Convertir fecha a Timestamp si existe
    if (data.fecha) {
      updateData.fecha = Timestamp.fromDate(data.fecha);
    }

    if (data.proximaRevision) {
      updateData.proximaRevision = Timestamp.fromDate(data.proximaRevision);
    }

    // Actualizar updatedAt
    updateData.updatedAt = Timestamp.now();

    const docRef = doc(db, 'evaluaciones', id);
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error al actualizar evaluación:', error);
    throw error;
  }
}

/**
 * Guarda un borrador de evaluación sin validar que esté completo
 */
export async function saveDraft(
  empleadoId: string,
  empleadoNombre: string,
  data: Partial<EvaluacionFormData>
): Promise<string> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No hay usuario autenticado');
    }

    const now = Timestamp.now();

    const newDraft = {
      organizationId: 'org-default',
      empleadoId,
      empleadoNombre,
      coachId: user.uid,
      coachNombre: user.displayName || user.email,
      fecha: data.fecha ? Timestamp.fromDate(data.fecha) : now,
      status: 'borrador' as const,
      secciones: {
        planeacionOrganizacion: {
          items: data.secciones?.planeacionOrganizacion || [],
          promedio: 0,
        },
        noNegociables: {
          items: data.secciones?.noNegociables || [],
          promedio: 0,
        },
        usoSistemas: {
          items: data.secciones?.usoSistemas || [],
          promedio: 0,
        },
        conocimientoProducto: {
          items: data.secciones?.conocimientoProducto || [],
          promedio: 0,
        },
      },
      promedioGeneral: 0,
      efectividad: 0,
      areasOportunidad: [],
      fortalezas: [],
      observacionesGenerales: data.observacionesGenerales || null,
      compromisos: data.compromisos || [],
      proximaRevision: data.proximaRevision
        ? Timestamp.fromDate(data.proximaRevision)
        : null,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, 'evaluaciones'), newDraft);
    return docRef.id;
  } catch (error) {
    console.error('Error al guardar borrador:', error);
    throw error;
  }
}

/**
 * Custom hook para acceder a las funciones de evaluaciones
 */
export function useEvaluaciones() {
  return {
    getEvaluaciones,
    getEvaluacionesByEmpleado,
    getEvaluacionById,
    createEvaluacion,
    updateEvaluacion,
    saveDraft,
  };
}
