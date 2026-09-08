'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, MessagesSquare, ChevronRight } from 'lucide-react';
import { listSesiones, crearSesion, type Sesion, type EstadoSesion } from '@/lib/teamx/sesiones';
import { getEmpleados } from '@/hooks/useEmpleados';
import type { Empleado } from '@/types/empleado';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export const dynamic = 'force-dynamic';

const ESTADO_LABEL: Record<EstadoSesion, string> = {
  programada: 'Programada',
  en_curso: 'En curso',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

const ESTADO_BADGE: Record<EstadoSesion, 'secondary' | 'info' | 'success' | 'muted'> = {
  programada: 'secondary',
  en_curso: 'info',
  completada: 'success',
  cancelada: 'muted',
};

export default function SesionesPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [empleadoId, setEmpleadoId] = useState<string>('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [creando, setCreando] = useState(false);

  async function cargar() {
    const [s, e] = await Promise.all([listSesiones(), getEmpleados()]);
    setSesiones(s);
    setEmpleados(e);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

  const nombres = useMemo(
    () => Object.fromEntries(empleados.map((e) => [e.id, e.nombre])),
    [empleados],
  );

  const stats = useMemo(() => {
    const total = sesiones.length;
    const programadas = sesiones.filter((s) => s.estado === 'programada').length;
    const completadas = sesiones.filter((s) => s.estado === 'completada').length;
    return { total, programadas, completadas };
  }, [sesiones]);

  function abrirDialog() {
    setEmpleadoId(empleados[0]?.id ?? '');
    setFecha(new Date().toISOString().slice(0, 10));
    setOpen(true);
  }

  async function confirmarCrear() {
    if (!empleadoId) return;
    setCreando(true);
    try {
      const id = await crearSesion({ empleadoId, fecha });
      router.push(`/dashboard/sesiones/${id}`);
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear la sesión.', variant: 'destructive' });
      setCreando(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sesiones</h1>
          <p className="text-muted-foreground">Sesiones de coaching: agenda, notas y acuerdos por empleado.</p>
        </div>
        <Button onClick={abrirDialog} disabled={loading || empleados.length === 0}>
          <Plus className="mr-2 h-4 w-4" /> Nueva sesión
        </Button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Programadas', value: stats.programadas },
          { label: 'Completadas', value: stats.completadas },
        ].map((s) => (
          <Card key={s.label}><CardContent className="py-5">
            <div className="text-xs font-semibold uppercase text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-3xl font-extrabold tabular-nums">{s.value}</div>
          </CardContent></Card>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : sesiones.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center py-16 text-center">
          <MessagesSquare className="h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 font-bold">Aún no hay sesiones de coaching</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {empleados.length === 0
              ? 'Agrega empleados primero para poder agendar una sesión.'
              : 'Crea la primera sesión: la agenda se sugiere sola desde la última evaluación.'}
          </p>
          {empleados.length > 0 && (
            <Button className="mt-4" onClick={abrirDialog}>
              <Plus className="mr-2 h-4 w-4" /> Nueva sesión
            </Button>
          )}
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Empleado</th>
                  <th className="p-3 text-left">Fecha</th>
                  <th className="p-3 text-left">Estado</th>
                  <th className="p-3 text-right">Duración</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {sesiones.map((s) => (
                  <tr key={s.id} className="border-b transition hover:bg-muted/30">
                    <td className="p-3 font-medium">
                      {nombres[s.empleadoId] ? (
                        <Link href={`/dashboard/empleados/${s.empleadoId}`} className="hover:underline">
                          {nombres[s.empleadoId]}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">{s.fecha}</td>
                    <td className="p-3"><Badge variant={ESTADO_BADGE[s.estado]}>{ESTADO_LABEL[s.estado]}</Badge></td>
                    <td className="p-3 text-right tabular-nums text-muted-foreground">
                      {s.duracionMin != null ? `${s.duracionMin} min` : '—'}
                    </td>
                    <td className="p-3 text-right">
                      <Link href={`/dashboard/sesiones/${s.id}`} className="inline-flex items-center text-emerald-600 hover:underline">
                        Abrir <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva sesión de coaching</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Empleado</Label>
              <Select value={empleadoId} onValueChange={setEmpleadoId}>
                <SelectTrigger><SelectValue placeholder="Elige un empleado" /></SelectTrigger>
                <SelectContent>
                  {empleados.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nombre}{e.cargo ? ` · ${e.cargo}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Fecha</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              La agenda se sugiere automáticamente a partir de la última evaluación y las tareas pendientes del empleado. Podrás editarla después.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={confirmarCrear} disabled={!empleadoId || creando}>
              {creando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Crear sesión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
