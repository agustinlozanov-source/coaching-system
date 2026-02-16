'use client';

import { Users, ClipboardCheck, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const stats = [
    {
      title: 'Empleados Activos',
      value: '24',
      description: '+2 este mes',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Evaluaciones Pendientes',
      value: '8',
      description: '3 vencen esta semana',
      icon: ClipboardCheck,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Efectividad Promedio',
      value: '78%',
      description: '+5% vs mes anterior',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Áreas de Atención',
      value: '12',
      description: 'Requieren seguimiento',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold font-jakarta mb-2">
          Bienvenido al Dashboard
        </h1>
        <p className="text-muted-foreground">
          Aquí está el resumen de tu equipo y sus evaluaciones
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evaluaciones Recientes</CardTitle>
            <CardDescription>
              Últimas evaluaciones completadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-semibold">
                    JD
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Juan Pérez</p>
                    <p className="text-xs text-muted-foreground">
                      Evaluado hace 2 días
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">85%</p>
                    <p className="text-xs text-muted-foreground">Efectividad</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximas Revisiones</CardTitle>
            <CardDescription>
              Evaluaciones programadas próximamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-sm font-semibold">
                    MP
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">María González</p>
                    <p className="text-xs text-muted-foreground">
                      Programada para mañana
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-amber-600">
                      Pendiente
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
          <CardDescription>
            Tareas comunes para gestionar tu equipo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <button className="p-4 text-left border rounded-lg hover:bg-accent transition-colors">
              <h3 className="font-semibold mb-1">Nueva Evaluación</h3>
              <p className="text-sm text-muted-foreground">
                Crear una evaluación para un empleado
              </p>
            </button>
            <button className="p-4 text-left border rounded-lg hover:bg-accent transition-colors">
              <h3 className="font-semibold mb-1">Agregar Empleado</h3>
              <p className="text-sm text-muted-foreground">
                Registrar un nuevo miembro del equipo
              </p>
            </button>
            <button className="p-4 text-left border rounded-lg hover:bg-accent transition-colors">
              <h3 className="font-semibold mb-1">Ver Reportes</h3>
              <p className="text-sm text-muted-foreground">
                Consultar reportes y estadísticas
              </p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
