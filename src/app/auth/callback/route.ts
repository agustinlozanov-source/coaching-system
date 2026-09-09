import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Callback OAuth (Google y futuros proveedores): intercambia el `code` por una
 * sesión y redirige al launcher (o al `next` indicado). Si algo falla, vuelve al
 * login con un aviso.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/launcher';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }
  return NextResponse.redirect(new URL('/login?error=oauth', origin));
}
