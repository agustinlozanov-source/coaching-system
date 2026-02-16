'use client';

import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export async function migrateEmpleadosToNewStructure() {
  try {
    const snapshot = await getDocs(collection(db, 'empleados'));

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();

      // Si ya tiene categorias, skip
      if (data.categorias) continue;

      // Convertir tipoPuesto a categorias
      let categorias: Record<string, string> = {};

      if (data.tipoPuesto) {
        // Capitalizar primera letra
        const tipoPuestoCapitalizado = data.tipoPuesto.charAt(0).toUpperCase() + data.tipoPuesto.slice(1);
        categorias = { puesto: tipoPuestoCapitalizado };
      } else {
        // Si no existe tipoPuesto, poner vacío
        categorias = { puesto: '' };
      }

      // Actualizar documento
      await updateDoc(doc(db, 'empleados', docSnap.id), {
        categorias,
        tipoPuesto: null, // Eliminar campo antiguo
      });

      console.log(`Migrated empleado: ${docSnap.id}`);
    }

    console.log('Migration completed!');
    return { success: true, message: 'Migration completed successfully' };
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}
