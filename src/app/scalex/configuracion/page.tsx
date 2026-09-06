import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ConfiguracionApp } from './ConfiguracionApp';

export const metadata = { title: 'Configuración · SCALEx' };
export const dynamic = 'force-dynamic';

export default async function ConfiguracionPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="px-8 py-8">
      <ConfiguracionApp />
    </div>
  );
}
