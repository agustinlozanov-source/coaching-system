'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Users2, Plus, Search, AlertTriangle, Filter } from 'lucide-react';
import { getEmpleados, getCoaches } from '@/hooks/useEmpleados';
import { listEvaluaciones } from '@/lib/teamx/evaluacion';
import type { Empleado } from '@/types/empleado';
import type { Evaluacion } from '@/types/teamx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RosterTable } from '@/components/equipo/RosterTable';
import { CurvaAprendizajeDialog } from '@/components/equipo/CurvaAprendizajeDialog';
import { MatrizCapacitacion } from '@/components/equipo/MatrizCapacitacion';
import { buildEmpleadoStats, type EmpleadoStats } from '@/lib/teamx/equipo';

export const dynamic = 'force-dynamic';

const MADUREZ_OPCIONES = [
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'en_desarrollo', label: 'En desarrollo' },
  { key: 'competente', label: 'Competente' },
  { key: 'experto', label: 'Experto' },
  { key: 'mentor', label: 'Mentor' },
];

export default function EquipoPage() {
  const router = useRouter();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [coachNombres, setCoachNombres] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterCoach, setFilterCoach] = useState('todos');
  const [filterMadurez, setFilterMadurez] = useState('todas');
  const [curvaFor, setCurvaFor] = useState<EmpleadoStats | null>(null);

  useEffect(() => {
    (async () => {
      const [emps, evs, coaches] = await Promise.all([getEmpleados(), listEvaluaciones(), getCoaches()]);
      setEmpleados(emps);
      setEvaluaciones(evs);
      setCoachNombres(Object.fromEntries(coaches.map((c) => [c.id, c.nombre])));
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(
    () => empleados.map((e) => buildEmpleadoStats(e, evaluaciones)),
    [empleados, evaluaciones]
  );

  const filtered = useMemo(() => {
    let r = stats;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (s) => s.empleado.nombre.toLowerCase().includes(q) || s.empleado.cargo.toLowerCase().includes(q)
      );
    }
    if (filterCoach !== 'todos') {
      r = r.filter((s) => s.empleado.coachAsignado === filterCoach);
    }
    if (filterMadurez !== 'todas') {
      r = r.filter((s) => s.madurez.key === filterMadurez);
    }
    return r;
  }, [stats, search, filterCoach, filterMadurez]);

  const resumen = useMemo(() => {
    const total = stats.length;
    const conAlerta = stats.filter((s) => s.alerta).length;
    const conDatos = stats.map((s) => s.pctCompetencias).filter((v): v is number => v !== null);
    const promedio = conDatos.length ? Math.round(conDatos.reduce((a, b) => a + b, 0) / conDatos.length) : 0;
    return { total, conAlerta, promedio };
  }, [stats]);

  const coachesConMiembros = useMemo(() => {
    const ids = new Set(empleados.map((e) => e.coachAsignado).filter(Boolean) as string[]);
    return Array.from(ids).map((id) => ({ id, nombre: coachNombres[id] ?? 'Sin nombre' }));
  }, [empleados, coachNombres]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipo</h1>
          <p className="text-muted-foreground">Roster, madurez y desarrollo de tu equipo.</p>
        </div>
        <Button onClick={() => router.push('/dashboard/empleados')}>
          <Plus className="mr-2 h-4 w-4" /> Gestionar empleados
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : empleados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Users2 className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-bold">Aún no hay empleados en el equipo</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Agrega personas a tu organización para ver el roster, su madurez y su curva de aprendizaje.
            </p>
            <Button className="mt-4" onClick={() => router.push('/dashboard/empleados')}>
              <Plus className="mr-2 h-4 w-4" /> Ir a Empleados
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="py-5">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Personas en el equipo</div>
                <div className="mt-1 text-3xl font-extrabold tabular-nums">{resumen.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-5">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Promedio de competencias</div>
                <div className="mt-1 text-3xl font-extrabold tabular-nums">{resumen.promedio}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-5">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Sin evaluar 2+ semanas
                </div>
                <div className={`mt-1 text-3xl font-extrabold tabular-nums ${resumen.conAlerta > 0 ? 'text-red-600' : ''}`}>
                  {resumen.conAlerta}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Roster maestro</CardTitle>
              <CardDescription>
                Mostrando {filtered.length} de {stats.length} persona{stats.length !== 1 ? 's' : ''}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-end">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Busca por nombre o cargo..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium">Coach asignado</label>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={filterCoach} onValueChange={setFilterCoach}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {coachesConMiembros.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium">Madurez</label>
                  <Select value={filterMadurez} onValueChange={setFilterMadurez}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {MADUREZ_OPCIONES.map((m) => (
                        <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Ninguna persona coincide con los filtros.
                </div>
              ) : (
                <RosterTable stats={filtered} coachNombres={coachNombres} onVerCurva={setCurvaFor} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Matriz de capacitación</CardTitle>
              <CardDescription>
                Coaching/Herramientas, Institucionales y Técnicos — marca los temas ya cubiertos por persona.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MatrizCapacitacion empleados={empleados} />
            </CardContent>
          </Card>

          <CurvaAprendizajeDialog stats={curvaFor} onClose={() => setCurvaFor(null)} />
        </>
      )}
    </div>
  );
}
