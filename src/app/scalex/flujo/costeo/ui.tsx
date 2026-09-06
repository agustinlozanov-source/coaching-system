'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { UNIDADES_COMUNES } from './helpers';

export const inputCls =
  'w-full rounded-lg border border-white/10 bg-[#141416] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} min-h-[70px] resize-y ${props.className ?? ''}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className ?? ''}`} />;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">{children}</div>;
}

/** Opciones de unidad agrupadas. El <select> padre debe controlar `value`/`onChange`. */
export function UnidadOptions() {
  const grupos: Record<string, typeof UNIDADES_COMUNES> = {};
  UNIDADES_COMUNES.forEach((u) => {
    if (!grupos[u.grupo]) grupos[u.grupo] = [];
    grupos[u.grupo].push(u);
  });
  return (
    <>
      <option value="">Unidad...</option>
      {Object.entries(grupos).map(([grupo, opts]) => (
        <optgroup key={grupo} label={grupo}>
          {opts.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

/* ── Modal ──────────────────────────────────────────────────────────────── */
export function Modal({
  open, onClose, title, children, wide,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`max-h-[90vh] w-full ${wide ? 'max-w-2xl' : 'max-w-md'} overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-6 shadow-2xl`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/[0.06] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SaveBadge({ status }: { status: 'loading' | 'saving' | 'saved' | 'error' | 'editing' }) {
  const text: Record<string, string> = { loading: 'Cargando…', editing: 'Editando…', saving: 'Guardando…', saved: 'Guardado', error: 'Error al guardar' };
  const color: Record<string, string> = {
    loading: 'text-white/40', editing: 'text-amber-400', saving: 'text-amber-400', saved: 'text-emerald-400', error: 'text-red-400',
  };
  const dot: Record<string, string> = {
    loading: 'bg-white/30', editing: 'bg-amber-400', saving: 'bg-amber-400', saved: 'bg-emerald-400', error: 'bg-red-400',
  };
  return (
    <div className={`flex items-center gap-2 text-sm ${color[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot[status]}`} />
      {text[status]}
    </div>
  );
}

export function EmptyState({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
      <div className="font-bold text-white">{title}</div>
      {desc && <p className="mx-auto mt-1.5 max-w-md text-sm text-white/50">{desc}</p>}
    </div>
  );
}

export function IconBtn({ onClick, title, children, danger }: { onClick: () => void; title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 transition hover:bg-white/[0.06] ${danger ? 'text-red-400/70 hover:text-red-400' : 'text-white/50 hover:text-white'}`}
    >
      {children}
    </button>
  );
}

export function MarginPill({ pct, cls }: { pct: number; cls: string }) {
  const map: Record<string, string> = {
    good: 'bg-emerald-500/15 text-emerald-400',
    warn: 'bg-amber-500/15 text-amber-400',
    low: 'bg-orange-500/15 text-orange-400',
    bad: 'bg-red-500/15 text-red-400',
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${map[cls]}`}>{pct.toFixed(1)}%</span>;
}
