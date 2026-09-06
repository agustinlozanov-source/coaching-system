'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import type { Direccion, Frecuencia, Umbrales, VectorIndicador } from './types';

const inputCls =
  'w-full rounded-lg border border-[var(--sx-border)] bg-[var(--sx-input)] px-3 py-2 text-sm text-[var(--sx-text)] outline-none transition placeholder:text-[var(--sx-text-faint)] focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25';

export type IndicadorPayload = {
  nombre: string;
  responsable_nombre: string | null;
  frecuencia: Frecuencia;
  direccion: Direccion;
  unidad: string | null;
  umbrales: Umbrales;
};

export function IndicadorModal({
  editing,
  onClose,
  onSubmit,
}: {
  editing: VectorIndicador | null;
  onClose: () => void;
  onSubmit: (payload: IndicadorPayload) => Promise<void>;
}) {
  const [nombre, setNombre] = useState('');
  const [responsable, setResponsable] = useState('');
  const [frecuencia, setFrecuencia] = useState<Frecuencia>('semanal');
  const [direccion, setDireccion] = useState<Direccion>('mayor_es_mejor');
  const [unidad, setUnidad] = useState('');
  const [verdeAlto, setVerdeAlto] = useState('');
  const [verdeBajo, setVerdeBajo] = useState('');
  const [amarillo, setAmarillo] = useState('');
  const [rojo, setRojo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setNombre(editing?.nombre ?? '');
    setResponsable(editing?.responsable_nombre ?? '');
    setFrecuencia(editing?.frecuencia ?? 'semanal');
    setDireccion(editing?.direccion ?? 'mayor_es_mejor');
    setUnidad(editing?.unidad ?? '');
    setVerdeAlto(editing?.umbrales?.verde_alto?.toString() ?? '');
    setVerdeBajo(editing?.umbrales?.verde_bajo?.toString() ?? '');
    setAmarillo(editing?.umbrales?.amarillo?.toString() ?? '');
    setRojo(editing?.umbrales?.rojo?.toString() ?? '');
    setError(null);
  }, [editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    const va = parseFloat(verdeAlto);
    const vb = parseFloat(verdeBajo);
    const am = parseFloat(amarillo);
    const ro = parseFloat(rojo);

    if ([va, vb, am, ro].some((n) => Number.isNaN(n))) {
      setError('Define los 4 umbrales del semáforo');
      return;
    }

    if (direccion === 'mayor_es_mejor') {
      if (!(va >= vb && vb >= am && am >= ro)) {
        setError('En "mayor es mejor": verde alto ≥ verde bajo ≥ amarillo ≥ rojo');
        return;
      }
    } else if (!(va <= vb && vb <= am && am <= ro)) {
      setError('En "menor es mejor": verde alto ≤ verde bajo ≤ amarillo ≤ rojo');
      return;
    }

    setSubmitting(true);
    await onSubmit({
      nombre: nombre.trim(),
      responsable_nombre: responsable.trim() || null,
      frecuencia,
      direccion,
      unidad: unidad.trim() || null,
      umbrales: { verde_alto: va, verde_bajo: vb, amarillo: am, rojo: ro },
    });
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--sx-border)] bg-[var(--sx-card)] px-6 py-4">
          <h2 className="text-base font-extrabold text-[var(--sx-text)]">{editing ? 'Editar indicador' : 'Nuevo indicador crítico'}</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--sx-border)] text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)]">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">
                Nombre del indicador <span className="text-red-400">*</span>
              </label>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={150} placeholder="Ej: Sesiones agendadas por semana" className={inputCls} autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">Responsable</label>
                <input value={responsable} onChange={(e) => setResponsable(e.target.value)} placeholder="Nombre de la persona" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">Frecuencia</label>
                <select value={frecuencia} onChange={(e) => setFrecuencia(e.target.value as Frecuencia)} className={inputCls}>
                  <option value="diaria">Diaria</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensual">Mensual</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">Dirección</label>
                <select value={direccion} onChange={(e) => setDireccion(e.target.value as Direccion)} className={inputCls}>
                  <option value="mayor_es_mejor">Mayor es mejor (↑)</option>
                  <option value="menor_es_mejor">Menor es mejor (↓)</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">Unidad (opcional)</label>
                <input value={unidad} onChange={(e) => setUnidad(e.target.value)} placeholder="Ej: sesiones, $, %, hrs..." className={inputCls} />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">
                Umbrales del semáforo <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: 'Verde alto', hint: 'Excelente', value: verdeAlto, set: setVerdeAlto, dot: 'bg-emerald-500', border: 'border-emerald-500/60 bg-emerald-500/[0.05]' },
                  { label: 'Verde bajo', hint: 'Aceptable', value: verdeBajo, set: setVerdeBajo, dot: 'bg-lime-500', border: 'border-lime-500/60 bg-lime-500/[0.05]' },
                  { label: 'Amarillo', hint: 'Atención', value: amarillo, set: setAmarillo, dot: 'bg-amber-500', border: 'border-amber-500/60 bg-amber-500/[0.05]' },
                  { label: 'Rojo', hint: 'Crítico', value: rojo, set: setRojo, dot: 'bg-red-500', border: 'border-red-500/60 bg-red-500/[0.05]' },
                ].map((u) => (
                  <div key={u.label} className={`rounded-lg border p-2.5 ${u.border}`}>
                    <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold text-[var(--sx-text)]">
                      <span className={`h-2.5 w-2.5 rounded-full ${u.dot}`} /> {u.label}
                    </div>
                    <input
                      type="number" step="any" value={u.value} onChange={(e) => u.set(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-md border border-[var(--sx-border)] bg-[var(--sx-input)] px-2.5 py-1.5 text-sm font-bold text-[var(--sx-text)] outline-none focus:border-[#1aab99]"
                    />
                    <div className="mt-1 text-[10.5px] font-semibold text-[var(--sx-text-dim)]">{u.hint}</div>
                  </div>
                ))}
              </div>
            </div>

            {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400">{error}</div>}
          </div>

          <div className="sticky bottom-0 flex justify-end gap-2.5 border-t border-[var(--sx-border)] bg-[var(--sx-card)] px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-full border border-[var(--sx-border)] bg-[var(--sx-card-hover)] px-5 py-2.5 text-sm font-bold text-[var(--sx-text)] transition hover:bg-[var(--sx-card-hover)]">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editing ? 'Guardar cambios' : 'Crear indicador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
