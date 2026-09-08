'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ArrowRight, Search } from 'lucide-react';
import { getEmpleados } from '@/hooks/useEmpleados';
import { crearEvaluacion, getCicloActivo, semanaDeCiclo } from '@/lib/teamx/evaluacion';
import { getActiveOrgId } from '@/lib/teamx/org';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Empleado } from '@/types/empleado';
import type { Ciclo } from '@/types/teamx';

export const dynamic = 'force-dynamic';

const iniciales = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

function NuevaContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [ciclo, setCiclo] = useState<Ciclo | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [seleccion, setSeleccion] = useState<string | null>(params.get('empleadoId'));
  const [semana, setSemana] = useState(1);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    (async () => {
      const orgId = await getActiveOrgId();
      if (orgId) { try { await (await import('@/lib/supabase/client')).createClient().rpc('teamx_seed_defaults', { p_org: orgId }); } catch { /* noop */ } }
      const [emps, c] = await Promise.all([getEmpleados(), orgId ? getCicloActivo(orgId) : Promise.resolve(null)]);
      setEmpleados(emps);
      setCiclo(c);
      setSemana(semanaDeCiclo(c));
      setLoading(false);
    })();
  }, []);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? empleados.filter((e) => e.nombre.toLowerCase().includes(t) || (e.cargo ?? '').toLowerCase().includes(t)) : empleados;
  }, [empleados, q]);

  async function iniciar() {
    if (!seleccion) return;
    setCreando(true);
    try {
      const id = await crearEvaluacion({ empleadoId: seleccion, semana, fecha });
      router.push(`/dashboard/evaluaciones/${id}/editar`);
    } catch {
      toast({ title: 'Error', description: 'No se pudo iniciar la evaluación.', variant: 'destructive' });
      setCreando(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Nueva evaluación · Tablero</p>
        <h1 className="text-2xl font-bold">Elige a quién vas a evaluar</h1>
        <p className="text-muted-foreground">
          {ciclo ? `${ciclo.nombre} · Semana ${semana} de ${ciclo.semanas}` : 'Sin ciclo activo'}
        </p>
      </div>

      {empleados.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Aún no tienes empleados. Agrega uno primero.</p>
          <Button className="mt-4" onClick={() => router.push('/dashboard/empleados')}>Ir a Empleados</Button>
        </CardContent></Card>
      ) : (
        <>
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar empleado…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>

          <div className="mb-6 grid gap-2 sm:grid-cols-2">
            {filtrados.map((e) => {
              const sel = seleccion === e.id;
              return (
                <button key={e.id} onClick={() => setSeleccion(e.id)}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${sel ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'hover:bg-muted/50'}`}>
                  <Avatar className="h-10 w-10"><AvatarFallback>{iniciales(e.nombre)}</AvatarFallback></Avatar>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{e.nombre}</div>
                    <div className="truncate text-sm text-muted-foreground">{e.cargo || '—'}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <Card>
            <CardContent className="flex flex-wrap items-end gap-4 py-5">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Semana del ciclo</label>
                <Input type="number" min={1} max={ciclo?.semanas ?? 14} value={semana}
                  onChange={(e) => setSemana(Number(e.target.value))} className="w-28" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Fecha</label>
                <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-44" />
              </div>
              <Button className="ml-auto" disabled={!seleccion || creando} onClick={iniciar}>
                {creando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Iniciar evaluación <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function NuevaEvaluacionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <NuevaContent />
    </Suspense>
  );
}
