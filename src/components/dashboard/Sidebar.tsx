'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardCheck, 
  BarChart3, 
  Target,
  Settings,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';

const menuItems = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    label: 'Empleados',
    icon: Users,
    href: '/dashboard/empleados',
  },
  {
    label: 'Evaluaciones',
    icon: ClipboardCheck,
    href: '/dashboard/evaluaciones',
  },
  {
    label: 'Reportes',
    icon: BarChart3,
    href: '/dashboard/reportes',
  },
  {
    label: 'Áreas de Oportunidad',
    icon: Target,
    href: '/dashboard/areas-oportunidad',
  },
  {
    label: 'Administración',
    icon: Settings,
    href: '/dashboard/admin',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border-r">
      {/* Logo */}
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-primary font-jakarta">
          Coaching System
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Gestión de Personal
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
}
