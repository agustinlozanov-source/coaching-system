'use client';

import { useState } from 'react';
import { GraduationCap, Loader2 } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { cn } from '@/lib/utils/cn';
import {
  CAPACITACION_CATEGORIAS,
  getCapacitacion,
  setCapacitacion,
  iniciales,
} from '@/lib/teamx/equipo';
import type { Empleado } from '@/types/empleado';

interface Props {
  empleados: Empleado[];
  onChange?: (empleadoId: string, tema: string, checked: boolean) => void;
}

export function MatrizCapacitacion({ empleados, onChange }: Props) {
  // Espejo local optimista: empleadoId -> tema -> checked. Se persiste en custom_fields.
  const [overrides, setOverrides] = useState<Record<string, Record<string, boolean>>>({});
  const [saving, setSaving] = useState<string | null>(null); // `${empleadoId}:${tema}`

  const isChecked = (empleado: Empleado, tema: string) =>
    overrides[empleado.id]?.[tema] ?? getCapacitacion(empleado)[tema] ?? false;

  const toggle = async (empleado: Empleado, tema: string) => {
    const next = !isChecked(empleado, tema);
    const key = `${empleado.id}:${tema}`;
    setOverrides((prev) => ({ ...prev, [empleado.id]: { ...prev[empleado.id], [tema]: next } }));
    setSaving(key);
    try {
      await setCapacitacion(empleado, tema, next);
      onChange?.(empleado.id, tema, next);
    } catch {
      // revierte en caso de error de guardado
      setOverrides((prev) => ({ ...prev, [empleado.id]: { ...prev[empleado.id], [tema]: !next } }));
    } finally {
      setSaving(null);
    }
  };

  if (empleados.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 bg-card">Persona</TableHead>
            {CAPACITACION_CATEGORIAS.map((cat) => (
              <TableHead key={cat.categoria} colSpan={cat.temas.length} className="border-l text-center text-emerald-700">
                {cat.categoria}
              </TableHead>
            ))}
          </TableRow>
          <TableRow>
            <TableHead className="sticky left-0 z-10 bg-card"></TableHead>
            {CAPACITACION_CATEGORIAS.flatMap((cat) =>
              cat.temas.map((tema, i) => (
                <TableHead
                  key={tema}
                  className={cn('whitespace-nowrap text-center text-[11px] font-normal text-muted-foreground', i === 0 && 'border-l')}
                >
                  {tema}
                </TableHead>
              ))
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {empleados.map((emp) => (
            <TableRow key={emp.id}>
              <TableCell className="sticky left-0 z-10 bg-card font-medium">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-semibold text-emerald-800">
                    {iniciales(emp.nombre)}
                  </span>
                  {emp.nombre}
                </div>
              </TableCell>
              {CAPACITACION_CATEGORIAS.flatMap((cat) =>
                cat.temas.map((tema, i) => {
                  const key = `${emp.id}:${tema}`;
                  return (
                    <TableCell key={tema} className={cn('text-center', i === 0 && 'border-l')}>
                      {saving === key ? (
                        <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <input
                          type="checkbox"
                          checked={isChecked(emp, tema)}
                          onChange={() => toggle(emp, tema)}
                          className="h-4 w-4 cursor-pointer accent-emerald-600"
                          aria-label={`${tema} — ${emp.nombre}`}
                        />
                      )}
                    </TableCell>
                  );
                })
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <GraduationCap className="h-3.5 w-3.5" />
        Los temas son un punto de partida configurable; los checks se guardan por persona.
      </p>
    </div>
  );
}
