'use client';

import { useEffect, useState } from 'react';
import { ScanxSidebar } from '@/components/scanx/ScanxSidebar';
import { Header } from '@/components/dashboard/Header';

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

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''} flex h-screen overflow-hidden bg-background text-foreground`}>
      <aside className="w-64 flex-shrink-0">
        <ScanxSidebar theme={theme} onToggleTheme={toggleTheme} />
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
