import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClientesApp } from './ClientesApp';

export const metadata = { title: 'Mis Clientes · SCALEx' };
export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="flex h-full flex-col px-8 py-8">
      <ClientesApp />
    </div>
  );
}
