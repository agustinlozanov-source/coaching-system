import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { FlujoApp } from './FlujoApp';

export const metadata = { title: 'Flujo · SCALEx' };
export const dynamic = 'force-dynamic';

export default async function FlujoPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return (
    <div className="px-8 py-8">
      <FlujoApp />
    </div>
  );
}
