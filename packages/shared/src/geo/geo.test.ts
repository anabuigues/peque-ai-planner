import { describe, expect, it } from 'vitest';
import { decodeGeohash, distanceKm, encodeGeohash, normalizeForSearch } from './index';

describe('geo', () => {
  it('codifica el geohash de referencia de Wikipedia', () => {
    expect(encodeGeohash(57.64911, 10.40744, 11)).toBe('u4pruydqqvj');
  });
  it('decodifica cerca del punto original', () => {
    const p = decodeGeohash(encodeGeohash(40.4168, -3.7038, 6));
    expect(distanceKm(p, { lat: 40.4168, lng: -3.7038 })).toBeLessThan(1);
  });
  it('calcula distancias', () => {
    // Sol → Puerta de Alcalá ≈ 1,3 km
    expect(distanceKm({ lat: 40.4168, lng: -3.7038 }, { lat: 40.42, lng: -3.6887 })).toBeCloseTo(1.33, 0);
  });
  it('normaliza texto', () => {
    expect(normalizeForSearch('Chamberí ')).toBe('chamberi');
  });
});
