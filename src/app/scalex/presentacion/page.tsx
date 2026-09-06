import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PresentacionApp } from './PresentacionApp';

export const metadata = { title: 'Modo Presentación · SCALEx' };
export const dynamic = 'force-dynamic';

export default async function PresentacionPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Sin padding del shell: el modo presentación es inmersivo y llena el
  // contenedor por completo (fondo dark propio, HUD y slides a pantalla).
  return <PresentacionApp />;
}
