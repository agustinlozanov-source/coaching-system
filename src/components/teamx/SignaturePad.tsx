'use client';

import { useEffect, useRef, useState } from 'react';
import { Eraser, PenTool } from 'lucide-react';

/** Pad de firma manuscrita (mouse + touch). Devuelve dataURL PNG al confirmar. */
export function SignaturePad({
  label,
  value,
  firmadoEn,
  readOnly,
  onSign,
}: {
  label: string;
  value?: string | null;
  firmadoEn?: string | null;
  readOnly?: boolean;
  onSign: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const drawing = useRef(false);
  const [has, setHas] = useState(false);

  const firmado = !!value;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    canvas.width = wrap.clientWidth;
    canvas.height = wrap.clientHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (value) {
      const img = new Image();
      img.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); };
      img.src = value;
      setHas(true);
    }
  }, [value]);

  const pos = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const start = (x: number, y: number) => {
    if (firmado || readOnly) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    drawing.current = true; ctx.beginPath(); ctx.moveTo(x, y);
  };
  const move = (x: number, y: number) => {
    if (!drawing.current || firmado || readOnly) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.lineTo(x, y); ctx.stroke(); setHas(true);
  };
  const end = () => { drawing.current = false; };

  const clear = () => {
    const c = canvasRef.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); setHas(false);
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        {firmado && firmadoEn && (
          <span className="text-[11px] text-emerald-600">Firmado · {new Date(firmadoEn).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</span>
        )}
      </div>
      <div ref={wrapRef} className={`relative h-[120px] rounded-lg border ${firmado ? 'border-emerald-300 bg-emerald-50/40' : 'border-dashed'}`}>
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none"
          style={{ pointerEvents: firmado || readOnly ? 'none' : 'auto' }}
          onMouseDown={(e) => { const p = pos(e.nativeEvent); start(p.x, p.y); }}
          onMouseMove={(e) => { const p = pos(e.nativeEvent); move(p.x, p.y); }}
          onMouseUp={end} onMouseLeave={end}
          onTouchStart={(e) => { e.preventDefault(); const p = pos(e.touches[0]); start(p.x, p.y); }}
          onTouchMove={(e) => { e.preventDefault(); const p = pos(e.touches[0]); move(p.x, p.y); }}
          onTouchEnd={end}
        />
        {!has && !firmado && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">Firma aquí</div>}
      </div>
      {!firmado && !readOnly && (
        <div className="mt-2 flex gap-2">
          <button onClick={clear} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted">
            <Eraser className="h-3.5 w-3.5" /> Limpiar
          </button>
          <button onClick={() => has && onSign(canvasRef.current!.toDataURL('image/png'))} disabled={!has}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40">
            <PenTool className="h-3.5 w-3.5" /> Firmar
          </button>
        </div>
      )}
    </div>
  );
}
