'use client';

import { Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ShieldHalf, Swords, Tv, X, Users, RefreshCw } from 'lucide-react';
import { listEvaluaciones, getCicloActivo, semanaDeCiclo } from '@/lib/teamx/evaluacion';
import { getEmpleados } from '@/hooks/useEmpleados';
import { getActiveOrgId } from '@/lib/teamx/org';
import { construirTablero, type TableroGladiadores } from '@/lib/teamx/gladiadores';
import type { Empleado } from '@/types/empleado';
import type { Ciclo, Evaluacion } from '@/types/teamx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GlowButton } from '@/components/ui/glow-button';
import { TableroGrid } from './TableroGrid';

export const dynamic = 'force-dynamic';

const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 min, según brief (modo TV)
const SEMANAS_DEFAULT = 14;

function GladiadoresContent() {
  const router = useRouter();
  const params = useSearchParams();
  const tv = params.get('tv') === '1';

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [ciclo, setCiclo] = useState<Ciclo | null>(null);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const cargar = useCallback(async () => {
    const orgId = await getActiveOrgId();
    const [emps, ev, c] = await Promise.all([
      getEmpleados(),
      listEvaluaciones(),
      orgId ? getCicloActivo(orgId) : Promise.resolve(null),
    ]);
    setEmpleados(emps);
    setEvaluaciones(ev);
    setCiclo(c);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Modo TV: auto-refresca los datos cada 5 minutos.
  useEffect(() => {
    if (!tv) return;
    const id = setInterval(cargar, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [tv, cargar]);

  // Modo TV: Escape vuelve a la vista normal.
  useEffect(() => {
    if (!tv) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') router.push('/dashboard/gladiadores');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tv, router]);

  const numSemanas = ciclo?.semanas ?? SEMANAS_DEFAULT;
  const semanaActual = ciclo ? semanaDeCiclo(ciclo) : null;
  const tablero: TableroGladiadores = construirTablero(empleados, evaluaciones, numSemanas);

  if (loading) {
    return (
      <div className={tv ? 'flex h-screen items-center justify-center bg-zinc-950' : 'flex items-center justify-center py-20'}>
        <Loader2 className={tv ? 'h-12 w-12 animate-spin text-white/70' : 'h-8 w-8 animate-spin text-muted-foreground'} />
      </div>
    );
  }

  if (empleados.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-10 w-10 text-muted-foreground" />}
        titulo="Todavía no hay gladiadores en el equipo"
        mensaje="Agrega empleados activos para que aparezcan en el tablero."
        cta={<Button onClick={() => router.push('/dashboard/empleados')}>Ir a Empleados</Button>}
      />
    );
  }

  if (evaluaciones.length === 0) {
    return (
      <EmptyState
        icon={<Swords className="h-10 w-10 text-muted-foreground" />}
        titulo="Aún no hay evaluaciones este ciclo"
        mensaje="En cuanto se registren evaluaciones semanales, cada gladiador mostrará su escudo de eficiencia."
        cta={<GlowButton onClick={() => router.push('/dashboard/evaluaciones/nueva')}>Crear evaluación</GlowButton>}
      />
    );
  }

  if (tv) {
    return (
      <div className="fixed inset-0 z-[999] flex flex-col overflow-hidden bg-zinc-950 text-white">
        <div className="flex items-center justify-between border-b border-white/10 px-8 py-5">
          <div className="flex items-center gap-3">
            <ShieldHalf className="h-8 w-8 text-emerald-400" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Tablero de Gladiadores</h1>
              <p className="text-sm text-white/60">
                {ciclo?.nombre ?? 'Ciclo actual'} · {tablero.filas.length} gladiadores
                {semanaActual ? ` · Semana ${semanaActual} de ${numSemanas}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {tablero.promedioEquipo !== null && (
              <div className="text-right">
                <div className="text-xs uppercase text-white/50">Promedio del equipo</div>
                <div className="text-3xl font-extrabold tabular-nums text-emerald-400">{tablero.promedioEquipo}%</div>
              </div>
            )}
            <button
              onClick={() => router.push('/dashboard/gladiadores')}
              className="rounded-full border border-white/20 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
              title="Salir del modo TV (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-8">
          <TableroGrid tablero={tablero} semanaActual={semanaActual} tv />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-8 py-3 text-xs text-white/40">
          <RefreshCw className="h-3 w-3" />
          Actualizado {lastUpdated ? lastUpdated.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '—'}
          {' · '}se refresca solo cada 5 min
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ShieldHalf className="h-6 w-6 text-emerald-600" /> Tablero de Gladiadores
          </h1>
          <p className="text-muted-foreground">
            Eficiencia semanal del equipo{ciclo?.nombre ? ` · ${ciclo.nombre}` : ''}
            {semanaActual ? ` · Semana ${semanaActual} de ${numSemanas}` : ''}
          </p>
        </div>
        <a href="/dashboard/gladiadores?tv=1" target="_blank" rel="noopener noreferrer">
          <Button variant="outline">
            <Tv className="mr-2 h-4 w-4" /> Modo TV
          </Button>
        </a>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Gladiadores', value: String(tablero.filas.length) },
          { label: 'Promedio del equipo', value: tablero.promedioEquipo !== null ? `${tablero.promedioEquipo}%` : '—' },
          { label: 'Semanas del ciclo', value: String(numSemanas) },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="py-5">
              <div className="text-xs font-semibold uppercase text-muted-foreground">{s.label}</div>
              <div className="mt-1 text-3xl font-extrabold tabular-nums">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TableroGrid tablero={tablero} semanaActual={semanaActual} />

      <p className="mt-3 text-xs text-muted-foreground">
        Semáforo de eficiencia: <span className="font-semibold text-emerald-600">verde &gt;95%</span>,{' '}
        <span className="font-semibold text-amber-600">amarillo 85–95%</span>,{' '}
        <span className="font-semibold text-red-600">rojo &lt;85%</span>, gris = sin evaluación esa semana.
      </p>
    </div>
  );
}

function EmptyState({
  icon, titulo, mensaje, cta,
}: { icon: ReactNode; titulo: string; mensaje: string; cta: ReactNode }) {
  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <ShieldHalf className="h-6 w-6 text-emerald-600" /> Tablero de Gladiadores
      </h1>
      <Card className="mt-6">
        <CardContent className="flex flex-col items-center py-16 text-center">
          {icon}
          <h3 className="mt-3 font-bold">{titulo}</h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{mensaje}</p>
          <div className="mt-4">{cta}</div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function GladiadoresPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <GladiadoresContent />
    </Suspense>
  );
}
