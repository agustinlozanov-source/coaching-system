'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export type ComboItem = { id: string; label: string; emoji?: string; hint?: string };

/** Combobox ligero con búsqueda difusa. Muestra el valor comprometido; al enfocar
 *  permite escribir para filtrar. Con `onCustom`, el texto libre se conserva. */
export function Combobox({ value, placeholder, disabled, getResults, onPick, onCustom }: {
  value: string; placeholder: string; disabled?: boolean;
  getResults: (q: string) => ComboItem[];
  onPick: (item: ComboItem) => void;
  onCustom?: (text: string) => void;
}) {
  const [q, setQ] = useState(value);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQ(value); }, [value]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const results = open ? getResults(q) : [];

  function commitCustom() {
    const t = q.trim();
    if (onCustom && t && t !== value) onCustom(t);
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <input
          value={q}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
            else if (e.key === 'Enter') { e.preventDefault(); if (results[hi]) { onPick(results[hi]); setOpen(false); } else commitCustom(); }
            else if (e.key === 'Escape') setOpen(false);
          }}
          onBlur={() => { setTimeout(() => { commitCustom(); }, 120); }}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
        <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-muted-foreground" />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {results.map((it, i) => (
            <li key={it.id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onPick(it); setOpen(false); }}
                onMouseEnter={() => setHi(i)}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${i === hi ? 'bg-accent text-accent-foreground' : ''}`}
              >
                {it.emoji && <span>{it.emoji}</span>}
                <span className="flex-1 truncate">{it.label}</span>
                {it.hint && <span className="flex-shrink-0 text-xs text-muted-foreground">{it.hint}</span>}
                {it.label === value && <Check className="h-3.5 w-3.5 text-[#1aab99]" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
