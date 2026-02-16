'use client';

import { useState, useMemo, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle, Calendar } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useEmpleados } from '@/hooks/useEmpleados';
import { useEvaluaciones } from '@/hooks/useEvaluaciones';
import { calcularSemanasAntiguedad } from '@/lib/utils/calculations';
import type { Empleado } from '@/types/empleado';

interface EmpleadoSelectorProps {
  onSelect: (empleado: Empleado) => void;
  empleadosConEvaluacionReciente?: string[];
}

type TipoPuesto = 'ejecutivo' | 'telemarketing' | 'asesor';
type EstadoEvaluacion = 'todas' | 'sin-evaluacion' | 'con-evaluacion';

export function EmpleadoSelector({
  onSelect,
  empleadosConEvaluacionReciente = [],
}: EmpleadoSelectorProps) {
  const { empleados, loading } = useEmpleados();
  const { getEvaluacionesByEmpleado } = useEvaluaciones();

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<TipoPuesto | 'todos'>('todos');
  const [filtroEstado, setFiltroEstado] = useState<EstadoEvaluacion>('todas');
  const [ordenarPor, setOrdenarPor] = useState<'nombre' | 'antiguedad' | 'evaluacion'>('nombre');
  const [empleadoConEvaluacionReciente, setEmpleadoConEvaluacionReciente] = useState<Empleado | null>(null);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [ultimasEvaluaciones, setUltimasEvaluaciones] = useState<Record<string, Date>>({});

  // Cargar última evaluación de cada empleado
  useEffect(() => {
    const cargarEvaluaciones = async () => {
      const map: Record<string, Date> = {};
      for (const emp of empleados) {
        try {
          const evals = await getEvaluacionesByEmpleado(emp.id);
          if (evals.length > 0) {
            map[emp.id] = new Date(evals[0].fecha);
          }
        } catch (error) {
          console.error(`Error cargando evaluaciones de ${emp.id}:`, error);
        }
      }
      setUltimasEvaluaciones(map);
    };

    if (empleados.length > 0) {
      cargarEvaluaciones();
    }
  }, [empleados, getEvaluacionesByEmpleado]);

  // Filtrar y ordenar empleados
  const empleadosFiltrados = useMemo(() => {
    let filtered = empleados.filter((emp) => emp.activo);

    // Búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        (emp) =>
          emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.cargo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro tipo puesto
    if (filtroTipo !== 'todos') {
      filtered = filtered.filter((emp) => emp.tipoPuesto === filtroTipo);
    }

    // Filtro estado evaluación
    if (filtroEstado === 'sin-evaluacion') {
      filtered = filtered.filter((emp) => !ultimasEvaluaciones[emp.id]);
    } else if (filtroEstado === 'con-evaluacion') {
      filtered = filtered.filter((emp) => ultimasEvaluaciones[emp.id]);
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      if (ordenarPor === 'nombre') {
        return a.nombre.localeCompare(b.nombre);
      } else if (ordenarPor === 'antiguedad') {
        const semanasA = calcularSemanasAntiguedad(a.fechaIngreso);
        const semanasB = calcularSemanasAntiguedad(b.fechaIngreso);
        return semanasB - semanasA; // Mayor antigüedad primero
      } else if (ordenarPor === 'evaluacion') {
        const fechaA = ultimasEvaluaciones[a.id]?.getTime() || 0;
        const fechaB = ultimasEvaluaciones[b.id]?.getTime() || 0;
        return fechaB - fechaA; // Más reciente primero
      }
      return 0;
    });

    return filtered;
  }, [empleados, searchTerm, filtroTipo, filtroEstado, ordenarPor, ultimasEvaluaciones]);

  const getTipoPuestoColor = (tipo: string) => {
    const colores: Record<string, string> = {
      ejecutivo: 'bg-blue-100 text-blue-800',
      telemarketing: 'bg-purple-100 text-purple-800',
      asesor: 'bg-green-100 text-green-800',
    };
    return colores[tipo] || 'bg-gray-100 text-gray-800';
  };

  const handleEmpleadoClick = (empleado: Empleado) => {
    // Verificar si tiene evaluación reciente
    if (empleadosConEvaluacionReciente.includes(empleado.id)) {
      setEmpleadoConEvaluacionReciente(empleado);
      setMostrarConfirmacion(true);
    } else {
      onSelect(empleado);
    }
  };

  const handleConfirmarContinuar = () => {
    if (empleadoConEvaluacionReciente) {
      onSelect(empleadoConEvaluacionReciente);
    }
    setMostrarConfirmacion(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Cargando empleados...</p>
      </div>
    );
  }

  const ultimaEval = empleadoConEvaluacionReciente
    ? ultimasEvaluaciones[empleadoConEvaluacionReciente.id]
    : null;

  return (
    <div className="space-y-6">
      {/* Búsqueda y Filtros */}
      <div className="space-y-4">
        {/* Búsqueda */}
        <Input
          placeholder="Busca por nombre o cargo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />

        {/* Filtros y Ordenamiento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Tipo de Puesto</label>
            <Select value={filtroTipo} onValueChange={(val: any) => setFiltroTipo(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ejecutivo">Ejecutivo</SelectItem>
                <SelectItem value="telemarketing">Telemarketing</SelectItem>
                <SelectItem value="asesor">Asesor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Estado Evaluación</label>
            <Select value={filtroEstado} onValueChange={(val: any) => setFiltroEstado(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="sin-evaluacion">Sin evaluación</SelectItem>
                <SelectItem value="con-evaluacion">Con evaluación</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Ordenar por</label>
            <Select value={ordenarPor} onValueChange={(val: any) => setOrdenarPor(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nombre">Nombre</SelectItem>
                <SelectItem value="antiguedad">Antigüedad (Mayor primero)</SelectItem>
                <SelectItem value="evaluacion">Última Evaluación</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Contador */}
      <div className="text-sm text-muted-foreground">
        {empleadosFiltrados.length === 1
          ? '1 empleado encontrado'
          : `${empleadosFiltrados.length} empleados encontrados`}
      </div>

      {/* Grid de Empleados */}
      {empleadosFiltrados.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No se encontraron empleados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {empleadosFiltrados.map((empleado) => {
            const tieneEvaluacionReciente = empleadosConEvaluacionReciente.includes(empleado.id);
            const ultimaEvaluacion = ultimasEvaluaciones[empleado.id];
            const semanasAntiguedad = calcularSemanasAntiguedad(empleado.fechaIngreso);

            return (
              <Card
                key={empleado.id}
                className="hover:shadow-lg transition-all cursor-pointer hover:border-blue-400"
                onClick={() => handleEmpleadoClick(empleado)}
              >
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Avatar y nombre */}
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {empleado.nombre
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold">{empleado.nombre}</h3>
                        <p className="text-sm text-muted-foreground">{empleado.cargo}</p>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                      <Badge className={getTipoPuestoColor(empleado.tipoPuesto)}>
                        {empleado.tipoPuesto}
                      </Badge>
                      {tieneEvaluacionReciente && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Reciente
                        </Badge>
                      )}
                    </div>

                    {/* Info */}
                    <div className="space-y-2 border-t pt-3">
                      {/* Última evaluación */}
                      {ultimaEvaluacion ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Última eval: {formatDistanceToNow(ultimaEvaluacion, {
                              locale: es,
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Sin evaluación aún
                        </div>
                      )}

                      {/* Antigüedad */}
                      <div className="text-xs text-muted-foreground">
                        Antigüedad: {semanasAntiguedad} semanas
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de confirmación */}
      <AlertDialog open={mostrarConfirmacion} onOpenChange={setMostrarConfirmacion}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Evaluación reciente</AlertDialogTitle>
            <AlertDialogDescription>
              {ultimaEval
                ? `Este empleado ya fue evaluado ${formatDistanceToNow(ultimaEval, {
                    locale: es,
                    addSuffix: true,
                  })}. ¿Deseas continuar creando una nueva evaluación?`
                : 'Este empleado fue evaluado recientemente. ¿Deseas continuar?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmarContinuar}>
              Continuar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
