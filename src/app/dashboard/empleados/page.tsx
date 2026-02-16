'use client';

import { useState, useMemo } from 'react';
import { Loader2, Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEmpleadosRealtime, deleteEmpleado } from '@/hooks/useEmpleados';
import { EmpleadoTable } from '@/components/empleados/EmpleadoTable';
import { EmpleadoDialog } from '@/components/empleados/EmpleadoDialog';
import { DeleteEmpleadoDialog } from '@/components/empleados/DeleteEmpleadoDialog';
import { Empleado } from '@/types/empleado';

export default function EmpleadosPage() {
  const empleados = useEmpleadosRealtime();
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [empleadoToDelete, setEmpleadoToDelete] = useState<{
    id: string;
    nombre: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTipoPuesto, setFilterTipoPuesto] = useState<string>('todos');

  const filteredEmpleados = useMemo(() => {
    let result = empleados;

    // Filtro por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (emp) =>
          emp.nombre.toLowerCase().includes(query) ||
          emp.cargo.toLowerCase().includes(query)
      );
    }

    // Filtro por tipo de puesto
    if (filterTipoPuesto !== 'todos') {
      result = result.filter((emp) => emp.tipoPuesto === filterTipoPuesto);
    }

    return result;
  }, [empleados, searchQuery, filterTipoPuesto]);

  const handleNewEmpleado = () => {
    setSelectedEmpleado(null);
    setShowDialog(true);
  };

  const handleEdit = (empleado: Empleado) => {
    setSelectedEmpleado(empleado);
    setShowDialog(true);
  };

  const handleDelete = (id: string) => {
    const empleado = empleados.find((e) => e.id === id);
    if (empleado) {
      setEmpleadoToDelete({ id, nombre: empleado.nombre });
      setDeleteDialogOpen(true);
    }
  };

  const handleDialogClose = () => {
    setShowDialog(false);
    setSelectedEmpleado(null);
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setEmpleadoToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (empleadoToDelete) {
      await deleteEmpleado(empleadoToDelete.id);
    }
  };

  const handleSuccess = () => {
    // Los datos se actualizarán automáticamente gracias a useEmpleadosRealtime
  };

  const isLoading = empleados.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-jakarta">Empleados</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tu equipo de trabajo
          </p>
        </div>
        <Button onClick={handleNewEmpleado}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Empleado
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Empleados</CardTitle>
          <CardDescription>
            {isLoading
              ? 'Cargando empleados...'
              : `Mostrando ${filteredEmpleados.length} de ${empleados.length} empleado${empleados.length !== 1 ? 's' : ''}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Búsqueda y Filtros */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            {/* Búsqueda */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Busca por nombre o cargo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtro por tipo de puesto */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Tipo de Puesto</label>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterTipoPuesto} onValueChange={setFilterTipoPuesto}>
                  <SelectTrigger className="w-full">
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
            </div>
          </div>

          {/* Tabla */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Cargando empleados...</p>
            </div>
          ) : (
            <EmpleadoTable
              empleados={filteredEmpleados}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>

      <EmpleadoDialog
        open={showDialog}
        empleado={selectedEmpleado}
        onClose={handleDialogClose}
        onSuccess={handleSuccess}
      />

      <DeleteEmpleadoDialog
        open={deleteDialogOpen}
        empleadoId={empleadoToDelete?.id || null}
        empleadoNombre={empleadoToDelete?.nombre || ''}
        onClose={handleDeleteDialogClose}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
