'use client';

import { useEffect, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import {
  COUNTRIES, searchCountries, searchStates, searchCities, loadCities,
  countryByIso2, countryByName, statesOf, type Country, type State,
} from '@/lib/geo';

export type GeoValue = { pais?: string; paisIso2?: string; estado?: string; ciudad?: string };

const labelCls = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground';

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
