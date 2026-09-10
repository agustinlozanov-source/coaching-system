'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowRight, Radar as RadarIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { GlowButton } from '@/components/ui/glow-button';
import { Button } from '@/components/ui/button';
import { RadarScanx } from '@/components/scanx/RadarScanx';
import { listDiagnosticos } from '@/lib/scanx/diagnostico';
import { SEMAFORO_COLOR, TIPO_EMPRESA, type Diagnostico, type ResultadoDimension } from '@/types/scanx';

export const dynamic = 'force-dynamic';

export default function ScanxInicio() {
  const [diags, setDiags] = useState<Diagnostico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setDiags(await listDiagnosticos());
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const total = diags.length;
    const completados = diags.filter((d) => d.estado === 'completado');
    const ultimo = completados[0] ?? null; // listDiagnosticos viene ordenado por fecha desc
    return { total, completados: completados.length, ultimo };
  }, [diags]);

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;
  }

  const ultimo = stats.ultimo;
  const resultado = ultimo?.resultado ?? null;
  const top: ResultadoDimension[] = resultado
    ? resultado.top3
        .map((tid) => resultado.dimensiones.find((d) => d.id === tid))
        .filter((x): x is ResultadoDimension => !!x)
    : [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inicio</h1>
          <p className="text-muted-foreground">Tu radiografía empresarial de un vistazo.</p>
        </div>
        <Link href="/scanx/diagnosticos">
          <GlowButton icon={<ArrowRight size={16} className="ml-0.5" />}>Nuevo diagnóstico</GlowButton>
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Diagnósticos', value: stats.total },
          { label: 'Completados', value: stats.completados },
          { label: 'Tipo de empresa', value: ultimo?.tipoEmpresa ? `Tipo ${ultimo.tipoEmpresa}` : '—' },
        ].map((s) => (
          <Card key={s.label}><CardContent className="py-5">
            <div className="text-xs font-semibold uppercase text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-3xl font-extrabold tabular-nums">{s.value}</div>
          </CardContent></Card>
        ))}
      </div>

      {resultado && ultimo ? (
        <Card><CardContent className="grid gap-6 py-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Último diagnóstico</p>
            <p className="text-lg font-bold">{ultimo.perfil.nombreEmpresa || 'Tu empresa'}</p>
            <RadarScanx dims={resultado.dimensiones} size={280} />
          </div>
          <div className="flex flex-col justify-center gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Clasificación</p>
              <p className="text-xl font-extrabold">
                Tipo {ultimo.tipoEmpresa} · {ultimo.tipoEmpresa ? TIPO_EMPRESA[ultimo.tipoEmpresa].nombre : ''}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top 3 prioridades</p>
              <ol className="space-y-1.5">
                {top.map((d, i) => (
                  <li key={d.id} className="flex items-center gap-2 text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-[11px] font-bold text-white">{i + 1}</span>
                    <span className="flex-1 font-medium">{d.nombre}</span>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEMAFORO_COLOR[d.semaforo] }} />
                  </li>
                ))}
              </ol>
            </div>
            <Link href={`/scanx/diagnosticos/${ultimo.id}`}>
              <Button variant="outline" className="w-full">Ver resultado completo <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </Link>
          </div>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="flex flex-col items-center py-16 text-center">
          <RadarIcon className="h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 font-bold">Aún no tienes un diagnóstico completado</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Haz tu primera radiografía en 15-20 minutos y descubre tu tipo de empresa y tus 3 prioridades.
          </p>
          <Link href="/scanx/diagnosticos" className="mt-4">
            <GlowButton icon={<ArrowRight size={16} className="ml-0.5" />}>Iniciar diagnóstico</GlowButton>
          </Link>
        </CardContent></Card>
      )}
    </div>
  );
}
