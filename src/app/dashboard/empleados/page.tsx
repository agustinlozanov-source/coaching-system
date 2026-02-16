'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';

export default function EmpleadosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-jakarta">Empleados</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tu equipo de trabajo
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Empleado
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Empleados</CardTitle>
          <CardDescription>
            Próximamente: tabla completa con filtros y búsqueda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>Esta sección estará disponible próximamente</p>
            <p className="text-sm mt-2">
              Aquí podrás ver, crear y editar empleados
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
