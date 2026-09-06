import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RitmoApp } from './RitmoApp';

export const metadata = { title: 'Ritmo · SCALEx' };
export const dynamic = 'force-dynamic';

export default async function RitmoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="px-8 py-8">
      <RitmoApp />
    </div>
  );
}
