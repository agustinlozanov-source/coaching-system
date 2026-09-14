'use client';

import { ESCALA } from '@/lib/scanx/dx21';

/**
 * Selector de escala DX21 (0-4). Cinco botones con número + etiqueta siempre
 * visible (sin hover). Al seleccionar, muestra la descripción del nivel.
 * Es el elemento más repetido del diagnóstico: por eso es compacto pero claro.
 */
export function EscalaDX21({ value, onChange, ariaLabel }: {
  value: number | null | undefined;
  onChange: (v: number) => void;
  ariaLabel?: string;
}) {
  return (
    <div>
      <div role="radiogroup" aria-label={ariaLabel} className="grid grid-cols-5 gap-1.5">
        {ESCALA.map((e) => {
          const sel = value === e.v;
          return (
            <button
              key={e.v}
              type="button"
              role="radio"
              aria-checked={sel}
              onClick={() => onChange(e.v)}
              className={`flex flex-col items-center gap-0.5 rounded-lg border px-1 py-2 text-center transition ${
                sel
                  ? 'border-[#1aab99] bg-[#1aab99]/10 ring-1 ring-[#1aab99]'
                  : 'border-border bg-card hover:border-foreground/25 hover:bg-muted/50'
              }`}
            >
              <span className={`text-base font-extrabold leading-none tabular-nums ${sel ? 'text-[#1aab99]' : 'text-foreground'}`}>{e.v}</span>
              <span className={`text-[10px] leading-tight ${sel ? 'text-[#1aab99]' : 'text-muted-foreground'}`}>{e.label}</span>
            </button>
          );
        })}
      </div>
      {value != null && (
        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
          {ESCALA.find((e) => e.v === value)?.desc}
        </p>
      )}
    </div>
  );
}
