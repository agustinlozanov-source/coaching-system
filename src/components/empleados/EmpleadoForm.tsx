'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { getCoaches } from '@/hooks/useEmpleados';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Camera } from 'lucide-react';
import { Empleado, EmpleadoFormData } from '@/types/empleado';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { empleadoFormSchema } from '@/lib/schemas/empleado';
import { format } from 'date-fns';

interface EmpleadoFormProps {
  empleado?: Empleado | null;
  onSave: (data: EmpleadoFormData) => Promise<void>;
  onCancel: () => void;
}

export function EmpleadoForm({
  empleado,
  onSave,
  onCancel,
}: EmpleadoFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [coaches, setCoaches] = useState<{ id: string; nombre: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const isEdit = !!empleado;

  useEffect(() => {
    getCoaches().then(setCoaches).catch(() => setCoaches([]));
  }, []);

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setUploadError('Máximo 5 MB'); return; }
    setUploadError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sin sesión');
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/empleado-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatares').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('avatares').getPublicUrl(path);
      setValue('photoURL', `${urlData.publicUrl}?t=${Date.now()}`);
    } catch {
      setUploadError('No se pudo subir la foto. Intenta de nuevo.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(empleadoFormSchema),
    defaultValues: {
      nombre: empleado?.nombre || '',
      cargo: empleado?.cargo || '',
      categorias: empleado?.categorias || { puesto: 'Asesor' },
      fechaIngreso: empleado
        ? new Date(empleado.fechaIngreso.toDate())
        : new Date(),
      activo: empleado?.activo ?? true,
      email: empleado?.email || '',
      telefono: empleado?.telefono || '',
      coachAsignado: empleado?.coachAsignado || '',
      photoURL: empleado?.photoURL || '',
    },
  });

  const photoURL = watch('photoURL');

  const categorias = watch('categorias');
  const activo = watch('activo');

  const handlePuestoChange = (value: string) => {
    setValue('categorias', { ...categorias, puesto: value });
  };

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      const formData: EmpleadoFormData = {
        nombre: data.nombre,
        cargo: data.cargo,
        categorias: data.categorias,
        fechaIngreso: new Date(data.fechaIngreso),
        activo: data.activo,
        email: data.email || undefined,
        telefono: data.telefono || undefined,
        coachAsignado: data.coachAsignado || undefined,
        photoURL: data.photoURL || undefined,
      };
      await onSave(formData);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Foto */}
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={photoURL || undefined} alt="" />
          <AvatarFallback className="bg-muted"><Camera className="h-6 w-6 text-muted-foreground" /></AvatarFallback>
        </Avatar>
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={uploading || isLoading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
              {photoURL ? 'Cambiar foto' : 'Subir foto'}
            </Button>
            {photoURL && (
              <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={() => setValue('photoURL', '')}>
                Quitar
              </Button>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">JPG o PNG, máximo 5 MB.</p>
          {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nombre */}
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre *</Label>
          <Input
            id="nombre"
            placeholder="Nombre del empleado"
            disabled={isLoading}
            {...register('nombre')}
          />
          {errors.nombre && (
            <p className="text-sm text-red-600">{errors.nombre.message}</p>
          )}
        </div>

        {/* Cargo */}
        <div className="space-y-2">
          <Label htmlFor="cargo">Cargo *</Label>
          <Input
            id="cargo"
            placeholder="Cargo del empleado"
            disabled={isLoading}
            {...register('cargo')}
          />
          {errors.cargo && (
            <p className="text-sm text-red-600">{errors.cargo.message}</p>
          )}
        </div>

        {/* Puesto */}
        <div className="space-y-2">
          <Label htmlFor="puesto">Puesto *</Label>
          <Select value={categorias?.puesto || 'Asesor'} onValueChange={handlePuestoChange}>
            <SelectTrigger id="puesto" disabled={isLoading}>
              <SelectValue placeholder="Selecciona un puesto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Ejecutivo">Ejecutivo</SelectItem>
              <SelectItem value="Telemarketing">Telemarketing</SelectItem>
              <SelectItem value="Asesor">Asesor</SelectItem>
            </SelectContent>
          </Select>
          {errors.categorias && (
            <p className="text-sm text-red-600">Error en categorías</p>
          )}
        </div>

        {/* Fecha Ingreso */}
        <div className="space-y-2">
          <Label htmlFor="fechaIngreso">Fecha de Ingreso *</Label>
          <Input
            id="fechaIngreso"
            type="date"
            disabled={isLoading}
            {...register('fechaIngreso')}
          />
          {errors.fechaIngreso && (
            <p className="text-sm text-red-600">{errors.fechaIngreso.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="correo@ejemplo.com"
            disabled={isLoading}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Teléfono */}
        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            placeholder="Teléfono del empleado"
            disabled={isLoading}
            {...register('telefono')}
          />
          {errors.telefono && (
            <p className="text-sm text-red-600">{errors.telefono.message}</p>
          )}
        </div>

        {/* Coach Asignado */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="coachAsignado">Coach Asignado</Label>
          <Select
            value={watch('coachAsignado') || 'none'}
            onValueChange={(v) => setValue('coachAsignado', v === 'none' ? '' : v)}
          >
            <SelectTrigger id="coachAsignado" disabled={isLoading}>
              <SelectValue placeholder="Selecciona un coach" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin asignar</SelectItem>
              {coaches.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.coachAsignado && (
            <p className="text-sm text-red-600">{errors.coachAsignado.message}</p>
          )}
        </div>

        {/* Activo - Solo en edición */}
        {isEdit && (
          <div className="space-y-2 flex items-center gap-4 md:col-span-2">
            <Label htmlFor="activo">Estado: {activo ? 'Activo' : 'Inactivo'}</Label>
            <Switch
              id="activo"
              checked={activo}
              onCheckedChange={(checked) => setValue('activo', checked)}
              disabled={isLoading}
            />
          </div>
        )}
      </div>

      {/* Botones */}
      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isLoading ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}
