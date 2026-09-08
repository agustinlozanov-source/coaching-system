'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ClipboardList, Plus, Printer, Download, User, Users } from 'lucide-react';
import { listEvaluaciones } from '@/lib/teamx/evaluacion';
import { getEmpleados } from '@/hooks/useEmpleados';
import type { Evaluacion } from '@/types/teamx';
import type { Empleado } from '@/types/empleado';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ReporteIndividual } from './components/ReporteIndividual';
import { ReporteEquipo } from './components/ReporteEquipo';
import { toEvalPoint, csvIndividual, csvEquipo, downloadCsv, type FilaEquipoCsv } from '@/lib/teamx/reportes';

export const dynamic = 'force-dynamic';

type Tab = 'individual' | 'equipo';

export default function ReportesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('individual');
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empleadoId, setEmpleadoId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [evs, emps] = await Promise.all([listEvaluaciones(), getEmpleados()]);
      setEvaluaciones(evs);
      setEmpleados(emps);
      // listEvaluaciones() viene ordenada por fecha desc: la primera es la más reciente.
      if (evs.length) setEmpleadoId(evs[0].empleadoId);
      else if (emps.length) setEmpleadoId(emps[0].id);
      setLoading(false);
    })();
  }, []);

  const empleadoActual = useMemo(() => empleados.find((e) => e.id === empleadoId) ?? null, [empleados, empleadoId]);

  const handlePrint = () => window.print();

  const handleExportCsv = () => {
    if (tab === 'individual') {
      const evalsEmpleado = evaluaciones
        .filter((e) => e.empleadoId === empleadoId)
        .slice()
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
      const points = evalsEmpleado.map(toEvalPoint);
      const nombre = empleadoActual?.nombre ?? 'empleado';
      downloadCsv(`reporte-individual-${nombre.replace(/\s+/g, '_')}.csv`, csvIndividual(nombre, points));
    } else {
      const nombreEmpleado = new Map(empleados.map((e) => [e.id, e.nombre]));
      const filas: FilaEquipoCsv[] = evaluaciones
        .slice()
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map((e) => ({
          empleado: nombreEmpleado.get(e.empleadoId) ?? e.empleadoId,
          fecha: e.fecha,
          semana: e.semana ?? null,
          estado: e.estado,
          general: e.promedioGeneral ?? null,
          eficiencia: typeof e.eficiencia?.logro === 'number' ? e.eficiencia.logro : null,
        }));
      downloadCsv('reporte-equipo.csv', csvEquipo(filas));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (evaluaciones.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-jakarta">Reportes</h1>
          <p className="mt-1 text-muted-foreground">Análisis y reportes del equipo</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-bold">Todavía no hay evaluaciones</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Crea la primera evaluación de un empleado para empezar a ver evolución, tendencias y comparaciones aquí.
            </p>
            <Button className="mt-4" onClick={() => router.push('/dashboard/evaluaciones/nueva')}>
              <Plus className="mr-2 h-4 w-4" /> Nueva evaluación
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:block">
        <div>
          <h1 className="text-3xl font-bold font-jakarta">Reportes</h1>
          <p className="mt-1 text-muted-foreground">
            {tab === 'individual' ? 'Evolución y desempeño individual' : 'Consolidado del equipo'}
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir / PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 print:hidden">
        <Button
          variant={tab === 'individual' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('individual')}
        >
          <User className="mr-2 h-4 w-4" /> Individual
        </Button>
        <Button
          variant={tab === 'equipo' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('equipo')}
        >
          <Users className="mr-2 h-4 w-4" /> Equipo
        </Button>
      </div>

      {tab === 'individual' ? (
        <ReporteIndividual
          empleados={empleados}
          evaluaciones={evaluaciones}
          empleadoId={empleadoId}
          onChangeEmpleado={setEmpleadoId}
        />
      ) : (
        <ReporteEquipo empleados={empleados} evaluaciones={evaluaciones} />
      )}

      <style jsx global>{`
        @media print {
          body { background: white; }
          nav, aside, header { display: none !important; }
        }
      `}</style>
    </div>
  );
}
