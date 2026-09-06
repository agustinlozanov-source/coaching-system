import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PerfilApp } from './PerfilApp';

export const metadata = { title: 'Mi Perfil · SCALEx' };
export const dynamic = 'force-dynamic';

export default async function PerfilPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="px-8 py-8">
      <PerfilApp />
    </div>
  );
}
