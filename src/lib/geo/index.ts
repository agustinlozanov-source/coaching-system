// Geografía: países + estados bundleados (pequeños) y ciudades por país
// bajo demanda desde /public/geo/cities/{iso2}.json. Dataset: dr5hn
// countries-states-cities-database (local, sin APIs externas ni llaves).

import countriesRaw from '@/data/geo/countries.json';
import statesRaw from '@/data/geo/states.json';

export type Country = { id: number; n: string; es: string; iso2: string; e: string; nom: string };
export type State = { id: number; n: string };

export const COUNTRIES = countriesRaw as Country[];
const STATES = statesRaw as Record<string, State[]>;

/** Normaliza para búsqueda difusa: sin acentos, minúsculas, sin espacios extra. */
export function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function statesOf(countryId?: number | null): State[] {
  if (countryId == null) return [];
  return STATES[String(countryId)] ?? [];
}

export function countryByIso2(iso2?: string | null): Country | undefined {
  if (!iso2) return undefined;
  return COUNTRIES.find((c) => c.iso2 === iso2);
}

export function countryByName(name?: string | null): Country | undefined {
  if (!name) return undefined;
  const q = norm(name);
  return COUNTRIES.find((c) => norm(c.es) === q || norm(c.n) === q);
}

/** Búsqueda difusa de países (nombre es/en), rankeada: exacto → prefijo → contiene. */
export function searchCountries(q: string, limit = 8): Country[] {
  const nq = norm(q);
  if (!nq) return COUNTRIES.slice(0, limit);
  const scored: { c: Country; s: number }[] = [];
  for (const c of COUNTRIES) {
    const ne = norm(c.es), nn = norm(c.n);
    let s = -1;
    if (ne === nq || nn === nq) s = 0;
    else if (ne.startsWith(nq) || nn.startsWith(nq)) s = 1;
    else if (ne.includes(nq) || nn.includes(nq)) s = 2;
    if (s >= 0) scored.push({ c, s });
  }
  scored.sort((a, b) => a.s - b.s || a.c.es.localeCompare(b.c.es));
  return scored.slice(0, limit).map((x) => x.c);
}

/** Filtra estados de un país por texto (difuso). */
export function searchStates(countryId: number | null | undefined, q: string, limit = 10): State[] {
  const all = statesOf(countryId);
  const nq = norm(q);
  if (!nq) return all.slice(0, limit);
  return all.filter((s) => norm(s.n).includes(nq)).slice(0, limit);
}

// --- Ciudades (carga perezosa por país) ---
const cityCache = new Map<string, Record<string, string[]>>();

export async function loadCities(iso2: string): Promise<Record<string, string[]>> {
  const key = iso2.toUpperCase();
  if (cityCache.has(key)) return cityCache.get(key)!;
  try {
    const r = await fetch(`/geo/cities/${key}.json`);
    const j = r.ok ? await r.json() : {};
    cityCache.set(key, j);
    return j;
  } catch {
    cityCache.set(key, {});
    return {};
  }
}

/** Filtra ciudades de un estado por texto (difuso). */
export function searchCities(map: Record<string, string[]>, stateId: number | null | undefined, q: string, limit = 12): string[] {
  if (stateId == null) return [];
  const all = map[String(stateId)] ?? [];
  const nq = norm(q);
  if (!nq) return all.slice(0, limit);
  return all.filter((c) => norm(c).includes(nq)).slice(0, limit);
}
