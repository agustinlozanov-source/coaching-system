'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2, MapPin, Check } from 'lucide-react';
import {
  COUNTRIES, searchCountries, searchStates, searchCities, loadCities,
  countryByIso2, countryByName, statesOf, type Country, type State,
} from '@/lib/geo';

export type GeoValue = { pais?: string; paisIso2?: string; estado?: string; ciudad?: string };

type Item = { id: string; label: string; emoji?: string };

const labelCls = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground';

/** Combobox ligero con búsqueda difusa. Muestra el valor comprometido; al enfocar
 *  permite escribir para filtrar. Con `allowCustom`, el texto libre se conserva. */
function Combobox({ value, placeholder, disabled, getResults, onPick, onCustom }: {
  value: string; placeholder: string; disabled?: boolean;
  getResults: (q: string) => Item[];
  onPick: (item: Item) => void;
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
                {it.label === value && <Check className="h-3.5 w-3.5 text-[#1aab99]" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Cascada geográfica país → estado/provincia → municipio, con dataset local
 * (dr5hn) y nomenclatura adaptada al país. Renderiza 3 celdas para encajar en
 * una grilla de 2 columnas del formulario de perfil.
 */
export function GeoCascade({ value, onChange }: { value: GeoValue; onChange: (patch: GeoValue) => void }) {
  const country: Country | undefined = countryByIso2(value.paisIso2) ?? countryByName(value.pais);
  const estados: State[] = statesOf(country?.id);
  const estadoSel = estados.find((s) => s.n === value.estado);

  const [cities, setCities] = useState<Record<string, string[]>>({});
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    if (!country) { setCities({}); return; }
    let cancel = false;
    setLoadingCities(true);
    loadCities(country.iso2).then((m) => { if (!cancel) setCities(m); }).finally(() => { if (!cancel) setLoadingCities(false); });
    return () => { cancel = true; };
  }, [country?.iso2]); // eslint-disable-line react-hooks/exhaustive-deps

  const nomEstado = country?.nom ?? 'Estado / Provincia';
  const hayCiudades = estadoSel ? (cities[String(estadoSel.id)]?.length ?? 0) > 0 : false;

  return (
    <>
      {/* País */}
      <div className="space-y-1.5">
        <label className={labelCls}>País</label>
        <Combobox
          value={value.pais ?? ''}
          placeholder="Busca tu país"
          getResults={(q) => searchCountries(q).map((c) => ({ id: c.iso2, label: c.es, emoji: c.e }))}
          onPick={(it) => {
            const c = COUNTRIES.find((x) => x.iso2 === it.id);
            onChange({ pais: c?.es, paisIso2: c?.iso2, estado: undefined, ciudad: undefined });
          }}
        />
      </div>

      {/* Estado / provincia / departamento… */}
      <div className="space-y-1.5">
        <label className={labelCls}>{nomEstado}</label>
        <Combobox
          value={value.estado ?? ''}
          placeholder={country ? `Busca tu ${nomEstado.toLowerCase()}` : 'Elige un país primero'}
          disabled={!country || estados.length === 0}
          getResults={(q) => searchStates(country?.id, q).map((s) => ({ id: String(s.id), label: s.n }))}
          onPick={(it) => {
            const s = estados.find((x) => String(x.id) === it.id);
            onChange({ estado: s?.n, ciudad: undefined });
          }}
        />
      </div>

      {/* Municipio / ciudad */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <MapPin className="h-3 w-3" /> Municipio / Ciudad
          {loadingCities && <Loader2 className="h-3 w-3 animate-spin" />}
        </label>
        <Combobox
          value={value.ciudad ?? ''}
          placeholder={!estadoSel ? `Elige un ${nomEstado.toLowerCase()} primero` : hayCiudades ? 'Busca o escribe tu municipio' : 'Escribe tu municipio'}
          disabled={!estadoSel}
          getResults={(q) => searchCities(cities, estadoSel?.id, q).map((c) => ({ id: c, label: c }))}
          onPick={(it) => onChange({ ciudad: it.label })}
          onCustom={(t) => onChange({ ciudad: t })}
        />
      </div>
    </>
  );
}
