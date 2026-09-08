'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { OrganizationProvider } from '@/contexts/OrganizationContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
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

  return (
    <OrganizationProvider>
      <div className={`${theme === 'dark' ? 'dark' : ''} flex h-screen overflow-hidden bg-background text-foreground`}>
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0">
          <Sidebar theme={theme} onToggleTheme={toggleTheme} />
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-muted/20">
            <div className="container mx-auto p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </OrganizationProvider>
  );
}
