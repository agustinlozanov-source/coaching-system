'use client';

import { createClient } from '@/lib/supabase/client';
import { BANCO_N1 } from './preguntas';

export type NivelParticipante = 'director' | 'gerente' | 'operativo' | 'lider' | 'cliente' | 'proveedor';
export const NIVELES: { v: NivelParticipante; l: string }[] = [
  { v: 'director', l: 'Director' },
  { v: 'gerente', l: 'Gerente' },
  { v: 'operativo', l: 'Operativo' },
  { v: 'lider', l: 'Líder de área' },
  { v: 'cliente', l: 'Cliente' },
  { v: 'proveedor', l: 'Proveedor' },
];

export type Participante = {
  id: string;
  diagnosticoId: string;
  nombre: string | null;
  rol: string | null;
  departamento: string | null;
  email: string | null;
  nivel: NivelParticipante;
  token: string;
  passwordTemp: string | null;
  estado: 'pendiente' | 'completado';
  preguntas: string[];
  respuestas: Record<string, string>;
  createdAt: string;
};

const map = (r: any): Participante => ({
  id: r.id, diagnosticoId: r.diagnostico_id, nombre: r.nombre, rol: r.rol, departamento: r.departamento,
  email: r.email, nivel: r.nivel, token: r.token, passwordTemp: r.password_temp, estado: r.estado,
  preguntas: r.preguntas ?? [], respuestas: r.respuestas ?? {}, createdAt: r.created_at,
});

/** Preguntas asignadas según el tipo de participante (externos responden menos). */
function asignarPreguntas(nivel: NivelParticipante): string[] {
  const todas = BANCO_N1.map((p) => p.id);
  if (nivel === 'cliente' || nivel === 'proveedor') return todas.slice(0, 6);
  return todas;
}

function genToken() {
  return (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).replace(/-/g, '').slice(0, 16);
}
function genPassword() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function listParticipantes(diagnosticoId: string): Promise<Participante[]> {
  const supabase = createClient();
  const { data } = await supabase.from('scanx_participantes').select('*').eq('diagnostico_id', diagnosticoId).order('created_at', { ascending: false });
  return (data ?? []).map(map);
}

export async function crearParticipante(
  diagnosticoId: string,
  p: { nombre?: string; rol?: string; departamento?: string; email?: string; nivel: NivelParticipante },
): Promise<{ token: string; password: string }> {
  const supabase = createClient();
  const token = genToken();
  const password = genPassword();
  const expira = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const { error } = await supabase.from('scanx_participantes').insert({
    diagnostico_id: diagnosticoId, nombre: p.nombre ?? null, rol: p.rol ?? null, departamento: p.departamento ?? null,
    email: p.email ?? null, nivel: p.nivel, token, password_temp: password, preguntas: asignarPreguntas(p.nivel), expires_at: expira,
  });
  if (error) throw error;
  return { token, password };
}

export async function eliminarParticipante(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('scanx_participantes').delete().eq('id', id);
}
