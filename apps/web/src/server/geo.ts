import 'server-only';
import {
  encodeGeohash,
  findNeighborhood,
  MADRID_CITY_ID,
  MADRID_INE_CODE,
  normalizeForSearch,
  type Area,
  type LocationInput,
} from '@peque/shared';
import municipalitiesData from '@peque/shared/data/municipalities-es.json';

export interface Municipality {
  code: string;
  name: string;
  province: string;
  lat: number;
  lng: number;
}

// La lista completa (~8.200) solo vive en el servidor (ADR-0016).
const MUNICIPALITIES: Municipality[] = municipalitiesData.items;
const INDEX = MUNICIPALITIES.map((m) => ({ m, key: normalizeForSearch(m.name) }));

export function searchMunicipalities(query: string, limit = 12): Municipality[] {
  const q = normalizeForSearch(query);
  if (q.length < 2) return [];
  const starts = INDEX.filter((x) => x.key.startsWith(q));
  const contains = INDEX.filter((x) => !x.key.startsWith(q) && x.key.includes(q));
  return [...starts, ...contains].slice(0, limit).map((x) => x.m);
}

export function findMunicipality(code: string): Municipality | undefined {
  return MUNICIPALITIES.find((m) => m.code === code);
}

/** Resuelve la zona en claro (aproximada) de una ubicación elegida por la familia. */
export function resolveArea(input: LocationInput): { area: Area; cityId: string } {
  if (input.kind === 'barrio') {
    const n = findNeighborhood(input.id);
    if (!n) throw new Error('Barrio desconocido');
    return {
      cityId: MADRID_CITY_ID,
      area: { kind: 'barrio', id: n.id, label: `${n.name} · ${n.district}`, geohash6: encodeGeohash(n.lat, n.lng, 6) },
    };
  }
  const m = findMunicipality(input.id);
  if (!m) throw new Error('Municipio desconocido');
  if (m.code === MADRID_INE_CODE) throw new Error('Para Madrid elige tu barrio');
  return {
    cityId: m.code,
    area: { kind: 'municipio', id: m.code, label: `${m.name} · ${m.province}`, geohash6: encodeGeohash(m.lat, m.lng, 6) },
  };
}
