'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowRight, Radar as RadarIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listDiagnosticos } from '@/lib/scanx/diagnostico';
import { TIPO_EMPRESA, VALOR_MAX, type Diagnostico } from '@/types/scanx';

export const dynamic = 'force-dynamic';

export default function ResultadosPage() {
  const [diags, setDiags] = useState<Diagnostico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setDiags(await listDiagnosticos());
      setLoading(false);
    })();
  }, []);

  const completados = useMemo(() => diags.filter((d) => d.estado === 'completado'), [diags]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Resultados</h1>
        <p className="text-muted-foreground">Tus diagnósticos completados y su evolución.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : completados.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center py-16 text-center">
          <RadarIcon className="h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 font-bold">Aún no hay resultados</h3>
          <p className="mt-1 text-sm text-muted-foreground">Completa un diagnóstico para ver aquí tu radar y clasificación.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {completados.map((d) => (
            <Link key={d.id} href={`/scanx/diagnosticos/${d.id}`}
              className="glow-card group flex items-center justify-between rounded-xl border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <div>
                <div className="font-semibold">{d.perfil.nombreEmpresa || 'Empresa'}</div>
                <div className="text-xs text-muted-foreground">
                  {d.completedAt ? new Date(d.completedAt).toLocaleDateString() : new Date(d.createdAt).toLocaleDateString()}
                  {d.resultado?.promedioGeneral != null && ` · ${d.resultado.promedioGeneral.toFixed(2)}/${VALOR_MAX.toFixed(2)}`}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {d.tipoEmpresa && <Badge variant="success">Tipo {d.tipoEmpresa} · {TIPO_EMPRESA[d.tipoEmpresa].nombre}</Badge>}
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
