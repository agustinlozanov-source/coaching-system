'use client';

/**
 * Importador de tableros.
 *
 * Quien ya trabajó sus dimensiones en otro lado suelta el documento aquí en
 * vez de volver a dictarlas. El documento se lee SIN IA — parseo directo, y
 * por eso importar nunca falla ni cuesta. La IA entra en dos botones
 * opcionales: sacar estructura de un texto en prosa, y revisar lo que quedó.
 *
 * Nada se guarda hasta que la persona lo revisa y le da guardar.
 */

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/teamx/org';
import {
  leerTablero, faltantesDelCanon, COLORES_DIMENSION,
  type DimensionImportada,
} from '@/lib/teamx/importar-tablero';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  AlertCircle, ArrowLeft, Check, FileText, Loader2, Plus, Sparkles, Trash2, Upload, X,
} from 'lucide-react';

type Observacion = {
  tipo: 'abstracto' | 'duplicado' | 'kpi' | 'falta';
  dimension: string;
  aspecto: string | null;
  propuesta: string;
  motivo: string;
};

const ETIQUETA: Record<Observacion['tipo'], string> = {
  abstracto: 'No se puede observar',
  duplicado: 'Repetido',
  kpi: 'Esto es un KPI',
  falta: 'Falta',
};

const EJEMPLO = `## Planeación y Organización
Cómo organiza su semana y si deja rastro de lo que va a hacer.
peso: 2
- Creación de agenda semanal en Asana — Cargada antes del lunes a las 9am
- Reunión de alineación semanal

## Eficiencia (KPI)
- Piezas vendidas contra meta`;

