/** Utilidades geográficas sin dependencias (ADR-0012). */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/** Geohash estándar. Precisión 6 ≈ celdas de 1,2 km × 0,6 km. */
export function encodeGeohash(lat: number, lng: number, precision = 6): string {
  let latMin = -90, latMax = 90, lngMin = -180, lngMax = 180;
  let hash = '';
  let bit = 0, ch = 0, even = true;
  while (hash.length < precision) {
    if (even) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) { ch = (ch << 1) | 1; lngMin = mid; } else { ch <<= 1; lngMax = mid; }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) { ch = (ch << 1) | 1; latMin = mid; } else { ch <<= 1; latMax = mid; }
    }
    even = !even;
    if (++bit === 5) { hash += BASE32[ch]; bit = 0; ch = 0; }
  }
  return hash;
}

/** Centro de una celda geohash. */
export function decodeGeohash(hash: string): { lat: number; lng: number } {
  let latMin = -90, latMax = 90, lngMin = -180, lngMax = 180;
  let even = true;
  for (const c of hash) {
    const v = BASE32.indexOf(c);
    if (v < 0) throw new Error(`Geohash inválido: ${hash}`);
    for (let b = 4; b >= 0; b--) {
      const on = (v >> b) & 1;
      if (even) { const mid = (lngMin + lngMax) / 2; if (on) lngMin = mid; else lngMax = mid; }
      else { const mid = (latMin + latMax) / 2; if (on) latMin = mid; else latMax = mid; }
      even = !even;
    }
  }
  return { lat: (latMin + latMax) / 2, lng: (lngMin + lngMax) / 2 };
}

/** Distancia en km (haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Normaliza para búsquedas: minúsculas y sin acentos. */
export function normalizeForSearch(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
