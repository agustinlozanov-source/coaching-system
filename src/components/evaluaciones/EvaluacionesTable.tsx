'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye, Edit, FileText } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Evaluacion } from '@/types/evaluacion';

interface EvaluacionesTableProps {
  evaluaciones: Evaluacion[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
}

export function EvaluacionesTable({
  evaluaciones,
  onView,
  onEdit,
}: EvaluacionesTableProps) {
  const [filtroEmpleado, setFiltroEmpleado] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroFechaInicio, setFiltroFechaInicio] = useState<string>('');
  const [filtroFechaFin, setFiltroFechaFin] = useState<string>('');

  // Obtener lista única de empleados
  const empleados = useMemo(() => {
    const unique = Array.from(
      new Map(
        evaluaciones.map((e) => [e.empleadoId, e.empleadoNombre])
      ).entries()
    );
    return unique.map(([id, nombre]) => ({ id, nombre }));
  }, [evaluaciones]);

  // Filtrar y ordenar evaluaciones
  const evaluacionesFiltradas = useMemo(() => {
    let filtered = [...evaluaciones];

    // Filtro por empleado
    if (filtroEmpleado !== 'todos') {
      filtered = filtered.filter((e) => e.empleadoId === filtroEmpleado);
    }

    // Filtro por estado
    if (filtroEstado !== 'todos') {
      filtered = filtered.filter((e) => e.status === filtroEstado);
    }

    // Filtro por rango de fechas
    if (filtroFechaInicio) {
      const inicio = new Date(filtroFechaInicio);
      filtered = filtered.filter((e) => {
        const fecha = new Date(e.fecha);
        return fecha >= inicio;
      });
    }

    if (filtroFechaFin) {
      const fin = new Date(filtroFechaFin);
      fin.setHours(23, 59, 59, 999); // Final del día
      filtered = filtered.filter((e) => {
        const fecha = new Date(e.fecha);
        return fecha <= fin;
      });
    }

    // Ordenar por fecha descendente
    return filtered.sort((a, b) => {
      const fechaA = new Date(a.fecha).getTime();
      const fechaB = new Date(b.fecha).getTime();
      return fechaB - fechaA;
    });
  }, [evaluaciones, filtroEmpleado, filtroEstado, filtroFechaInicio, filtroFechaFin]);

  // Obtener color para efectividad
  const getEfectividadColor = (efectividad: number) => {
    if (efectividad >= 80) return 'text-green-600 bg-green-50';
    if (efectividad >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // Obtener color para badge de estado
  const getEstadoBadge = (estado: string) => {
    if (estado === 'finalizada') {
      return <Badge className="bg-green-100 text-green-800">Finalizada</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800">Borrador</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtro Empleado */}
            <div>
              <label className="text-sm font-medium mb-2 block">Empleado</label>
              <Select value={filtroEmpleado} onValueChange={setFiltroEmpleado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {empleados.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Estado */}
            <div>
              <label className="text-sm font-medium mb-2 block">Estado</label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="finalizada">Finalizadas</SelectItem>
                  <SelectItem value="borrador">Borradores</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Fecha Inicio */}
            <div>
              <label className="text-sm font-medium mb-2 block">Desde</label>
              <Input
                type="date"
                value={filtroFechaInicio}
                onChange={(e) => setFiltroFechaInicio(e.target.value)}
              />
            </div>

            {/* Filtro Fecha Fin */}
            <div>
              <label className="text-sm font-medium mb-2 block">Hasta</label>
              <Input
                type="date"
                value={filtroFechaFin}
                onChange={(e) => setFiltroFechaFin(e.target.value)}
              />
            </div>
          </div>

          {/* Contador */}
          <div className="mt-4 text-sm text-muted-foreground">
            {evaluacionesFiltradas.length === 1
              ? '1 evaluación encontrada'
              : `${evaluacionesFiltradas.length} evaluaciones encontradas`}
          </div>
        </CardContent>
      </Card>

      {/* Tabla o Empty State */}
      {evaluacionesFiltradas.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="flex flex-col items-center justify-center text-center">
              <FileText className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {evaluaciones.length === 0
                  ? 'Sin evaluaciones'
                  : 'Sin resultados'}
              </h3>
              <p className="text-muted-foreground max-w-md">
                {evaluaciones.length === 0
                  ? 'Aún no hay evaluaciones registradas. Comienza creando una nueva.'
                  : 'No se encontraron evaluaciones que coincidan con los filtros aplicados.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Coach</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Efectividad</TableHead>
                <TableHead>Promedio</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluacionesFiltradas.map((evaluacion) => (
                <TableRow
                  key={evaluacion.id}
                  onClick={() => onView(evaluacion.id)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <TableCell className="font-medium">
                    {format(new Date(evaluacion.fecha), 'dd/MM/yyyy', {
                      locale: es,
                    })}
                  </TableCell>
                  <TableCell>{evaluacion.empleadoNombre}</TableCell>
                  <TableCell>{evaluacion.coachNombre || '-'}</TableCell>
                  <TableCell>{getEstadoBadge(evaluacion.status)}</TableCell>
                  <TableCell>
                    <span
                      className={`font-semibold px-3 py-1 rounded ${getEfectividadColor(evaluacion.efectividad)}`}
                    >
                      {evaluacion.efectividad.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {evaluacion.promedioGeneral.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell
                    onClick={(e) => e.stopPropagation()}
                    className="space-x-2"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView(evaluacion.id)}
                      title="Ver evaluación"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {evaluacion.status === 'borrador' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(evaluacion.id)}
                        title="Editar borrador"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
