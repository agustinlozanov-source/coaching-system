'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/useToast';

interface DeleteEmpleadoDialogProps {
  open: boolean;
  empleadoId: string | null;
  empleadoNombre: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteEmpleadoDialog({
  open,
  empleadoId,
  empleadoNombre,
  onClose,
  onConfirm,
}: DeleteEmpleadoDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      await onConfirm();
      toast({
        title: 'Éxito',
        description: `${empleadoNombre} ha sido marcado como inactivo`,
        variant: 'default',
      });
      onClose();
    } catch (error) {
      console.error('Error al eliminar empleado:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el empleado. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción marcará a <strong>{empleadoNombre}</strong> como inactivo. Podrás reactivarlo después.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isLoading ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
