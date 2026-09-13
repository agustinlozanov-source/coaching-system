'use client';

import { useEffect, useRef, useState } from 'react';
import { Paperclip, Timer, MonitorPlay, Sparkles, Loader2, Check, Square, Play, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { subirArchivo, crearEvidencia } from '@/lib/scanx/evidencia';
import type { Disparador } from '@/lib/scanx/banco-areas';

const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

/**
 * Infraestructura de verificación SIEMPRE visible bajo cada pregunta:
 * adjuntar evidencia · cronómetro · grabar pantalla. Cuando la respuesta dispara
 * una verificación (evidencia/timed/repregunta), el sistema la resalta y muestra
 * la petición del agente (repIA) ahí mismo, dentro del flujo.
 *
 * Si la pregunta trae `disparador`, la verificación es OBLIGATORIA: al completarla
 * se llama `onDone`, que el runner usa para desbloquear el avance. Cada evidencia
 * se guarda con el contexto de la pregunta (id + enunciado) para poder revisarla.
 */
export function VerificacionInline({ diagId, preguntaId, preguntaTexto, dimension, disparador, repIA, done, onDone }: {
  diagId: string; preguntaId: string; preguntaTexto: string;
  dimension: string | null; disparador?: Disparador; repIA?: string;
  done?: boolean; onDone?: () => void;
}) {
  const requerido = !!disparador;
  const [panel, setPanel] = useState<null | 'evidencia' | 'timed' | 'repregunta'>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // timed + screen recording
  const [corriendo, setCorriendo] = useState(false);
  const [seg, setSeg] = useState(0);
  const [grabar, setGrabar] = useState(true);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // repregunta
  const [texto, setTexto] = useState('');

  useEffect(() => {
    // Al cambiar de pregunta: si trae disparador, abre el panel correspondiente.
    // Si ya se completó antes (done), no reabrimos ni exigimos de nuevo.
    setPanel(done ? null : (disparador ?? null));
    setOk(done ? 'Verificación completada ✓' : null);
    setTexto(''); setSeg(0); setCorriendo(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preguntaId]);

  useEffect(() => {
    if (corriendo) { tick.current = setInterval(() => setSeg((s) => s + 1), 1000); return () => { if (tick.current) clearInterval(tick.current); }; }
  }, [corriendo]);

  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); if (tick.current) clearInterval(tick.current); }, []);

  async function onFile(f: File) {
    setSubiendo(true);
    const ext = (f.name.split('.').pop() || 'bin').toLowerCase();
    const path = await subirArchivo(diagId, f, ext);
    if (path) {
      await crearEvidencia(diagId, { tipo: 'documento', dimension, descripcion: repIA || 'Evidencia documental', archivoUrl: path, completado: true, preguntaId, preguntaTexto });
      setOk('Evidencia adjuntada ✓'); onDone?.();
    } else setOk('No se pudo subir el archivo.');
    setSubiendo(false);
  }

  async function iniciarTimed() {
    setSeg(0); setCorriendo(true);
    if (grabar) {
      try {
        const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
        streamRef.current = stream; chunks.current = [];
        const rec = new MediaRecorder(stream);
        rec.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
        rec.start(); recRef.current = rec;
        stream.getVideoTracks()[0].addEventListener('ended', () => detener());
      } catch { /* usuario canceló: sigue solo con cronómetro */ }
    }
  }

  async function detener() {
    setCorriendo(false);
    const dur = seg;
    let path: string | null = null;
    if (recRef.current && recRef.current.state !== 'inactive') {
      await new Promise<void>((res) => { recRef.current!.onstop = () => res(); recRef.current!.stop(); });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks.current, { type: 'video/webm' });
      path = await subirArchivo(diagId, blob, 'webm');
    }
    await crearEvidencia(diagId, { tipo: path ? 'video' : 'timed', dimension, descripcion: repIA || 'Reto cronometrado', tiempoReal: dur, completado: true, archivoUrl: path, preguntaId, preguntaTexto });
    setOk(path ? 'Reto grabado y guardado ✓' : 'Reto registrado ✓');
    setPanel(null); onDone?.();
  }

  async function guardarRepregunta() {
    if (!texto.trim()) return;
    setSubiendo(true);
    await crearEvidencia(diagId, { tipo: 'documento', dimension, descripcion: `${repIA || 'Profundización'} → ${texto.trim()}`, completado: true, preguntaId, preguntaTexto });
    setSubiendo(false); setOk('Respuesta guardada ✓'); setPanel(null); onDone?.();
  }

  const chip = (active: boolean) => `flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${active ? 'border-[#1aab99] bg-[#1aab99]/10 text-[#1aab99]' : 'text-muted-foreground hover:bg-muted/50'}`;

  const pendiente = requerido && !ok;

  return (
    <div className={`mt-4 rounded-xl border p-3 ${pendiente ? 'border-amber-400/70 bg-amber-50/50 dark:bg-amber-500/5' : 'border-dashed'}`}>
      {/* Barra de infraestructura (siempre visible) */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Verificación</span>
        {requerido && (
          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${pendiente ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/15 text-emerald-600'}`}>
            {pendiente ? <><Lock className="h-3 w-3" /> Obligatorio</> : <><Check className="h-3 w-3" /> Listo</>}
          </span>
        )}
        <button className={chip(panel === 'evidencia')} onClick={() => setPanel(panel === 'evidencia' ? null : 'evidencia')}><Paperclip className="h-3.5 w-3.5" /> Adjuntar evidencia</button>
        <button className={chip(panel === 'timed')} onClick={() => setPanel(panel === 'timed' ? null : 'timed')}><Timer className="h-3.5 w-3.5" /> Reto cronometrado <MonitorPlay className="h-3.5 w-3.5" /></button>
        {ok && <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check className="h-3.5 w-3.5" />{ok}</span>}
      </div>

      {/* Petición del agente cuando hay disparador */}
      {disparador && repIA && panel && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/40 p-2.5 text-sm">
          <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#1aab99]" />
          <span>{repIA}</span>
        </div>
      )}
      {pendiente && (
        <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
          Esta pregunta requiere que {disparador === 'evidencia' ? 'adjuntes evidencia' : disparador === 'timed' ? 'completes el reto en vivo' : 'respondas la profundización'} antes de continuar.
        </p>
      )}

      {panel === 'evidencia' && (
        <div className="mt-3">
          <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.doc,.docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={subiendo}>
            {subiendo ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Paperclip className="mr-1 h-4 w-4" />} Subir documento
          </Button>
        </div>
      )}

      {panel === 'timed' && (
        <div className="mt-3 flex items-center gap-3">
          {!corriendo ? (
            <>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" checked={grabar} onChange={(e) => setGrabar(e.target.checked)} /> Grabar pantalla</label>
              <Button size="sm" variant="outline" onClick={iniciarTimed}><Play className="mr-1 h-4 w-4" /> Iniciar reto</Button>
            </>
          ) : (
            <>
              <span className="text-lg font-extrabold tabular-nums">{fmt(seg)}</span>
              <Button size="sm" variant="destructive" onClick={detener}><Square className="mr-1 h-4 w-4" /> Terminé</Button>
              {grabar && <span className="text-xs text-red-500">● grabando pantalla</span>}
            </>
          )}
        </div>
      )}

      {panel === 'repregunta' && (
        <div className="mt-3 space-y-2">
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe tu respuesta…" className="min-h-[70px] w-full rounded-lg border bg-background p-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <Button size="sm" variant="outline" onClick={guardarRepregunta} disabled={subiendo || !texto.trim()}>{subiendo ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Guardar respuesta</Button>
        </div>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">Screen recording funciona mejor en Chrome de escritorio.</p>
    </div>
  );
}
