import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OpspEditor } from './OpspEditor';

export const metadata = { title: 'OPSP · SCALEx' };
export const dynamic = 'force-dynamic';

export default async function OpspPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="px-8 py-8">
      <OpspEditor />
    </div>
  );
}
