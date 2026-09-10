'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function AccountButton({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-border bg-background/60 px-3 py-1.5 text-sm font-medium text-foreground backdrop-blur transition hover:bg-muted"
      >
        Mi cuenta
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg">
          <div className="truncate px-3 py-2 text-xs text-muted-foreground">{email}</div>
          <button
            onClick={signOut}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
