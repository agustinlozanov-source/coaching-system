'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, ClipboardList } from 'lucide-react';
import { GlowButton } from '@/components/ui/glow-button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { crearDiagnostico, listDiagnosticos } from '@/lib/scanx/diagnostico';
import { TIPO_EMPRESA, type Diagnostico } from '@/types/scanx';

export const dynamic = 'force-dynamic';

export default function DiagnosticosPage() {
  const router = useRouter();
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    (async () => {
      setDiagnosticos(await listDiagnosticos());
      setLoading(false);
    })();
  }, []);

  // Crea un diagnóstico en blanco y entra a la experiencia DX21, donde el
  // primer tab (Perfil de empresa) captura el contexto dentro de la estructura.
  async function nuevo() {
    setCreando(true);
    try {
      const id = await crearDiagnostico({});
      router.push(`/scanx/diagnosticos/${id}/dx21`);
    } catch {
      setCreando(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Diagnósticos</h1>
          <p className="text-muted-foreground">Radiografías de tu empresa. Inicia uno nuevo o continúa el que dejaste a medias.</p>
        </div>
        <GlowButton onClick={nuevo} loading={creando} icon={<ArrowRight size={16} className="ml-0.5" />}>
          Nuevo diagnóstico
        </GlowButton>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : diagnosticos.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center py-16 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 font-bold">Aún no has hecho un diagnóstico</h3>
          <p className="mt-1 text-sm text-muted-foreground">Inicia el primero: el asistente te guía paso a paso.</p>
          <GlowButton onClick={nuevo} loading={creando} icon={<ArrowRight size={16} className="ml-0.5" />} className="mt-5">
            Crear mi primer diagnóstico
          </GlowButton>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {diagnosticos.map((d) => (
            <Link key={d.id} href={`/scanx/diagnosticos/${d.id}${d.dx21 ? '/dx21' : ''}`}
              className="glow-card group flex items-center justify-between rounded-xl border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <div>
                <div className="font-semibold">{d.perfil.nombreEmpresa || 'Empresa sin nombre'}</div>
                <div className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-3">
                {d.estado === 'completado' && d.tipoEmpresa ? (
                  <Badge variant="success">Tipo {d.tipoEmpresa} · {TIPO_EMPRESA[d.tipoEmpresa].nombre}</Badge>
                ) : (
                  <Badge variant="secondary">En progreso</Badge>
                )}
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
