'use client';

import { createClient } from '@/lib/supabase/client';
import { BANCO_TC } from './preguntas';
import { preguntasParaTipo } from './banco-areas';

export type TipoParticipante = 'interno' | 'cliente' | 'proveedor';
export const TIPOS: { v: TipoParticipante; l: string; desc: string }[] = [
  { v: 'interno', l: 'Interno', desc: 'Alguien de tu empresa (director, gerente, operativo)' },
  { v: 'cliente', l: 'Cliente', desc: 'Un cliente que te compra' },
  { v: 'proveedor', l: 'Proveedor', desc: 'Un proveedor que te surte' },
];

export type NivelParticipante = 'director' | 'gerente' | 'operativo' | 'lider';
export const NIVELES: { v: NivelParticipante; l: string }[] = [
  { v: 'director', l: 'Director' },
  { v: 'gerente', l: 'Gerente' },
  { v: 'operativo', l: 'Operativo' },
  { v: 'lider', l: 'Líder de área' },
];

/** Roles sugeridos por área (para que los datos se puedan cruzar). */
export const ROLES_SUGERIDOS = [
  'Director General / CEO', 'Director de Finanzas', 'Director Comercial', 'Director de Operaciones',
  'Gerente de Ventas', 'Gerente de Marketing', 'Gerente de Producción', 'Gerente de RRHH',
  'Contador / Administración', 'Líder de proyecto', 'Vendedor', 'Analista', 'Coordinador', 'Otro',
];

export type Participante = {
  id: string;
  diagnosticoId: string;
  tipo: TipoParticipante;
  nombre: string | null;
  apellido: string | null;
  rol: string | null;
  departamento: string | null;
  email: string | null;
  nivel: NivelParticipante | null;
  token: string;
  passwordTemp: string | null;
  estado: 'pendiente' | 'completado';
  preguntas: string[];
  respuestas: Record<string, string>;
  createdAt: string;
};

const map = (r: any): Participante => ({
  id: r.id, diagnosticoId: r.diagnostico_id, tipo: r.tipo ?? 'interno', nombre: r.nombre, apellido: r.apellido,
  rol: r.rol, departamento: r.departamento, email: r.email, nivel: r.nivel, token: r.token,
  passwordTemp: r.password_temp, estado: r.estado, preguntas: r.preguntas ?? [], respuestas: r.respuestas ?? {}, createdAt: r.created_at,
});

/** Preguntas asignadas según el TIPO de participante. Interno = tronco común; externos = su set. */
function asignarPreguntas(tipo: TipoParticipante): string[] {
  if (tipo === 'interno') return BANCO_TC.map((p) => p.id);
  return preguntasParaTipo(tipo);
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
  p: { tipo: TipoParticipante; nombre?: string; apellido?: string; rol?: string; departamento?: string; email?: string; nivel?: NivelParticipante | null },
): Promise<{ token: string; password: string }> {
  const supabase = createClient();
  const token = genToken();
  const password = genPassword();
  const expira = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const { error } = await supabase.from('scanx_participantes').insert({
    diagnostico_id: diagnosticoId, tipo: p.tipo, nombre: p.nombre ?? null, apellido: p.apellido ?? null, rol: p.rol ?? null,
    departamento: p.departamento ?? null, email: p.email ?? null, nivel: p.tipo === 'interno' ? (p.nivel ?? null) : null,
    token, password_temp: password, preguntas: asignarPreguntas(p.tipo), expires_at: expira,
  });
  if (error) throw error;
  return { token, password };
}

export async function eliminarParticipante(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('scanx_participantes').delete().eq('id', id);
}
