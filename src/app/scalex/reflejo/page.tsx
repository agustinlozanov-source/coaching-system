import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ReflejoApp } from './ReflejoApp';

export const metadata = { title: 'Reflejo · SCALEx' };
export const dynamic = 'force-dynamic';

export default async function ReflejoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="px-8 py-8">
      <ReflejoApp />
    </div>
  );
}
