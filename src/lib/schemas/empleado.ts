import { z } from 'zod';

export const empleadoFormSchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').max(100),
  cargo: z.string().min(3, 'El cargo debe tener al menos 3 caracteres').max(100),
  tipoPuesto: z.enum(['ejecutivo', 'telemarketing', 'asesor'], {
    errorMap: () => ({ message: 'Selecciona un tipo de puesto válido' }),
  }),
  fechaIngreso: z.coerce.date().refine(
    (date) => date <= new Date(),
    {
      message: 'La fecha de ingreso no puede ser futura',
    }
  ),
  activo: z.boolean().default(true),
  email: z.string().email('Email inválido').or(z.literal('')).optional(),
  telefono: z.string().optional(),
  coachAsignado: z.string().optional(),
});

export type EmpleadoFormSchemaType = z.infer<typeof empleadoFormSchema>;
