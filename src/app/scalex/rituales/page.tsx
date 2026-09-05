import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RitualesApp } from './RitualesApp';

export const metadata = { title: 'Rituales · SCALEx' };
export const dynamic = 'force-dynamic';

export default async function RitualesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="px-8 py-8">
      <RitualesApp />
    </div>
  );
}
