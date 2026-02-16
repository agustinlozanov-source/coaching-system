'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Empleado, EmpleadoFormData } from '@/types/empleado';

/**
 * Obtiene todos los empleados activos ordenados por nombre
 */
export async function getEmpleados(): Promise<Empleado[]> {
  try {
    const q = query(
      collection(db, 'empleados'),
      where('activo', '==', true),
      orderBy('nombre')
    );
    const querySnapshot = await getDocs(q);
    const empleados: Empleado[] = [];
    querySnapshot.forEach((doc) => {
      empleados.push({ id: doc.id, ...doc.data() } as Empleado);
    });
    return empleados;
  } catch (error) {
    console.error('Error al obtener empleados:', error);
    throw error;
  }
}

/**
 * Obtiene un empleado por ID
 */
export async function getEmpleadoById(id: string): Promise<Empleado | null> {
  try {
    const docRef = doc(db, 'empleados', id);
    const docSnap = await getDocs(collection(db, 'empleados'));
    const empleado = docSnap.docs.find((d) => d.id === id);
    if (empleado) {
      return { id: empleado.id, ...empleado.data() } as Empleado;
    }
    return null;
  } catch (error) {
    console.error('Error al obtener empleado:', error);
    throw error;
  }
}

/**
 * Crea un empleado nuevo
 * Genera consecutivo automático y convierte fechas a Timestamp
 */
export async function createEmpleado(
  data: EmpleadoFormData
): Promise<string> {
  try {
    // Obtener el máximo consecutivo actual
    const q = query(collection(db, 'empleados'));
    const querySnapshot = await getDocs(q);
    let maxConsecutivo = 0;
    querySnapshot.forEach((doc) => {
      const empleado = doc.data() as Empleado;
      if (empleado.consecutivo > maxConsecutivo) {
        maxConsecutivo = empleado.consecutivo;
      }
    });

    const now = Timestamp.now();
    const newEmpleado = {
      organizationId: 'org-default',
      consecutivo: maxConsecutivo + 1,
      nombre: data.nombre,
      cargo: data.cargo,
      tipoPuesto: data.tipoPuesto,
      fechaIngreso: Timestamp.fromDate(data.fechaIngreso),
      activo: data.activo,
      coachAsignado: data.coachAsignado || null,
      email: data.email || null,
      telefono: data.telefono || null,
      photoURL: null,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, 'empleados'), newEmpleado);
    return docRef.id;
  } catch (error) {
    console.error('Error al crear empleado:', error);
    throw error;
  }
}

/**
 * Actualiza un empleado
 */
export async function updateEmpleado(
  id: string,
  data: Partial<EmpleadoFormData>
): Promise<void> {
  try {
    const updateData: any = { ...data };

    // Convertir fecha a Timestamp si existe
    if (data.fechaIngreso) {
      updateData.fechaIngreso = Timestamp.fromDate(data.fechaIngreso);
    }

    // Actualizar updatedAt
    updateData.updatedAt = Timestamp.now();

    const docRef = doc(db, 'empleados', id);
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error al actualizar empleado:', error);
    throw error;
  }
}

/**
 * Marca un empleado como inactivo (soft delete)
 */
export async function deleteEmpleado(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'empleados', id);
    await updateDoc(docRef, {
      activo: false,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al eliminar empleado:', error);
    throw error;
  }
}

/**
 * Hook que retorna lista de empleados en tiempo real
 */
export function useEmpleadosRealtime(): Empleado[] {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'empleados'),
      where('activo', '==', true),
      orderBy('nombre')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const empleadosData: Empleado[] = [];
      querySnapshot.forEach((doc) => {
        empleadosData.push({ id: doc.id, ...doc.data() } as Empleado);
      });
      setEmpleados(empleadosData);
    });

    return () => unsubscribe();
  }, []);

  return empleados;
}

/**
 * Custom hook para acceder a las funciones de empleados
 */
export function useEmpleados() {
  return {
    getEmpleados,
    getEmpleadoById,
    createEmpleado,
    updateEmpleado,
    deleteEmpleado,
  };
}
