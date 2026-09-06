'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Map, Repeat, Eye, Compass, Coins, Activity, Dna,
  KanbanSquare, Presentation, User, Settings, ShieldCheck, TrendingUp,
  LogOut, Grid3x3, Sun, Moon, Search, Bell, ChevronDown,
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

const NIVEL_TXT: Record<string, string> = {
  junior: 'Consultor Junior',
  senior: 'Consultor Senior',
  master: 'Consultor Master',
  master_certificador: 'Master Certificador',
};

type Perfil = {
  nombre: string | null; apellido: string | null; avatar_url: string | null;
  nivel_consultor: string | null; cert_numero: string | null; cert_vigente: boolean | null;
  cargo: string | null; rol_global: string | null;
};

const initials = (n?: string | null, a?: string | null) => {
  const nn = (n ?? '').trim(), aa = (a ?? '').trim();
  if (nn && aa) return (nn[0] + aa[0]).toUpperCase();
  if (nn) return nn.slice(0, 2).toUpperCase();
  return '··';
};

export default function ScalexLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [orgNombre, setOrgNombre] = useState<string>('');
  const [rolEnOrg, setRolEnOrg] = useState<string>('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isAdmin = perfil?.rol_global === 'admin';

  // Tema guardado
  useEffect(() => {
    try {
      const saved = localStorage.getItem('scalex-theme');
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    } catch { /* noop */ }
  }, []);

  function toggleTheme() {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('scalex-theme', next); } catch { /* noop */ }
      return next;
    });
  }

  // Perfil + organización activa
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase
        .from('perfiles')
        .select('nombre, apellido, avatar_url, nivel_consultor, cert_numero, cert_vigente, cargo, rol_global')
        .eq('id', user.id).maybeSingle();
      if (p) setPerfil(p as Perfil);

      const { data: membresias } = await supabase
        .from('miembros_organizacion')
        .select('organizacion_id, rol_en_org, estado')
        .eq('user_id', user.id);
      const activas = (membresias ?? []).filter((m) => m.estado === 'activo' || m.estado === 'activa');
      const pool = activas.length ? activas : (membresias ?? []);
      const activa = pool.find((m) => m.rol_en_org === 'dueno') ?? pool[0];
      if (activa) {
        setRolEnOrg(activa.rol_en_org ?? '');
        const { data: org } = await supabase
          .from('organizaciones').select('nombre').eq('id', activa.organizacion_id).maybeSingle();
        setOrgNombre(org?.nombre ?? '');
      }
    })();
  }, []);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
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

  function renderNavItem(item: NavItem, i: number) {
    if (item.divider) return <div key={`d${i}`} className="my-1 h-px w-7 bg-white/10" />;
    if (item.adminOnly && !isAdmin) return null;
    const Icon = item.icon!;
    const active = isActive(item.href!);
    const base = 'relative flex h-11 w-11 items-center justify-center rounded-xl transition';
    return (
      <Link key={item.href} href={item.href!} title={item.label}
        className={`${base} ${active ? 'bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-white' : 'text-white/50 hover:bg-white/[0.06] hover:text-white'}`}>
        <Icon className="h-5 w-5" />
        {active && <span className="absolute -left-4 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r bg-[#1aab99]" />}
      </Link>
    );
  }

  const nombre = perfil?.nombre?.split(' ')[0] ?? '';
  const nombreCompleto = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ') || 'Usuario';
  const cert = perfil?.cert_vigente && perfil?.nivel_consultor
    ? `${NIVEL_TXT[perfil.nivel_consultor] ?? 'Consultor'} · #${perfil.cert_numero ?? ''}`
    : (perfil?.cargo ?? '');
  const rolLabel = rolEnOrg === 'dueno' ? 'DUEÑO' : rolEnOrg ? rolEnOrg.toUpperCase() : '';

  return (
    <div data-theme={theme}
      className="sx-root flex min-h-screen gap-4 bg-[var(--sx-page)] p-4 text-[var(--sx-text)]">
      {/* Sidebar (siempre oscuro) */}
      <aside className="sticky top-4 flex h-[calc(100vh-32px)] w-20 flex-shrink-0 flex-col items-center gap-2 rounded-[28px] bg-[var(--sx-sidebar)] py-5 text-white">
        <Link href="/launcher" title="Todas las herramientas" className="mb-3 flex h-11 w-11 items-center justify-center">
          <Grid3x3 className="h-6 w-6 text-white/80" />
        </Link>

        <nav className="flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto px-0">
          {NAV.map(renderNavItem)}
        </nav>

        <div className="flex w-full flex-col items-center gap-2">
          <div className="my-1 h-px w-7 bg-white/10" />
          {BOTTOM.map(renderNavItem)}
          <button onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-white/50 transition hover:bg-white/[0.06] hover:text-white">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button onClick={logout} title="Cerrar sesión"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-white/50 transition hover:bg-white/[0.06] hover:text-white">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </aside>

      {/* Shell */}
      <main className="flex h-[calc(100vh-32px)] flex-1 flex-col overflow-hidden rounded-[28px] bg-[var(--sx-shell)]">
        {/* Top bar */}
        <header className="flex flex-shrink-0 items-center gap-4 border-b border-[var(--sx-border)] px-6 py-3">
          {/* Saludo + org */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-sm font-extrabold text-white">
              {perfil?.avatar_url
                ? <img src={perfil.avatar_url} alt="" className="h-full w-full object-cover" />
                : initials(perfil?.nombre, perfil?.apellido)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-[var(--sx-text)]">¡Hola, {nombre || 'bienvenido'}! 👋</div>
              <div className="truncate text-xs text-[var(--sx-text-dim)]">{orgNombre || '—'}</div>
            </div>
          </div>

          {/* Buscador */}
          <div className="relative mx-auto hidden w-full max-w-xl md:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sx-text-dim)]" />
            <input
              placeholder="Buscar en tu proceso SCALEx…"
              className="w-full rounded-full border border-[var(--sx-border)] bg-[var(--sx-input)] py-2.5 pl-10 pr-4 text-sm text-[var(--sx-text)] outline-none transition placeholder:text-[var(--sx-text-dim)] focus:border-[#1aab99]"
            />
          </div>

          {/* Acciones derecha */}
          <div className="ml-auto flex items-center gap-2.5">
            {/* Badge de usuario */}
            <div className="hidden items-center gap-2.5 rounded-full border border-[var(--sx-border)] py-1 pl-1 pr-3.5 lg:flex">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-[11px] font-extrabold text-white">
                {perfil?.avatar_url
                  ? <img src={perfil.avatar_url} alt="" className="h-full w-full object-cover" />
                  : initials(perfil?.nombre, perfil?.apellido)}
              </div>
              <div className="leading-tight">
                <div className="text-xs font-bold text-[var(--sx-text)]">{nombreCompleto}</div>
                {cert && <div className={`text-[10px] ${perfil?.cert_vigente ? 'text-[#1aab99]' : 'text-[var(--sx-text-dim)]'}`}>{cert}</div>}
              </div>
            </div>

            {/* Chip de organización */}
            {orgNombre && (
              <div className="hidden items-center gap-2 rounded-full border border-[var(--sx-border)] py-1.5 pl-2 pr-3 sm:flex">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#3533cd] to-[#1aab99] text-[10px] font-extrabold text-white">
                  {initials(orgNombre)}
                </div>
                <div className="leading-tight">
                  <div className="max-w-[110px] truncate text-xs font-bold text-[var(--sx-text)]">{orgNombre}</div>
                  {rolLabel && <div className="text-[9px] font-semibold tracking-wide text-[var(--sx-text-dim)]">{rolLabel}</div>}
                </div>
              </div>
            )}

            {/* Campana */}
            <button title="Notificaciones"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--sx-border)] text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)]">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#1aab99]" />
            </button>

            {/* Mi cuenta */}
            <div ref={menuRef} className="relative">
              <button onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full border border-[var(--sx-border)] py-1.5 pl-1.5 pr-3 transition hover:bg-[var(--sx-card-hover)]">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-[10px] font-extrabold text-white">
                  {initials(perfil?.nombre, perfil?.apellido)}
                </div>
                <span className="hidden text-xs font-semibold text-[var(--sx-text)] sm:inline">Mi cuenta</span>
                <ChevronDown className="h-3.5 w-3.5 text-[var(--sx-text-dim)]" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-xl border border-[var(--sx-border)] bg-[var(--sx-card)] py-1.5 shadow-xl">
                  <Link href="/scalex/perfil" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)]">
                    <User className="h-4 w-4" /> Mi Perfil
                  </Link>
                  <Link href="/scalex/configuracion" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)]">
                    <Settings className="h-4 w-4" /> Configuración
                  </Link>
                  <button onClick={toggleTheme}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)]">
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                  </button>
                  <div className="my-1 h-px bg-[var(--sx-border)]" />
                  <button onClick={logout}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 transition hover:bg-[var(--sx-card-hover)]">
                    <LogOut className="h-4 w-4" /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
