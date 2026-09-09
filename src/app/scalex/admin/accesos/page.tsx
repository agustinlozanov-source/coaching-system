import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminAccesosApp } from './AdminAccesosApp';

export const metadata = { title: 'Accesos · Admin · SCALEx' };
export const dynamic = 'force-dynamic';

export default async function AdminAccesosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol_global')
    .eq('id', user.id)
    .maybeSingle();
  if (perfil?.rol_global !== 'admin') redirect('/scalex');

  return (
    <div className="px-8 py-8">
      <AdminAccesosApp />
    </div>
  );
}
