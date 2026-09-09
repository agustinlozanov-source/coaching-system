'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Sparkles,
  Loader2,
  Users,
  ClipboardX,
  MessageCircleQuestion,
  Lightbulb,
  ListChecks,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { getEmpleados } from '@/hooks/useEmpleados';
import { getUltimaEvaluacion } from '@/lib/teamx/evaluacion';
import { buildCopilotContexto, generarCopiloto, type CopilotContexto, type CopilotResponse } from '@/lib/teamx/copilot';
import type { Evaluacion } from '@/types/teamx';
import type { Empleado } from '@/types/empleado';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GlowButton } from '@/components/ui/glow-button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const dynamic = 'force-dynamic';

type EvalStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

export default function CopilotoPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loadingEmpleados, setLoadingEmpleados] = useState(true);
  const [empleadoId, setEmpleadoId] = useState<string>('');

  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null);
  const [evalStatus, setEvalStatus] = useState<EvalStatus>('idle');

  const [generando, setGenerando] = useState(false);
  const [resultado, setResultado] = useState<CopilotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getEmpleados();
        setEmpleados(data);
      } catch (err) {
        console.error('Error al cargar empleados:', err);
      } finally {
        setLoadingEmpleados(false);
      }
    })();
  }, []);

  const empleadoSeleccionado = useMemo(
    () => empleados.find((e) => e.id === empleadoId) ?? null,
    [empleados, empleadoId]
  );

  const contexto: CopilotContexto | null = useMemo(
    () => (evaluacion ? buildCopilotContexto(evaluacion) : null),
    [evaluacion]
  );

  async function handleSeleccionarEmpleado(id: string) {
    setEmpleadoId(id);
    setResultado(null);
    setError(null);
    setEvaluacion(null);
    setEvalStatus('loading');
    try {
      const ev = await getUltimaEvaluacion(id);
      setEvaluacion(ev);
      setEvalStatus(ev ? 'ready' : 'empty');
    } catch (err) {
      console.error('Error al cargar la última evaluación:', err);
      setEvalStatus('error');
    }
  }

  async function handleGenerar() {
    if (!empleadoSeleccionado || !contexto) return;
    setGenerando(true);
    setError(null);
    setResultado(null);
    try {
      const data = await generarCopiloto(empleadoSeleccionado.nombre, contexto);
      setResultado(data);
    } catch (err: any) {
      setError(err?.message || 'No se pudo generar la sugerencia. Intenta de nuevo.');
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-emerald-600" />
          Copiloto de Coaching IA
        </h1>
        <p className="text-muted-foreground mt-1">
          Prepara tu próxima sesión: preguntas poderosas, observaciones y un plan de acción generados a
          partir de la última evaluación del colaborador.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Colaborador</CardTitle>
          <CardDescription>Elige a quién vas a preparar la sesión de coaching.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="w-full sm:max-w-sm">
            <Select
              value={empleadoId}
              onValueChange={handleSeleccionarEmpleado}
              disabled={loadingEmpleados}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingEmpleados ? 'Cargando colaboradores…' : 'Selecciona un colaborador'} />
              </SelectTrigger>
              <SelectContent>
                {empleados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nombre} {e.cargo ? `· ${e.cargo}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <GlowButton onClick={handleGenerar} disabled={evalStatus !== 'ready'} loading={generando} className="sm:ml-auto">
            {generando ? 'Generando…' : 'Generar'}
          </GlowButton>
        </CardContent>
      </Card>

      {evalStatus === 'ready' && evaluacion && contexto && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <span className="text-sm text-muted-foreground">Última evaluación:</span>
            <Badge variant="secondary">Semana {contexto.semana ?? '—'}</Badge>
            <Badge variant="secondary">{contexto.fecha}</Badge>
            <Badge variant={contexto.promedioGeneral !== null && contexto.promedioGeneral < 85 ? 'warning' : 'success'}>
              General {contexto.promedioGeneral ?? 0}%
            </Badge>
            <span className="text-sm text-muted-foreground">{contexto.tendencia}</span>
          </CardContent>
        </Card>
      )}

      {evalStatus === 'idle' && (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-bold">Selecciona un colaborador para comenzar</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              El copiloto usará su última evaluación para generar sugerencias de coaching a la medida.
            </p>
          </CardContent>
        </Card>
      )}

      {evalStatus === 'loading' && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {evalStatus === 'empty' && empleadoSeleccionado && (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <ClipboardX className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-bold">{empleadoSeleccionado.nombre} aún no tiene evaluaciones</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Crea su primera evaluación para poder generar sugerencias de coaching.
            </p>
          </CardContent>
        </Card>
      )}

      {evalStatus === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No se pudo cargar la evaluación</AlertTitle>
          <AlertDescription>Intenta seleccionar el colaborador nuevamente.</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>El copiloto no pudo generar la sugerencia</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={handleGenerar}>
              <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {generando && (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>El copiloto está preparando tu sesión de coaching…</p>
        </div>
      )}

      {resultado && !generando && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircleQuestion className="h-5 w-5 text-emerald-600" />
                Preguntas poderosas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {resultado.preguntas.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="font-bold text-emerald-600">{i + 1}.</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-5 w-5 text-emerald-600" />
                Observaciones y patrones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {resultado.observaciones.map((o, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-600" />
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ListChecks className="h-5 w-5 text-emerald-600" />
                Plan de acción
              </CardTitle>
              <CardDescription>3-4 semanas</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {resultado.plan.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                      {i + 1}
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
