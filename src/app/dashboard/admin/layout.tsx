'use client';

import { useState } from 'react';
import { 
  Settings, 
  Tags, 
  Sliders, 
  BookOpen,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface AdminTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

const ADMIN_TABS: AdminTab[] = [
  { id: 'organizacion', label: 'Organización', icon: <Settings className="h-4 w-4" />, href: '/dashboard/admin/organizacion' },
  { id: 'categorias', label: 'Categorías', icon: <Tags className="h-4 w-4" />, href: '/dashboard/admin/categorias' },
  { id: 'escalas', label: 'Escalas', icon: <Sliders className="h-4 w-4" />, href: '/dashboard/admin/escalas' },
  { id: 'competencias', label: 'Competencias', icon: <BookOpen className="h-4 w-4" />, href: '/dashboard/admin/competencias' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Administración</h1>
          <p className="text-muted-foreground mt-1">Configura tu organización, categorías, escalas y competencias</p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
        </Link>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b">
        <div className="flex gap-1">
          {ADMIN_TABS.map((tab) => (
            <Link key={tab.id} href={tab.href}>
              <Button
                variant="ghost"
                className="rounded-b-none"
              >
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Content */}
      <div>
        {children}
      </div>
    </div>
  );
}
