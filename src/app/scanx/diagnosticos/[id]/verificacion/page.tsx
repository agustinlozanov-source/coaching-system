'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Upload,
  Play,
  Square,
  Trash2,
  ArrowLeft,
  FileText,
  Video,
  Clock,
  ExternalLink,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GlowButton } from '@/components/ui/glow-button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getDiagnostico } from '@/lib/scanx/diagnostico';
import {
  listEvidencias,
  subirArchivo,
  urlFirmada,
  crearEvidencia,
  eliminarEvidencia,
  type Evidencia,
} from '@/lib/scanx/evidencia';
import { DIMENSIONES } from '@/types/scanx';
import type { Diagnostico } from '@/types/scanx';

export const dynamic = 'force-dynamic';

/** Formatea segundos como mm:ss. */
function fmt(segundos: number | null | undefined): string {
  const s = Math.max(0, Math.floor(segundos ?? 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

/** Deriva la extensión de un nombre de archivo. */
function extDe(nombre: string): string {
  const i = nombre.lastIndexOf('.');
  return i >= 0 ? nombre.slice(i + 1).toLowerCase() : 'bin';
}

export default function VerificacionPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { toast } = useToast();

  const [diag, setDiag] = useState<Diagnostico | null>(null);
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Evidencia documental ---
  const [docDimension, setDocDimension] = useState<string>('');
  const [docDescripcion, setDocDescripcion] = useState('');
  const [subiendoDoc, setSubiendoDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- Timed challenge ---
  const [retoDescripcion, setRetoDescripcion] = useState('');
  const [retoMinutos, setRetoMinutos] = useState('');
  const [grabarPantalla, setGrabarPantalla] = useState(false);
  const [retoActivo, setRetoActivo] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finalizandoReto, setFinalizandoReto] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const grabandoRef = useRef<boolean>(false);

  async function recargar() {
    const list = await listEvidencias(id);
    setEvidencias(list);
  }

  useEffect(() => {
    (async () => {
      try {
        const [d, list] = await Promise.all([getDiagnostico(id), listEvidencias(id)]);
        setDiag(d);
        setEvidencias(list);
      } catch {
        toast({
          variant: 'destructive',
          title: 'Error al cargar',
          description: 'No se pudo cargar la verificación.',
        });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Limpieza al desmontar: intervalos y streams abiertos.
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // --- Documental ---
  function abrirSelectorArchivo() {
    fileInputRef.current?.click();
  }

  async function onArchivoElegido(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Permite volver a elegir el mismo archivo después.
    e.target.value = '';
    if (!file) return;
    setSubiendoDoc(true);
    try {
      const ext = extDe(file.name);
      const path = await subirArchivo(id, file, ext);
      if (!path) {
        toast({
          variant: 'destructive',
          title: 'No se pudo subir',
          description: 'Falló la carga del documento. Intenta de nuevo.',
        });
        return;
      }
      await crearEvidencia(id, {
        tipo: 'documento',
        dimension: docDimension || null,
        descripcion: docDescripcion.trim() || null,
        archivoUrl: path,
      });
      setDocDescripcion('');
      setDocDimension('');
      await recargar();
      toast({ title: 'Documento subido', description: 'La evidencia quedó registrada.' });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo registrar la evidencia.',
      });
    } finally {
      setSubiendoDoc(false);
    }
  }

  // --- Timed challenge ---
  async function iniciarReto() {
    if (retoActivo) return;
    // Reinicia estado de grabación.
    chunksRef.current = [];
    grabandoRef.current = false;
    recorderRef.current = null;
    streamRef.current = null;

    if (grabarPantalla) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (ev: BlobEvent) => {
          if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
        };
        recorder.start();
        recorderRef.current = recorder;
        grabandoRef.current = true;
      } catch {
        toast({
          title: 'Sin grabación',
          description: 'No se autorizó la grabación de pantalla; el reto sigue sin video.',
        });
      }
    }

    startRef.current = Date.now();
    setElapsed(0);
    setRetoActivo(true);
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
  }

  /** Espera el blob final del MediaRecorder tras detenerlo. */
  function detenerGrabacion(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || !grabandoRef.current) {
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        resolve(blob.size > 0 ? blob : null);
      };
      try {
        recorder.stop();
      } catch {
        resolve(null);
      }
    });
  }

  async function terminarReto() {
    if (!retoActivo || finalizandoReto) return;
    setFinalizandoReto(true);

    // Detiene el cronómetro.
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const segundosReales = Math.floor((Date.now() - startRef.current) / 1000);

    try {
      let path: string | null = null;
      const grababa = grabandoRef.current;

      if (grababa) {
        const blob = await detenerGrabacion();
        // Detiene todas las pistas del stream.
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        if (blob) {
          path = await subirArchivo(id, blob, 'webm');
          if (!path) {
            toast({
              variant: 'destructive',
              title: 'Grabación no guardada',
              description: 'El reto se registró, pero el video no se pudo subir.',
            });
          }
        }
      }

      const minutos = Number(retoMinutos);
      const tiempoDeclarado = !isNaN(minutos) && minutos > 0 ? Math.round(minutos * 60) : null;

      await crearEvidencia(id, {
        tipo: grababa ? 'video' : 'timed',
        descripcion: retoDescripcion.trim() || null,
        tiempoDeclarado,
        tiempoReal: segundosReales,
        completado: true,
        archivoUrl: path,
      });

      await recargar();
      toast({ title: 'Reto completado', description: `Tiempo real: ${fmt(segundosReales)}.` });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo registrar el reto.',
      });
    } finally {
      // Reset del estado del reto.
      streamRef.current = null;
      recorderRef.current = null;
      chunksRef.current = [];
      grabandoRef.current = false;
      setRetoActivo(false);
      setElapsed(0);
      setRetoDescripcion('');
      setRetoMinutos('');
      setGrabarPantalla(false);
      setFinalizandoReto(false);
    }
  }

  // --- Evidencias registradas ---
  async function verEvidencia(path: string) {
    try {
      const url = await urlFirmada(path);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        toast({
          variant: 'destructive',
          title: 'No disponible',
          description: 'No se pudo generar el enlace del archivo.',
        });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo abrir el archivo.' });
    }
  }

  async function borrarEvidencia(evId: string) {
    if (!window.confirm('¿Eliminar esta evidencia? Esta acción no se puede deshacer.')) return;
    try {
      await eliminarEvidencia(evId);
      await recargar();
      toast({ title: 'Evidencia eliminada' });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar la evidencia.',
      });
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!diag) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <p className="text-lg font-semibold">No encontrado</p>
        <p className="mt-1 text-sm text-muted-foreground">
          El diagnóstico solicitado no existe o no tienes acceso.
        </p>
        <Link href="/scanx/diagnosticos" className="mt-4 inline-block">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a diagnósticos
          </Button>
        </Link>
      </div>
    );
  }

  const empresa = diag.perfil?.nombreEmpresa || 'Tu empresa';
  const declaradoSeg =
    !isNaN(Number(retoMinutos)) && Number(retoMinutos) > 0 ? Math.round(Number(retoMinutos) * 60) : 0;
  const seExcedio = declaradoSeg > 0 && elapsed > declaradoSeg;

  const iconoPorTipo = (tipo: Evidencia['tipo']) => {
    if (tipo === 'documento') return <FileText className="h-5 w-5 text-muted-foreground" />;
    if (tipo === 'video') return <Video className="h-5 w-5 text-muted-foreground" />;
    return <Clock className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      {/* Header */}
      <div>
        <Link
          href={`/scanx/diagnosticos/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al diagnóstico
        </Link>
        <h1 className="mt-3 text-2xl font-bold">Verificación (Capa 3)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          La confianza se gana: sube evidencia y demuestra en vivo lo que declaras.
        </p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {empresa}
        </p>
      </div>

      {/* Evidencia documental */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <FileText className="h-5 w-5" /> Evidencia documental
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Adjunta documentos que respalden lo que declaraste en el diagnóstico.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Dimensión</Label>
              <Select value={docDimension} onValueChange={setDocDimension}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una dimensión" />
                </SelectTrigger>
                <SelectContent>
                  {DIMENSIONES.map((d) => (
                    <SelectItem key={d.id} value={d.nombre}>
                      {d.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>¿Qué demuestra este documento?</Label>
            <Textarea
              value={docDescripcion}
              onChange={(e) => setDocDescripcion(e.target.value)}
              placeholder="Ej. Pipeline de la semana pasada"
              rows={2}
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
            className="hidden"
            onChange={onArchivoElegido}
          />
          <Button variant="outline" onClick={abrirSelectorArchivo} disabled={subiendoDoc}>
            {subiendoDoc ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {subiendoDoc ? 'Subiendo…' : 'Subir documento'}
          </Button>
        </CardContent>
      </Card>

      {/* Timed challenge */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Clock className="h-5 w-5" /> Timed challenge (reto cronometrado)
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Declara qué vas a demostrar y en cuánto tiempo. Luego hazlo en vivo.
            </p>
          </div>

          {!retoActivo ? (
            <>
              <div className="space-y-1.5">
                <Label>¿Qué vas a demostrar?</Label>
                <Textarea
                  value={retoDescripcion}
                  onChange={(e) => setRetoDescripcion(e.target.value)}
                  placeholder="Ej. Extraer el estado de resultados del último mes"
                  rows={2}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Tiempo declarado (minutos)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.5"
                    value={retoMinutos}
                    onChange={(e) => setRetoMinutos(e.target.value)}
                    placeholder="Ej. 5"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={grabarPantalla}
                      onChange={(e) => setGrabarPantalla(e.target.checked)}
                      className="h-4 w-4 rounded border-input accent-[#1aab99]"
                    />
                    Grabar pantalla
                  </label>
                </div>
              </div>

              <GlowButton onClick={iniciarReto} icon={<Play className="h-4 w-4" />}>
                Iniciar reto
              </GlowButton>

              <p className="text-xs text-muted-foreground">
                El screen recording funciona mejor en Chrome de escritorio; necesita tu autorización.
              </p>
            </>
          ) : (
            <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-5 text-center">
              {grabandoRef.current && (
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-500">
                  <Circle className="h-3 w-3 animate-pulse fill-red-500 text-red-500" /> Grabando
                </div>
              )}
              {retoDescripcion.trim() && (
                <p className="text-sm text-muted-foreground">{retoDescripcion.trim()}</p>
              )}
              <p
                className={`font-mono text-5xl font-extrabold tabular-nums ${
                  seExcedio ? 'text-red-500' : 'text-foreground'
                }`}
              >
                {fmt(elapsed)}
              </p>
              {declaradoSeg > 0 && (
                <p className="text-xs text-muted-foreground">
                  Declarado: {fmt(declaradoSeg)}
                  {seExcedio ? ' · tiempo excedido' : ''}
                </p>
              )}
              <Button onClick={terminarReto} disabled={finalizandoReto} variant="destructive">
                {finalizandoReto ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Square className="mr-2 h-4 w-4" />
                )}
                {finalizandoReto ? 'Guardando…' : 'Terminé'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evidencias registradas */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">Evidencias registradas</h2>
        {evidencias.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Aún no hay evidencias. Sube un documento o completa un reto para empezar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {evidencias.map((ev) => (
              <Card key={ev.id}>
                <CardContent className="flex items-start gap-3 py-4">
                  <div className="mt-0.5 shrink-0">{iconoPorTipo(ev.tipo)}</div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">
                        {ev.descripcion || <span className="text-muted-foreground">Sin descripción</span>}
                      </p>
                      {ev.dimension && <Badge variant="secondary">{ev.dimension}</Badge>}
                      {ev.completado && ev.tipo !== 'documento' && (
                        <Badge variant="outline">Completado</Badge>
                      )}
                    </div>
                    {(ev.tipo === 'timed' || ev.tipo === 'video') && (
                      <p className="text-xs text-muted-foreground tabular-nums">
                        Declarado {fmt(ev.tiempoDeclarado)} · Real {fmt(ev.tiempoReal)}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {ev.archivoUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => verEvidencia(ev.archivoUrl as string)}
                      >
                        <ExternalLink className="mr-1.5 h-4 w-4" /> Ver
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => borrarEvidencia(ev.id)}
                      aria-label="Eliminar evidencia"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
