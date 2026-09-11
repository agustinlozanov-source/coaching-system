'use client';

import { useRef, useState } from 'react';
import { Mic, Square, Sparkles, Loader2, Plus, FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlowButton } from '@/components/ui/glow-button';
import { useToast } from '@/hooks/use-toast';
import { actualizarReunion, crearAcuerdo } from '@/lib/boardx/data';
import {
  PRIORIDAD, CLASIFICACION, type Acuerdo, type Reunion, type TipoAcuerdo, type Prioridad, type Clasificacion,
} from '@/types/boardx';

type Sugerido = { texto: string; tipo?: TipoAcuerdo; prioridad?: Prioridad; clasificacion?: Clasificacion; responsable?: string | null };

async function ia(tarea: string, payload: Record<string, unknown>) {
  const r = await fetch('/api/boardx/ia', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tarea, ...payload }),
  });
  return r.json();
}

export function ReunionIA({ reunion, boardId, acuerdos, onReload, readOnly }: {
  reunion: Reunion; boardId: string; acuerdos: Acuerdo[]; onReload: () => void; readOnly?: boolean;
}) {
  const { toast } = useToast();
  const [transcript, setTranscript] = useState(reunion.transcripcion ?? '');
  const [grabando, setGrabando] = useState(false);
  const recRef = useRef<any>(null);

  const [sugeridos, setSugeridos] = useState<Sugerido[]>([]);
  const [extrayendo, setExtrayendo] = useState(false);
  const [resumen, setResumen] = useState(reunion.resumen ?? null);
  const [resumiendo, setResumiendo] = useState(false);

  const [query, setQuery] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [respuesta, setRespuesta] = useState('');

  function guardarTranscript(txt: string) {
    setTranscript(txt);
    actualizarReunion(reunion.id, { transcripcion: txt }).catch(() => {});
  }

  function toggleGrabar() {
    if (grabando) { recRef.current?.stop(); setGrabando(false); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast({ title: 'Tu navegador no soporta transcripción en vivo', description: 'Usa Chrome, o escribe/pega la transcripción.', variant: 'destructive' }); return; }
    const rec = new SR();
    rec.lang = 'es-MX'; rec.continuous = true; rec.interimResults = true;
    let base = transcript;
    rec.onresult = (e: any) => {
      let fin = '';
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) fin += e.results[i][0].transcript + ' ';
      if (fin) { base = (base + ' ' + fin).trim(); setTranscript(base); }
    };
    rec.onerror = () => { setGrabando(false); };
    rec.onend = () => { setGrabando(false); guardarTranscript(base); };
    rec.start(); recRef.current = rec; setGrabando(true);
  }

  async function extraer() {
    if (!transcript.trim()) { toast({ title: 'No hay transcripción para analizar' }); return; }
    setExtrayendo(true);
    const res = await ia('extraer', { transcripcion: transcript });
    setExtrayendo(false);
    if (res.error) { toast({ title: 'Error de IA', description: res.error, variant: 'destructive' }); return; }
    setSugeridos(res.acuerdos ?? []);
    if (!res.acuerdos?.length) toast({ title: 'La IA no encontró acuerdos claros' });
  }

  async function agregarSugerido(s: Sugerido, idx: number) {
    try {
      await crearAcuerdo(boardId, {
        reunionId: reunion.id, texto: s.texto, tipo: s.tipo ?? 'reunion',
        prioridad: s.prioridad ?? 'media', clasificacion: s.clasificacion ?? 'tactico', responsable: s.responsable ?? null,
      });
      setSugeridos((prev) => prev.filter((_, i) => i !== idx));
      onReload();
    } catch { toast({ title: 'No se pudo agregar', variant: 'destructive' }); }
  }

  async function generarResumen() {
    setResumiendo(true);
    const contexto = {
      nombre: reunion.nombre, tematica: reunion.tematica, kpi: reunion.kpiPrincipal,
      agenda: reunion.agenda.map((a) => a.titulo),
      acuerdos: acuerdos.map((a) => ({ texto: a.texto, clasificacion: a.clasificacion, prioridad: a.prioridad })),
      transcripcion: transcript.slice(0, 6000),
    };
    const res = await ia('resumen', { contexto });
    setResumiendo(false);
    if (res.error) { toast({ title: 'Error de IA', description: res.error, variant: 'destructive' }); return; }
    setResumen(res.resumen ?? null);
    actualizarReunion(reunion.id, { resumen: res.resumen ?? null }).catch(() => {});
  }

  async function buscar() {
    if (!query.trim()) return;
    setBuscando(true);
    const corpus = `TRANSCRIPCIÓN:\n${transcript}\n\nACUERDOS:\n${acuerdos.map((a) => '- ' + a.texto).join('\n')}`;
    const res = await ia('buscar', { corpus, query });
    setBuscando(false);
    setRespuesta(res.error ? `Error: ${res.error}` : (res.respuesta ?? ''));
  }

  return (
    <div className="space-y-4">
      {/* Transcripción */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold">Transcripción</span>
          {!readOnly && (
            <Button size="sm" variant={grabando ? 'destructive' : 'outline'} onClick={toggleGrabar}>
              {grabando ? <><Square className="mr-1 h-4 w-4" /> Detener</> : <><Mic className="mr-1 h-4 w-4" /> Grabar</>}
            </Button>
          )}
        </div>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          onBlur={() => guardarTranscript(transcript)}
          readOnly={readOnly}
          placeholder="Graba (Chrome) o pega aquí lo que se habló en la reunión…"
          className="min-h-[120px] w-full rounded-lg border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {grabando && <p className="mt-1 text-xs text-red-500">● Grabando… habla con claridad.</p>}
      </div>

      {/* Acciones IA */}
      <div className="flex flex-wrap gap-2">
        {!readOnly && <GlowButton onClick={extraer} loading={extrayendo} icon={<Sparkles size={16} className="ml-0.5" />}>Extraer acuerdos</GlowButton>}
        <Button variant="outline" onClick={generarResumen} disabled={resumiendo}>
          {resumiendo ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileText className="mr-1 h-4 w-4" />} Resumen ejecutivo
        </Button>
      </div>

      {/* Sugeridos por IA */}
      {sugeridos.length > 0 && (
        <div className="space-y-2 rounded-xl border border-dashed p-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Acuerdos sugeridos por IA</p>
          {sugeridos.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-lg border p-2.5 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                {s.prioridad && <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: PRIORIDAD[s.prioridad]?.color ?? '#94a3b8' }} />}
                <span className="truncate">{s.texto}</span>
                {s.clasificacion && <span className="flex-shrink-0 text-xs text-muted-foreground">· {CLASIFICACION[s.clasificacion]?.label}</span>}
              </div>
              <Button size="sm" variant="outline" onClick={() => agregarSugerido(s, i)}><Plus className="mr-1 h-4 w-4" /> Agregar</Button>
            </div>
          ))}
        </div>
      )}

      {/* Resumen */}
      {resumen && (
        <div className="rounded-xl border bg-muted/30 p-4 text-sm">
          {resumen.texto && <p className="mb-2">{resumen.texto}</p>}
          {resumen.highlights?.length ? (
            <><p className="text-xs font-semibold uppercase text-muted-foreground">Puntos clave</p>
              <ul className="mb-2 ml-4 list-disc">{resumen.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul></>
          ) : null}
          {resumen.decisiones?.length ? (
            <><p className="text-xs font-semibold uppercase text-muted-foreground">Decisiones</p>
              <ul className="ml-4 list-disc">{resumen.decisiones.map((d, i) => <li key={i}>{d}</li>)}</ul></>
          ) : null}
        </div>
      )}

      {/* Búsqueda en el conocimiento */}
      <div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pregunta a la memoria de la reunión…"
              onKeyDown={(e) => e.key === 'Enter' && buscar()} />
          </div>
          <Button variant="outline" onClick={buscar} disabled={buscando || !query.trim()}>{buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}</Button>
        </div>
        {respuesta && <div className="mt-2 rounded-lg border bg-muted/30 p-3 text-sm">{respuesta}</div>}
      </div>
    </div>
  );
}
