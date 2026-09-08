'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpDown, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import {
  iniciales,
  semaforoEficiencia,
  SEMAFORO_TEXT_CLASS,
  SEMAFORO_BAR_CLASS,
  type EmpleadoStats,
} from '@/lib/teamx/equipo';

type SortKey = 'nombre' | 'cargo' | 'fechaIngreso' | 'antiguedad' | 'competencias' | 'eficiencia' | 'ultimaEvaluacion';

interface Props {
  stats: EmpleadoStats[];
  coachNombres: Record<string, string>;
  onVerCurva: (stats: EmpleadoStats) => void;
}

function SortButton({ label, active, dir, onClick }: { label: string; active: boolean; dir: 'asc' | 'desc'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 hover:text-foreground',
        active && 'text-foreground font-semibold'
      )}
    >
      {label}
      <ArrowUpDown className={cn('h-3 w-3', active ? 'opacity-100' : 'opacity-40')} />
      {active && <span className="sr-only">({dir})</span>}
    </button>
  );
}

export function RosterTable({ stats, coachNombres, onVerCurva }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('nombre');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    const arr = stats.slice();
    const mult = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'nombre':
          return mult * a.empleado.nombre.localeCompare(b.empleado.nombre);
        case 'cargo':
          return mult * a.empleado.cargo.localeCompare(b.empleado.cargo);
        case 'fechaIngreso':
          return mult * (a.empleado.fechaIngreso.toMillis() - b.empleado.fechaIngreso.toMillis());
        case 'antiguedad':
          return mult * (a.antiguedadSemanas - b.antiguedadSemanas);
        case 'competencias':
          return mult * ((a.pctCompetencias ?? -1) - (b.pctCompetencias ?? -1));
        case 'eficiencia':
          return mult * ((a.pctEficiencia ?? -1) - (b.pctEficiencia ?? -1));
        case 'ultimaEvaluacion':
          return mult * ((a.ultimaEvaluacion?.fecha ?? '').localeCompare(b.ultimaEvaluacion?.fecha ?? ''));
        default:
          return 0;
      }
    });
    return arr;
  }, [stats, sortKey, sortDir]);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead><SortButton label="Nombre" active={sortKey === 'nombre'} dir={sortDir} onClick={() => toggleSort('nombre')} /></TableHead>
            <TableHead><SortButton label="Cargo" active={sortKey === 'cargo'} dir={sortDir} onClick={() => toggleSort('cargo')} /></TableHead>
            <TableHead><SortButton label="Ingreso" active={sortKey === 'fechaIngreso'} dir={sortDir} onClick={() => toggleSort('fechaIngreso')} /></TableHead>
            <TableHead><SortButton label="Antigüedad" active={sortKey === 'antiguedad'} dir={sortDir} onClick={() => toggleSort('antiguedad')} /></TableHead>
            <TableHead>Coach</TableHead>
            <TableHead className="min-w-[140px]"><SortButton label="Competencias" active={sortKey === 'competencias'} dir={sortDir} onClick={() => toggleSort('competencias')} /></TableHead>
            <TableHead className="min-w-[140px]"><SortButton label="Eficiencia" active={sortKey === 'eficiencia'} dir={sortDir} onClick={() => toggleSort('eficiencia')} /></TableHead>
            <TableHead><SortButton label="Última eval." active={sortKey === 'ultimaEvaluacion'} dir={sortDir} onClick={() => toggleSort('ultimaEvaluacion')} /></TableHead>
            <TableHead className="text-right">Curva</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((s) => {
            const semaforo = semaforoEficiencia(s.pctEficiencia);
            return (
              <TableRow key={s.empleado.id}>
                <TableCell>
                  {s.alerta ? (
                    <span title={`Sin evaluación hace ${s.semanasSinEvaluar} semanas`}>
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    </span>
                  ) : (
                    <span title="Al día">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/dashboard/empleados/${s.empleado.id}`}
                    className="flex items-center gap-2"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={s.empleado.photoURL || undefined} alt="" />
                      <AvatarFallback className="bg-emerald-100 text-xs font-semibold text-emerald-800">
                        {iniciales(s.empleado.nombre)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="cursor-pointer font-medium leading-tight hover:underline">{s.empleado.nombre}</div>
                      <Badge variant="outline" className={cn('mt-0.5 px-1.5 py-0 text-[10px]', s.madurez.badgeClass)}>
                        {s.madurez.label}
                      </Badge>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{s.empleado.cargo || '—'}</TableCell>
                <TableCell className="text-muted-foreground">
                  {s.empleado.fechaIngreso.toDate().toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                </TableCell>
                <TableCell className="tabular-nums">{s.antiguedadSemanas} sem.</TableCell>
                <TableCell className="text-muted-foreground">
                  {(s.empleado.coachAsignado && coachNombres[s.empleado.coachAsignado]) || 'Sin asignar'}
                </TableCell>
                <TableCell>
                  {s.pctCompetencias === null ? (
                    <span className="text-xs text-muted-foreground">Sin datos</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Progress value={s.pctCompetencias} className="h-2 w-20" />
                      <span className="tabular-nums text-xs font-semibold">{s.pctCompetencias}%</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {s.pctEficiencia === null ? (
                    <span className="text-xs text-muted-foreground">Sin datos</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(100, s.pctEficiencia)} className={cn('h-2 w-20', SEMAFORO_BAR_CLASS[semaforo])} />
                      <span className={cn('tabular-nums text-xs font-semibold', SEMAFORO_TEXT_CLASS[semaforo])}>
                        {s.pctEficiencia}%
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {s.ultimaEvaluacion ? (
                    <div>
                      <div>{s.ultimaEvaluacion.fecha}</div>
                      {s.alerta && (
                        <div className="text-[11px] font-medium text-red-500">hace {s.semanasSinEvaluar} sem.</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-red-500">Nunca evaluado</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onVerCurva(s)}
                    title="Ver curva de aprendizaje"
                  >
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
