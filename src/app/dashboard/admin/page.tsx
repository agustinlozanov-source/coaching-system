'use client';

import { useOrganization } from '@/contexts/OrganizationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Settings, 
  Tags, 
  Sliders, 
  BookOpen,
  ArrowRight,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

interface AdminSection {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

export default function AdminPage() {
  const { organization, loading } = useOrganization();

  const sections: AdminSection[] = [
    {
      title: 'Organización',
      description: 'Configura información general, datos de contacto y ve un resumen de tu organización',
      icon: <Settings className="h-6 w-6" />,
      href: '/dashboard/admin/organizacion',
      color: 'text-blue-600 bg-blue-50',
    },
    {
      title: 'Categorías',
      description: 'Crea, edita y elimina categorías de empleados (Ejecutivo, Asesor, etc)',
      icon: <Tags className="h-6 w-6" />,
      href: '/dashboard/admin/categorias',
      color: 'text-purple-600 bg-purple-50',
    },
    {
      title: 'Escalas de Puntuación',
      description: 'Personaliza los valores numéricos y sus significados (1=Deficiente, 5=Excelente)',
      icon: <Sliders className="h-6 w-6" />,
      href: '/dashboard/admin/escalas',
      color: 'text-amber-600 bg-amber-50',
    },
    {
      title: 'Competencias',
      description: 'Configura secciones de competencias y competencias específicas para evaluar',
      icon: <BookOpen className="h-6 w-6" />,
      href: '/dashboard/admin/competencias',
      color: 'text-green-600 bg-green-50',
    },
  ];

  if (loading || !organization) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-2xl">Bienvenido a Administración</CardTitle>
          <CardDescription className="text-base mt-2">
            Organización: <span className="font-bold text-foreground">{organization.nombre}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Desde aquí puedes configurar todos los aspectos de tu organización: categorías de empleados, escalas de evaluación, y competencias a evaluar.
          </p>
        </CardContent>
      </Card>

      {/* Admin Sections Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className={`inline-flex p-3 rounded-lg w-fit mb-3 ${section.color}`}>
                  {section.icon}
                </div>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription className="mt-2">
                  {section.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="gap-2">
                  Configurar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {Object.keys(organization.configuracion.categorias).length}
            </div>
            <p className="text-sm text-muted-foreground">Categorías</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {Object.keys(organization.configuracion.escalaPuntuacion).length}
            </div>
            <p className="text-sm text-muted-foreground">Niveles en escala</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {organization.configuracion.departamentos?.length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Departamentos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {organization.id.substring(0, 8)}
            </div>
            <p className="text-sm text-muted-foreground">Org ID</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base">¿Necesitas ayuda?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Categorías:</strong> Define los tipos de empleados en tu organización (roles, niveles, departamentos)
          </p>
          <p>
            <strong>Escalas:</strong> Personaliza cómo se califica el desempeño (1-5, numérico, o como prefieras)
          </p>
          <p>
            <strong>Competencias:</strong> Configura qué habilidades evaluarás según la categoría del empleado
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
