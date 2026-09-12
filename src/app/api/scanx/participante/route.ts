// SCANx · flujo público del participante multiperspectiva (server-only).
// Valida token + contraseña temporal con service role (bypassa RLS de forma segura).
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Solicitud inválida.' }, { status: 200 }); }
  const { action, token, password, respuestas } = body ?? {};
  const db = admin();
  if (!db) return NextResponse.json({ ok: false, error: 'Servicio no configurado (falta SUPABASE_SERVICE_ROLE_KEY).' }, { status: 200 });
  if (!token) return NextResponse.json({ ok: false, error: 'Enlace inválido.' }, { status: 200 });

  const { data: p } = await db.from('scanx_participantes').select('*').eq('token', token).maybeSingle();
  if (!p) return NextResponse.json({ ok: false, error: 'Enlace no encontrado.' }, { status: 200 });
  if (p.expires_at && new Date(p.expires_at) < new Date()) return NextResponse.json({ ok: false, error: 'El enlace expiró.' }, { status: 200 });
  if ((p.password_temp ?? '') !== (password ?? '')) return NextResponse.json({ ok: false, error: 'Contraseña incorrecta.' }, { status: 200 });

  // Nombre de la empresa (contexto) sin exponer el resto del diagnóstico
  const { data: diag } = await db.from('scanx_diagnosticos').select('perfil').eq('id', p.diagnostico_id).maybeSingle();

  if (action === 'get') {
    return NextResponse.json({
      ok: true,
      participante: { nombre: p.nombre, nivel: p.nivel, preguntas: p.preguntas ?? [], estado: p.estado },
      empresa: (diag?.perfil as any)?.nombreEmpresa ?? null,
    }, { status: 200 });
  }

  if (action === 'save') {
    const { error } = await db.from('scanx_participantes')
      .update({ respuestas: respuestas ?? {}, estado: 'completado' })
      .eq('id', p.id);
    if (error) return NextResponse.json({ ok: false, error: 'No se pudo guardar.' }, { status: 200 });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  return NextResponse.json({ ok: false, error: 'Acción no reconocida.' }, { status: 200 });
}
