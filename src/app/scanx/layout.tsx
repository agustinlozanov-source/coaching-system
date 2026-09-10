'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { FloatingLines } from '@/components/brand/FloatingLines';

export default function ScanxLayout({ children }: { children: React.ReactNode }) {
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
        <div className="absolute inset-0 text-slate-400/50 dark:text-white/80">
          <FloatingLines />
        </div>

        <div className="relative z-10">
          <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
            <Link
              href="/launcher"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Herramientas
            </Link>
            <img src={isDark ? '/logos/scanx-blanco.png' : '/logos/scanx-negro.png'} alt="SCANx" className="h-8 w-auto" />
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Cambiar tema"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:text-foreground"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </header>

          <main className="mx-auto max-w-5xl px-6 pb-20">{children}</main>
        </div>
      </div>
    </div>
  );
}
