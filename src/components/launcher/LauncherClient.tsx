'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Lock, Moon, Sun } from 'lucide-react';
import { FloatingLines } from '@/components/brand/FloatingLines';
import { AccountButton } from './AccountButton';

export type ToolItem = {
  slug: string;
  nombre: string;
  descripcion: string;
  ruta: string;
  color: string;
  disponible: boolean;
  contratada: boolean;
};

const LOGOS: Record<string, { blanco: string; negro: string }> = {
  scanx: { blanco: '/logos/scanx-blanco.png', negro: '/logos/scanx-negro.png' },
  scalex: { blanco: '/logos/scalex-blanco.png', negro: '/logos/scalex-negro.png' },
  teamx: { blanco: '/logos/teamx-blanco.png', negro: '/logos/teamx-negro.png' },
  boardx: { blanco: '/logos/boardx-blanco.png', negro: '/logos/boardx-negro.png' },
};

function ToolCard({ t, isDark }: { t: ToolItem; isDark: boolean }) {
  const abrible = t.disponible && t.contratada;
  const logo = LOGOS[t.slug]?.[isDark ? 'blanco' : 'negro'];

  const surface =
    'relative flex h-full flex-col rounded-2xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-[#1c1c22]';

  const inner = (
    <>
      <div className="flex items-start justify-between">
        {logo ? (
          <img src={logo} alt={t.nombre} className="h-9 w-auto" />
        ) : (
          <span className="text-lg font-bold">{t.nombre}</span>
        )}
        {!t.disponible ? (
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Próximamente
          </span>
        ) : !t.contratada ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Lock className="h-3 w-3" /> No incluida
          </span>
        ) : null}
      </div>
      <p className="mt-5 flex-1 text-sm leading-relaxed text-muted-foreground">{t.descripcion}</p>
      {abrible ? (
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: t.color }}>
          Abrir
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      ) : !t.disponible ? (
        <span className="mt-5 text-sm font-medium text-muted-foreground/70">En construcción</span>
      ) : (
        <span className="mt-5 text-sm font-medium text-muted-foreground/70">Escríbenos para activarla</span>
      )}
    </>
  );

  if (abrible) {
    return (
      <Link
        href={t.ruta}
        className={`glow-card group ${surface} transition duration-200 hover:-translate-y-0.5 hover:shadow-xl`}
      >
        {inner}
      </Link>
    );
  }
  return <div className={`${surface} opacity-60`}>{inner}</div>;
}

export function LauncherClient({
  nombre,
  email,
  sinOrg,
  tools,
}: {
  nombre: string;
  email: string;
  sinOrg: boolean;
  tools: ToolItem[];
}) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('teamx-theme');
      if (saved === 'dark' || saved === 'light') setTheme(saved);
      else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
    } catch { /* noop */ }
  }, []);

  function toggleTheme() {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('teamx-theme', next); } catch { /* noop */ }
      return next;
    });
  }

  const isDark = theme === 'dark';

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="relative min-h-screen overflow-hidden bg-[#e9ebef] text-foreground dark:bg-[#141418]">
        {/* Fondo con líneas (igual que el login) */}
        <div className="absolute inset-0 text-slate-400/60 dark:text-white/90">
          <FloatingLines />
        </div>

        <div className="relative z-10">
          <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
            <img src={isDark ? '/logos/scalex-blanco.png' : '/logos/scalex-negro.png'} alt="SCALEx" className="h-9 w-auto" />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Cambiar tema"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:text-foreground"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <AccountButton email={email} />
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-6 pb-16 pt-6">
            <p className="text-sm font-medium text-muted-foreground">
              Hola{nombre ? ` ${nombre}` : ''} 👋
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Tus herramientas</h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Elige la herramienta con la que quieres trabajar. Cada una abre su propio espacio.
            </p>

            {sinOrg && (
              <div className="mt-6 rounded-xl border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-950/30">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                  Aún no perteneces a ninguna organización
                </p>
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-200/80">
                  Pídele a tu coach o administrador que te agregue a su equipo para habilitar tus herramientas.
                </p>
              </div>
            )}

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((t) => (
                <ToolCard key={t.slug} t={t} isDark={isDark} />
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