export default function ImportarTableroPage() {
  const router = useRouter();
  const { toast } = useToast();
  const inputFile = useRef<HTMLInputElement>(null);

  const [texto, setTexto] = useState('');
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [arrastrando, setArrastrando] = useState(false);

  const [dims, setDims] = useState<DimensionImportada[] | null>(null);
  const [ignoradas, setIgnoradas] = useState<string[]>([]);

  const [obs, setObs] = useState<Observacion[] | null>(null);
  const [pensando, setPensando] = useState<'extraer' | 'revisar' | null>(null);
  const [guardando, setGuardando] = useState(false);

  /* ── Entrada ─────────────────────────────────────────────────────────── */

  const leerArchivo = useCallback(async (file: File) => {
    const ext = file.name.toLowerCase().split('.').pop() ?? '';
    if (!['md', 'markdown', 'txt', 'csv', 'text'].includes(ext)) {
      toast({
        title: 'Ese formato todavía no',
        description: 'Por ahora .md, .txt y .csv. Si es Word o PDF, ábrelo, copia el texto y pégalo aquí.',
        variant: 'destructive',
      });
      return;
    }
    const contenido = await file.text();
    setNombreArchivo(file.name);
    setTexto(contenido);
    procesar(contenido);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function procesar(contenido: string) {
    const r = leerTablero(contenido);
    setDims(r.dimensiones);
    setIgnoradas(r.ignoradas);
    setObs(null);
  }

  /* ── IA (opcional) ───────────────────────────────────────────────────── */

  async function extraerConIA() {
    setPensando('extraer');
    try {
      const resp = await fetch('/api/teamx/tablero-ia', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tarea: 'extraer', texto }),
      });
      const data = await resp.json();
      if (data?.error) throw new Error(data.error);
      const leidas: DimensionImportada[] = (data.dimensiones ?? []).map((d: any) => ({
        nombre: String(d.nombre ?? '').trim(),
        descripcion: d.descripcion ? String(d.descripcion).trim() : undefined,
        naturaleza: d.naturaleza === 'kpi' ? 'kpi' : 'competencia',
        peso: 1,
        aspectos: (d.aspectos ?? [])
          .map((a: any) => (typeof a === 'string'
            ? { nombre: a.trim() }
            : { nombre: String(a?.nombre ?? '').trim(), descripcion: a?.descripcion ? String(a.descripcion).trim() : undefined }))
          .filter((a: any) => a.nombre),
      })).filter((d: DimensionImportada) => d.nombre && d.aspectos.length);
      if (!leidas.length) {
        toast({ title: 'No encontró un tablero ahí', description: 'Prueba dándole más detalle de las dimensiones y sus puntos.' });
      }
      setDims(leidas);
      setIgnoradas([]);
      setObs(null);
    } catch (e: any) {
      toast({ title: 'La IA no respondió', description: e?.message ?? '', variant: 'destructive' });
    } finally {
      setPensando(null);
    }
  }

  async function revisarConIA() {
    if (!dims) return;
    setPensando('revisar');
    try {
      const resp = await fetch('/api/teamx/tablero-ia', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tarea: 'revisar', dimensiones: dims, faltantes: faltantesDelCanon(dims) }),
      });
      const data = await resp.json();
      if (data?.error) throw new Error(data.error);
      setObs(data.observaciones ?? []);
      if (!(data.observaciones ?? []).length) {
        toast({ title: 'Sin observaciones', description: 'El tablero se ve bien así.' });
      }
    } catch (e: any) {
      toast({ title: 'La IA no respondió', description: e?.message ?? '', variant: 'destructive' });
    } finally {
      setPensando(null);
    }
  }

  function aplicar(o: Observacion) {
    setDims((prev) => {
      if (!prev) return prev;
      const copia = prev.map((d) => ({ ...d, aspectos: [...d.aspectos] }));
      const dim = copia.find((d) => d.nombre.toLowerCase() === o.dimension.toLowerCase());

      if (o.tipo === 'falta') {
        if (!dim) copia.push({ nombre: o.propuesta || o.dimension, naturaleza: 'competencia', peso: 1, aspectos: [] });
      } else if (o.tipo === 'kpi') {
        if (dim) dim.naturaleza = 'kpi';
      } else if (dim && o.aspecto) {
        const i = dim.aspectos.findIndex((a) => a.nombre.toLowerCase() === o.aspecto!.toLowerCase());
        if (i !== -1) {
          if (o.tipo === 'duplicado') dim.aspectos.splice(i, 1);
          else dim.aspectos[i] = { nombre: o.propuesta };
        }
      }
      return copia;
    });
    setObs((prev) => (prev ?? []).filter((x) => x !== o));
  }

  /* ── Edición de la propuesta ─────────────────────────────────────────── */

  function editarDim(i: number, patch: Partial<DimensionImportada>) {
    setDims((prev) => prev!.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  }
  function quitarDim(i: number) {
    setDims((prev) => prev!.filter((_, j) => j !== i));
  }
  function editarAsp(i: number, j: number, patch: Partial<{ nombre: string; descripcion: string }>) {
    setDims((prev) => prev!.map((d, x) => (x === i
      ? { ...d, aspectos: d.aspectos.map((a, y) => (y === j ? { ...a, ...patch } : a)) } : d)));
  }
  function quitarAsp(i: number, j: number) {
    setDims((prev) => prev!.map((d, x) => (x === i
      ? { ...d, aspectos: d.aspectos.filter((_, y) => y !== j) } : d)));
  }
  function agregarAsp(i: number) {
    setDims((prev) => prev!.map((d, x) => (x === i
      ? { ...d, aspectos: [...d.aspectos, { nombre: '' }] } : d)));
  }

  /* ── Guardado ────────────────────────────────────────────────────────── */

  async function guardar(modo: 'agregar' | 'reemplazar') {
    if (!dims?.length) return;
    const limpias = dims
      .map((d) => ({
        ...d,
        nombre: d.nombre.trim(),
        descripcion: d.descripcion?.trim() || undefined,
        aspectos: d.aspectos.filter((a) => a.nombre.trim()),
      }))
      .filter((d) => d.nombre);
    if (!limpias.length) return;

    if (modo === 'reemplazar' && !window.confirm(
      'Esto borra las dimensiones que tenga hoy el tablero y deja solo éstas.\n\n' +
      'Las evaluaciones ya hechas no se tocan: cada una guarda su propia configuración.',
    )) return;

    setGuardando(true);
    const supabase = createClient();
    const orgId = await getActiveOrgId();
    if (!orgId) { setGuardando(false); return; }

    try {
      if (modo === 'reemplazar') {
        const { error } = await supabase.from('teamx_dimensiones').delete().eq('organizacion_id', orgId);
        if (error) throw error;
      }

      const { data: previas } = await supabase.from('teamx_dimensiones')
        .select('orden').eq('organizacion_id', orgId).order('orden', { ascending: false }).limit(1);
      let orden = (previas?.[0]?.orden ?? 0) + 1;

      for (const d of limpias) {
        const { data: fila, error } = await supabase.from('teamx_dimensiones').insert({
          organizacion_id: orgId, nombre: d.nombre, descripcion: d.descripcion ?? null,
          naturaleza: d.naturaleza, peso: d.peso, orden,
          color: COLORES_DIMENSION[orden % COLORES_DIMENSION.length], activo: true,
        }).select('id').single();
        if (error) throw error;
        orden++;

        if (d.aspectos.length) {
          const { error: e2 } = await supabase.from('teamx_aspectos').insert(
            d.aspectos.map((a, k) => ({
              dimension_id: fila.id,
              nombre: a.nombre.trim(),
              descripcion: a.descripcion?.trim() || null,
              orden: k + 1,
              activo: true,
            })),
          );
          if (e2) throw e2;
        }
      }

      toast({
        title: 'Tablero cargado',
        description: `${limpias.length} dimensiones y ${limpias.reduce((s, d) => s + d.aspectos.length, 0)} aspectos.`,
      });
      router.push('/dashboard/admin/competencias');
    } catch (e: any) {
      toast({ title: 'No se pudo guardar', description: e?.message ?? '', variant: 'destructive' });
    } finally {
      setGuardando(false);
    }
  }

  const totalAspectos = dims?.reduce((s, d) => s + d.aspectos.length, 0) ?? 0;
  const faltantes = dims ? faltantesDelCanon(dims) : [];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/admin/competencias')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver al tablero
      </Button>

      {/* ── Entrada ── */}
      <Card>
        <CardHeader>
          <CardTitle>Traer un tablero escrito</CardTitle>
          <CardDescription>
            Si ya lo trabajaste en otro lado, suéltalo aquí en vez de volver a capturarlo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => {
              e.preventDefault(); setArrastrando(false);
              const f = e.dataTransfer.files?.[0];
              if (f) leerArchivo(f);
            }}
            onClick={() => inputFile.current?.click()}
            className={`flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed p-8 text-center transition ${
              arrastrando ? 'border-emerald-500 bg-emerald-50' : 'hover:bg-muted/40'
            }`}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">
              {nombreArchivo || 'Arrastra tu documento, o haz clic para buscarlo'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              .md, .txt o .csv — si es Word o PDF, copia el texto y pégalo abajo
            </p>
            <input
              ref={inputFile} type="file" accept=".md,.markdown,.txt,.csv,text/plain" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) leerArchivo(f); }}
            />
          </div>

          <div className="space-y-2">
            <Textarea
              value={texto}
              onChange={(e) => { setTexto(e.target.value); setNombreArchivo(''); }}
              placeholder={`O pega el texto aquí.\n\n${EJEMPLO}`}
              className="min-h-40 font-mono text-xs"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => procesar(texto)} disabled={!texto.trim()}>
                <FileText className="mr-2 h-4 w-4" /> Leer
              </Button>
              <Button variant="outline" onClick={extraerConIA} disabled={!texto.trim() || pensando !== null}>
                {pensando === 'extraer'
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Sparkles className="mr-2 h-4 w-4" />}
                Que lo saque la IA
              </Button>
              <span className="text-xs text-muted-foreground">
                Leer es gratis e instantáneo. La IA es para cuando el texto viene en prosa.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Propuesta ── */}
      {dims !== null && (
        <>
          {dims.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No se encontraron dimensiones con aspectos debajo. Revisa que cada bloque tenga su
                título y sus puntos, o prueba con «Que lo saque la IA».
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>Esto se va a cargar</CardTitle>
                  <CardDescription>
                    {dims.length} dimensiones · {totalAspectos} aspectos · revísalo antes de guardar
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={revisarConIA} disabled={pensando !== null}>
                  {pensando === 'revisar'
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <Sparkles className="mr-2 h-4 w-4" />}
                  Revisar con IA
                </Button>
              </CardHeader>

              <CardContent className="space-y-5">
                {obs !== null && obs.length > 0 && (
                  <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-medium">Observaciones — acepta las que quieras</p>
                    {obs.map((o, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg bg-white p-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                            {ETIQUETA[o.tipo]} · {o.dimension}
                          </p>
                          {o.aspecto && <p className="mt-1 text-sm text-muted-foreground line-through">{o.aspecto}</p>}
                          <p className="text-sm font-medium">{o.propuesta}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{o.motivo}</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => aplicar(o)} title="Aceptar">
                          <Check className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setObs(obs.filter((x) => x !== o))} title="Descartar">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {faltantes.length > 0 && (
                  <p className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-muted-foreground">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    <span>
                      De las dimensiones de la casa no aparecen: <strong>{faltantes.join(', ')}</strong>.
                      Puede estar bien si este equipo no las necesita.
                    </span>
                  </p>
                )}

                {dims.map((d, i) => (
                  <div key={i} className="rounded-xl border p-4">
                    <div className="flex items-center gap-2">
                      <Input
                        value={d.nombre}
                        onChange={(e) => editarDim(i, { nombre: e.target.value })}
                        className="h-9 font-semibold"
                      />
                      <select
                        value={d.naturaleza}
                        onChange={(e) => editarDim(i, { naturaleza: e.target.value as any })}
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="competencia">Competencia</option>
                        <option value="kpi">KPI</option>
                      </select>
                      <Button size="sm" variant="ghost" onClick={() => quitarDim(i)}
                        className="text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <Input
                      value={d.descripcion ?? ''}
                      onChange={(e) => editarDim(i, { descripcion: e.target.value })}
                      placeholder="Para qué sirve esta dimensión (opcional)"
                      className="mt-2 h-8 text-xs"
                    />

                    <div className="mt-3 space-y-1.5 border-t pt-3">
                      {d.aspectos.map((a, j) => (
                        <div key={j} className="flex items-start gap-2">
                          <div className="flex-1 space-y-1">
                            <Input
                              value={a.nombre}
                              onChange={(e) => editarAsp(i, j, { nombre: e.target.value })}
                              className="h-8 text-sm"
                            />
                            <Input
                              value={a.descripcion ?? ''}
                              onChange={(e) => editarAsp(i, j, { descripcion: e.target.value })}
                              placeholder="Cómo se sabe que se cumple (opcional)"
                              className="h-7 text-xs text-muted-foreground"
                            />
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => quitarAsp(i, j)}
                            className="text-red-600 hover:bg-red-50">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                      <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => agregarAsp(i)}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" /> Agregar aspecto
                      </Button>
                    </div>
                  </div>
                ))}

                {ignoradas.length > 0 && (
                  <details className="rounded-lg border bg-muted/30 p-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      {ignoradas.length} línea{ignoradas.length === 1 ? '' : 's'} que no se acomodaron
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {ignoradas.map((l, i) => (
                        <li key={i} className="text-xs text-muted-foreground">{l}</li>
                      ))}
                    </ul>
                  </details>
                )}

                <div className="flex flex-wrap items-center gap-3 border-t pt-5">
                  <Button onClick={() => guardar('agregar')} disabled={guardando}>
                    {guardando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Agregar a lo que ya hay
                  </Button>
                  <Button variant="outline" onClick={() => guardar('reemplazar')} disabled={guardando}
                    className="border-red-200 text-red-600 hover:bg-red-50">
                    Reemplazar el tablero
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
