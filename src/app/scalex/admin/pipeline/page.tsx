import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminPipelineApp } from './AdminPipelineApp';

export const metadata = { title: 'Pipeline Global · SCALEx' };
export const dynamic = 'force-dynamic';

export default async function AdminPipelinePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return (
    <div className="px-8 py-8">
      <AdminPipelineApp />
    </div>
  );
}
