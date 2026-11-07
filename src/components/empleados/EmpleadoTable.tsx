'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pencil, Trash2, Eye, Link2, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Empleado } from '@/types/empleado';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { calcularSemanasAntiguedad } from '@/lib/utils/calculations';

interface EmpleadoTableProps {
  empleados: Empleado[];
  onEdit: (empleado: Empleado) => void;
  onDelete: (id: string) => void;
}

export function EmpleadoTable({
  empleados,
  onEdit,
  onDelete,
}: EmpleadoTableProps) {
  const router = useRouter();
  const [copiando, setCopiando] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  /**
   * Genera un enlace nuevo para esa persona y lo deja en el portapapeles.
   * Rota el anterior a propósito: si se volvió a pedir, lo más probable es que
   * el viejo ande circulando donde no debía.
   */
  async function copiarEnlace(id: string) {
    setCopiando(id);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('portal_token_regenerar', { p_empleado: id });
    setCopiando(null);
    if (error || !data) {
      alert(error?.message ?? 'No se pudo generar el enlace.');
      return;
    }
    const url = `${window.location.origin}/mi/${data}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(id);
      setTimeout(() => setCopiado(null), 2500);
    } catch {
      window.prompt('Copia este enlace y compártelo:', url);
    }
  }

  if (empleados.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-center">
        <div>
          <p className="text-muted-foreground">No hay personas registradas</p>
        </div>
      </div>
    );
  }

  const handleRowClick = (id: string) => {
    router.push(`/dashboard/empleados/${id}`);
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Consecutivo</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>Tipo Puesto</TableHead>
            <TableHead>Fecha Ingreso</TableHead>
            <TableHead>Antigüedad (semanas)</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {empleados.map((empleado) => (
            <TableRow
              key={empleado.id}
              onClick={() => handleRowClick(empleado.id)}
              className="cursor-pointer transition-colors hover:bg-accent"
            >
              <TableCell className="font-medium">{empleado.consecutivo}</TableCell>
              <TableCell>
                <span className="font-medium text-primary">
                  {empleado.nombre}
                </span>
              </TableCell>
              <TableCell>{empleado.cargo}</TableCell>
              <TableCell className="capitalize">{empleado.categorias?.['puesto'] || '-'}</TableCell>
              <TableCell>
                {format(empleado.fechaIngreso.toDate(), 'dd/MM/yyyy', {
                  locale: es,
                })}
              </TableCell>
              <TableCell>{calcularSemanasAntiguedad(empleado.fechaIngreso)}</TableCell>
              <TableCell>
                <Badge variant={empleado.activo ? 'success' : 'muted'}>
                  {empleado.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2" onClick={handleActionClick}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRowClick(empleado.id)}
                    title="Ver detalles"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copiarEnlace(empleado.id)}
                    disabled={copiando === empleado.id}
                    title="Copiar su enlace de seguimiento"
                  >
                    {copiando === empleado.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : copiado === empleado.id
                        ? <Check className="h-4 w-4 text-emerald-600" />
                        : <Link2 className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(empleado)}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(empleado.id)}
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
