import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VectorApp } from './VectorApp';

export const metadata = { title: 'Vector · SCALEx' };
export const dynamic = 'force-dynamic';

export default async function VectorPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="px-8 py-8">
      <VectorApp />
    </div>
  );
}
