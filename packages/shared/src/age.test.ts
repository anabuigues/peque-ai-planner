import { describe, expect, it } from 'vitest';
import { ageBandFor, ageInMonths, fitsAgeRange, formatAge } from './age';

describe('edad', () => {
  const today = new Date('2026-11-22');

  it('calcula meses a partir de AAAA-MM', () => {
    expect(ageInMonths('2023-05', today)).toBe(42);
    expect(ageInMonths('2026-11', today)).toBe(0);
  });

  it('rechaza formatos con día (minimización) y fechas futuras', () => {
    expect(() => ageInMonths('2023-05-12', today)).toThrow();
    expect(() => ageInMonths('2027-01', today)).toThrow();
  });

  it('asigna franja y comprueba rangos', () => {
    expect(ageBandFor(42)).toBe('3-6');
    expect(ageBandFor(5)).toBe('0-1');
    expect(fitsAgeRange(42, { minMonths: 36, maxMonths: 72 })).toBe(true);
    expect(fitsAgeRange(30, { minMonths: 36, maxMonths: 72 })).toBe(false);
  });

  it('formatea la edad', () => {
    expect(formatAge(18)).toBe('18 meses');
    expect(formatAge(42)).toBe('3 años');
  });
});
