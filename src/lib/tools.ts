import {
  Users,
  Eye,
  Dna,
  Compass,
  Activity,
  Banknote,
  Map,
  type LucideIcon,
} from 'lucide-react';

export type Herramienta = {
  slug: string;
  nombre: string;
  descripcion: string;
  ruta: string;
  color: string; // hex de acento de la herramienta
  icon: LucideIcon;
  disponible: boolean; // false = "Próximamente" (módulo aún no montado en la app)
};

/**
 * TEMP · Catálogo local que refleja la tabla `herramientas` de Supabase.
 * TODO: reemplazar por lectura real de Supabase (herramientas + org_herramientas
 * filtrado por la organización del usuario) una vez migrado el auth a Supabase.
 */
export const HERRAMIENTAS: Herramienta[] = [
  {
    slug: 'teamx',
    nombre: 'TEAMx',
    descripcion: 'Gestión de equipos al máximo rendimiento en ciclos de 14 semanas.',
    ruta: '/dashboard',
    color: '#1aab99',
    icon: Users,
    disponible: true,
  },
  {
    slug: 'opsp',
    nombre: 'OPSP',
    descripcion: 'One Page Strategic Plan: tu estrategia completa en una sola página.',
    ruta: '/opsp',
    color: '#3533cd',
    icon: Map,
    disponible: true,
  },
  {
    slug: 'reflejo',
    nombre: 'Reflejo',
    descripcion: 'El espejo del líder: cierra la brecha entre tú y tus problemas.',
    ruta: '/reflejo',
    color: '#8b5cf6',
    icon: Eye,
    disponible: false,
  },
  {
    slug: 'adn',
    nombre: 'ADN',
    descripcion: 'Cultura y pirámide invertida: empresas rápidas, no muertas.',
    ruta: '/adn',
    color: '#ec4899',
    icon: Dna,
    disponible: false,
  },
  {
    slug: 'vector',
    nombre: 'Vector',
    descripcion: 'Estrategia aterrizada: norte, OPSP, trimestre y rocks.',
    ruta: '/vector',
    color: '#3533cd',
    icon: Compass,
    disponible: false,
  },
  {
    slug: 'ritmo',
    nombre: 'Ritmo',
    descripcion: 'El pulso de la ejecución: reunión diaria y cadencia.',
    ruta: '/ritmo',
    color: '#14806a',
    icon: Activity,
    disponible: false,
  },
  {
    slug: 'flujo',
    nombre: 'Flujo',
    descripcion: 'Finanzas y capital: costeo, punto de equilibrio y flujo de caja.',
    ruta: '/flujo',
    color: '#f59e0b',
    icon: Banknote,
    disponible: false,
  },
];
