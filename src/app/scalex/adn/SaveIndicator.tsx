'use client';

// SaveIndicator.tsx — SCALEx · ADN · Indicador de guardado compartido

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const LABELS: Record<SaveState, string> = {
  idle: '—',
  saving: 'Guardando…',
  saved: 'Guardado ✓',
  error: 'Error al guardar',
};

export function SaveIndicator({ state }: { state: SaveState }) {
  const dotCls =
    state === 'saving' ? 'bg-amber-400 animate-pulse'
      : state === 'saved' ? 'bg-emerald-400'
      : state === 'error' ? 'bg-red-400'
      : 'bg-[var(--sx-text-faint)]';
  const textCls =
    state === 'saving' ? 'text-amber-400'
      : state === 'saved' ? 'text-emerald-400'
      : state === 'error' ? 'text-red-400'
      : 'text-[var(--sx-text-faint)]';

  return (
    <div className={`flex items-center gap-2 whitespace-nowrap rounded-full bg-[var(--sx-card-hover)] px-3 py-1.5 text-xs ${textCls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotCls}`} />
      {LABELS[state]}
    </div>
  );
}
