'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Map, Repeat, Eye, Compass, Coins, Activity, Dna,
  KanbanSquare, Presentation, User, Settings, ShieldCheck, TrendingUp,
  LogOut, Grid3x3,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { clearActiveOrgId } from '@/lib/teamx/org';

type NavItem = {
  href?: string; icon?: any; label?: string; ready?: boolean;
  divider?: boolean; adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: '/scalex', icon: LayoutDashboard, label: 'Dashboard', ready: true },
  { href: '/scalex/opsp', icon: Map, label: 'OPSP', ready: true },
  { href: '/scalex/rituales', icon: Repeat, label: 'Rituales', ready: true },
  { divider: true },
  { href: '/scalex/reflejo', icon: Eye, label: 'Reflejo', ready: true },
  { href: '/scalex/adn', icon: Dna, label: 'ADN', ready: true },
  { href: '/scalex/vector', icon: Compass, label: 'Vector', ready: true },
  { href: '/scalex/ritmo', icon: Activity, label: 'Ritmo', ready: true },
  { href: '/scalex/flujo', icon: Coins, label: 'Flujo', ready: true },
  { divider: true },
  { href: '/scalex/clientes', icon: KanbanSquare, label: 'Mis Clientes', ready: true },
  { href: '/scalex/presentacion', icon: Presentation, label: 'Presentación', ready: true },
  { href: '/scalex/admin/consultores', icon: ShieldCheck, label: 'Admin · Consultores', ready: true, adminOnly: true },
  { href: '/scalex/admin/pipeline', icon: TrendingUp, label: 'Pipeline Global', ready: true, adminOnly: true },
];

const BOTTOM: NavItem[] = [
  { href: '/scalex/perfil', icon: User, label: 'Mi Perfil', ready: true },
  { href: '/scalex/configuracion', icon: Settings, label: 'Configuración', ready: true },
];

export default function ScalexLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('perfiles').select('rol_global').eq('id', user.id).maybeSingle();
      setIsAdmin(data?.rol_global === 'admin');
    })();
  }, []);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearActiveOrgId();
    router.push('/login');
    router.refresh();
  }

  const isActive = (href: string) =>
    href === '/scalex' ? pathname === '/scalex' : pathname.startsWith(href);

  function renderItem(item: NavItem, i: number) {
    if (item.divider) return <div key={`d${i}`} className="my-1 h-px w-7 bg-white/10" />;
    if (item.adminOnly && !isAdmin) return null;
    const Icon = item.icon!;
    const active = isActive(item.href!);
    const base = 'relative flex h-11 w-11 items-center justify-center rounded-xl transition';
    if (!item.ready) {
      return (
        <button key={item.href} title={`${item.label} · Próximamente`} disabled
          className={`${base} cursor-default text-white/25`}>
          <Icon className="h-5 w-5" />
        </button>
      );
    }
    return (
      <Link key={item.href} href={item.href!} title={item.label}
        className={`${base} ${active ? 'bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-white' : 'text-white/50 hover:bg-white/[0.06] hover:text-white'}`}>
        <Icon className="h-5 w-5" />
        {active && <span className="absolute -left-4 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r bg-[#1aab99]" />}
      </Link>
    );
  }

  return (
    <div className="flex min-h-screen gap-4 bg-[#0a0a0c] p-4 text-white">
      {/* Sidebar */}
      <aside className="sticky top-4 flex h-[calc(100vh-32px)] w-20 flex-shrink-0 flex-col items-center gap-2 rounded-[28px] bg-[#050506] py-5">
        <Link href="/launcher" title="Todas las herramientas" className="mb-3 flex h-11 w-11 items-center justify-center">
          <Grid3x3 className="h-6 w-6 text-white/80" />
        </Link>

        <nav className="flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto px-0">
          {NAV.map(renderItem)}
        </nav>

        <div className="flex w-full flex-col items-center gap-2">
          <div className="my-1 h-px w-7 bg-white/10" />
          {BOTTOM.map(renderItem)}
          <button onClick={logout} title="Cerrar sesión"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-white/50 transition hover:bg-white/[0.06] hover:text-white">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </aside>

      {/* Shell */}
      <main className="flex h-[calc(100vh-32px)] flex-1 flex-col overflow-hidden rounded-[28px] bg-[#141416]">
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
