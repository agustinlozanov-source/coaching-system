import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
          <Link
            href="/launcher"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            title="Todas las herramientas"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="text-lg font-extrabold tracking-tight text-slate-900">
            SCALE<span className="text-[#1aab99]">x</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <OpspEditor />
      </main>
    </div>
  );
}
