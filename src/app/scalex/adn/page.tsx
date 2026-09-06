import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdnApp } from './AdnApp';

export const metadata = { title: 'ADN · SCALEx' };
export const dynamic = 'force-dynamic';

export default async function AdnPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="px-8 py-8">
      <AdnApp />
    </div>
  );
}
