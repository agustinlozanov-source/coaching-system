import { Users, Compass, Radar, type LucideIcon } from 'lucide-react';

export type Herramienta = {
  slug: string;
  nombre: string;
  descripcion: string;
  ruta: string;
  color: string; // hex de acento de la herramienta
  icon: LucideIcon;
  disponible: boolean; // false = "Próximamente"
};

/**
 * Las 2 aplicaciones del ecosistema SCALEx.
 * - SCALEx: la plataforma de metodología completa (dashboard + OPSP, Rituales,
 *   Reflejo, Vector, Flujo, Ritmo, ADN… con su propio sidebar interno).
 * - TEAMx: gestión de equipos / coaching de performance.
 * Cada una se abre como su propia experiencia independiente.
 */
export const HERRAMIENTAS: Herramienta[] = [
  {
    slug: 'scanx',
    nombre: 'SCANx',
    descripcion: 'Diagnóstico empresarial: radiografía completa, tu tipo de empresa y tus 3 prioridades para escalar.',
    ruta: '/scanx',
    color: '#0ea5a3',
    icon: Radar,
    disponible: true,
  },
  {
    slug: 'scalex',
    nombre: 'SCALEx',
    descripcion: 'La metodología completa: estrategia, procesos, ritmo y finanzas de tu empresa.',
    ruta: '/scalex',
    color: '#3533cd',
    icon: Compass,
    disponible: true,
  },
  {
    slug: 'teamx',
    nombre: 'TEAMx',
    descripcion: 'Gestión de equipos al máximo rendimiento en ciclos de 14 semanas.',
    ruta: '/dashboard',
    color: '#1aab99',
    icon: Users,
    disponible: true,
  },
];
