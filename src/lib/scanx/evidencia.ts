'use client';

import { createClient } from '@/lib/supabase/client';

const BUCKET = 'scanx-evidencia';

export type Evidencia = {
  id: string;
  diagnosticoId: string;
  tipo: 'documento' | 'timed' | 'video';
  dimension: string | null;
  descripcion: string | null;
  archivoUrl: string | null;   // path en el bucket
  tiempoDeclarado: number | null;
  tiempoReal: number | null;
  completado: boolean;
  createdAt: string;
};

const map = (r: any): Evidencia => ({
  id: r.id, diagnosticoId: r.diagnostico_id, tipo: r.tipo, dimension: r.dimension,
  descripcion: r.descripcion, archivoUrl: r.archivo_url, tiempoDeclarado: r.tiempo_declarado,
  tiempoReal: r.tiempo_real, completado: r.completado, createdAt: r.created_at,
});

export async function listEvidencias(diagnosticoId: string): Promise<Evidencia[]> {
  const supabase = createClient();
  const { data } = await supabase.from('scanx_evidencias').select('*').eq('diagnostico_id', diagnosticoId).order('created_at', { ascending: false });
  return (data ?? []).map(map);
}

/** Sube un archivo (documento o video) al bucket privado y devuelve su path. */
export async function subirArchivo(diagnosticoId: string, file: File | Blob, ext: string): Promise<string | null> {
  const supabase = createClient();
  const path = `${diagnosticoId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) { console.error('[scanx] upload', error); return null; }
  return path;
}

/** URL firmada temporal para ver un archivo del bucket privado. */
export async function urlFirmada(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function crearEvidencia(diagnosticoId: string, e: Partial<Evidencia>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('scanx_evidencias').insert({
    diagnostico_id: diagnosticoId, tipo: e.tipo ?? 'documento', dimension: e.dimension ?? null,
    descripcion: e.descripcion ?? null, archivo_url: e.archivoUrl ?? null,
    tiempo_declarado: e.tiempoDeclarado ?? null, tiempo_real: e.tiempoReal ?? null,
    completado: e.completado ?? false,
  });
  if (error) throw error;
}

export async function eliminarEvidencia(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('scanx_evidencias').delete().eq('id', id);
}
