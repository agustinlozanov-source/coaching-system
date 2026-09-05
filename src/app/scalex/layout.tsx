'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Map, Repeat, Eye, Compass, Coins, Activity, Dna,
  LogOut, Grid3x3,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { clearActiveOrgId } from '@/lib/teamx/org';

type NavItem = { href: string; icon: any; label: string; ready: boolean; divider?: boolean };

const NAV: NavItem[] = [
  { href: '/scalex', icon: LayoutDashboard, label: 'Dashboard', ready: true },
  { href: '/scalex/opsp', icon: Map, label: 'OPSP', ready: true },
  { href: '/scalex/rituales', icon: Repeat, label: 'Rituales', ready: false },
  { href: '', icon: null, label: '', ready: false, divider: true },
  { href: '/scalex/reflejo', icon: Eye, label: 'Reflejo', ready: false },
  { href: '/scalex/vector', icon: Compass, label: 'Vector', ready: false },
  { href: '/scalex/flujo', icon: Coins, label: 'Flujo', ready: false },
  { href: '/scalex/ritmo', icon: Activity, label: 'Ritmo', ready: false },
  { href: '/scalex/adn', icon: Dna, label: 'ADN', ready: false },
];

export default function ScalexLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearActiveOrgId();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen gap-4 bg-[#0a0a0c] p-4 text-white">
      {/* Sidebar */}
      <aside className="sticky top-4 flex h-[calc(100vh-32px)] w-20 flex-shrink-0 flex-col items-center gap-2 rounded-[28px] bg-[#050506] py-5">
        <Link href="/launcher" title="Todas las herramientas" className="mb-3 flex h-11 w-11 items-center justify-center">
          <Grid3x3 className="h-6 w-6 text-white/80" />
        </Link>

        <nav className="flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto px-0">
          {NAV.map((item, i) => {
            if (item.divider) return <div key={i} className="my-1 h-px w-7 bg-white/10" />;
            const Icon = item.icon;
            const active = pathname === item.href;
            const base = 'relative flex h-11 w-11 items-center justify-center rounded-xl transition';
            if (!item.ready) {
              return (
                <button key={i} title={`${item.label} · Próximamente`} disabled
                  className={`${base} cursor-default text-white/25`}>
                  <Icon className="h-5 w-5" />
                </button>
              );
            }
            return (
              <Link key={i} href={item.href} title={item.label}
                className={`${base} ${active ? 'bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-white' : 'text-white/50 hover:bg-white/[0.06] hover:text-white'}`}>
                <Icon className="h-5 w-5" />
                {active && <span className="absolute -left-4 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r bg-[#1aab99]" />}
              </Link>
            );
          })}
        </nav>

        <button onClick={logout} title="Cerrar sesión"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-white/50 transition hover:bg-white/[0.06] hover:text-white">
          <LogOut className="h-5 w-5" />
        </button>
      </aside>

      {/* Shell */}
      <main className="flex h-[calc(100vh-32px)] flex-1 flex-col overflow-hidden rounded-[28px] bg-[#141416]">
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
