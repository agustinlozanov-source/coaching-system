'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Armchair, CalendarClock, Gauge, ListChecks, Users2, Send, LogOut, Sun, Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { clearActiveOrgId } from '@/lib/teamx/org';

const menuItems = [
  { label: 'Inicio', icon: LayoutDashboard, href: '/boardx' },
  { label: 'Consejo', icon: Armchair, href: '/boardx/consejo' },
  { label: 'Reuniones', icon: CalendarClock, href: '/boardx/reuniones' },
  { label: 'Scorecard', icon: Gauge, href: '/boardx/scorecard' },
  { label: 'Acuerdos', icon: ListChecks, href: '/boardx/acuerdos' },
];

const proximamente = [
  { label: 'Directorio', icon: Users2 },
  { label: 'Despacho', icon: Send },
];

export function BoardxSidebar({ theme, onToggleTheme }: { theme?: 'light' | 'dark'; onToggleTheme?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      clearActiveOrgId();
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className="flex h-full flex-col border-r bg-card">
      <div className="border-b p-6">
        <Link href="/launcher" className="block">
          <span className="text-2xl font-extrabold tracking-tight">BOARD<span className="text-[#1aab99]">x</span></span>
          <p className="mt-2 text-xs text-muted-foreground">← Todas las herramientas</p>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === '/boardx'
            ? pathname === '/boardx'
            : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}

        <div className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Próximamente</div>
        {proximamente.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/40">
              <Icon className="h-5 w-5" />
              {item.label}
            </div>
          );
        })}
      </nav>

      <div className="space-y-1 border-t p-4">
        {onToggleTheme && (
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={onToggleTheme}>
            {theme === 'dark' ? <Sun className="mr-3 h-5 w-5" /> : <Moon className="mr-3 h-5 w-5" />}
            {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          </Button>
        )}
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive" onClick={handleLogout}>
          <LogOut className="mr-3 h-5 w-5" /> Cerrar Sesión
        </Button>
      </div>
    </div>
  );
}
