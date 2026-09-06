import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CosteoApp } from './CosteoApp';

export const metadata = { title: 'Costeo · SCALEx' };
export const dynamic = 'force-dynamic';

export default async function CosteoPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return (
    <div className="px-8 py-8">
      <CosteoApp />
    </div>
  );
}
