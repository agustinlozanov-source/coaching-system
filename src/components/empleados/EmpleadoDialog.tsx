'use client';

import { Empleado, EmpleadoFormData } from '@/types/empleado';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmpleadoForm } from './EmpleadoForm';
import { useToast } from '@/hooks/useToast';
import {
  createEmpleado,
  updateEmpleado,
} from '@/hooks/useEmpleados';

interface EmpleadoDialogProps {
  open: boolean;
  empleado?: Empleado | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmpleadoDialog({
  open,
  empleado,
  onClose,
  onSuccess,
}: EmpleadoDialogProps) {
  const { toast } = useToast();
  const isEdit = !!empleado;

  const handleSave = async (data: EmpleadoFormData) => {
    try {
      if (isEdit && empleado) {
        await updateEmpleado(empleado.id, data);
        toast({
          title: 'Éxito',
          description: 'Empleado actualizado correctamente',
        });
      } else {
        await createEmpleado(data);
        toast({
          title: 'Éxito',
          description: 'Empleado creado correctamente',
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error al guardar empleado:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la persona. Intenta de nuevo.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[600px] w-full">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar persona' : 'Nueva persona'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualiza la información de la persona'
              : 'Completa el formulario para dar de alta a una persona'}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <EmpleadoForm
            empleado={empleado}
            onSave={handleSave}
            onCancel={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
