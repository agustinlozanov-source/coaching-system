import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminConsultoresApp } from './AdminConsultoresApp';

export const metadata = { title: 'Consultores · Admin · SCALEx' };
export const dynamic = 'force-dynamic';

export default async function AdminConsultoresPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="px-8 py-8">
      <AdminConsultoresApp />
    </div>
  );
}
