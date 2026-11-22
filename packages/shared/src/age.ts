import { AGE_BANDS, type AgeBandId } from './taxonomies';

/** Edad en meses a partir de "AAAA-MM" (solo mes y año, ADR-0011). */
export function ageInMonths(birthYearMonth: string, today: Date = new Date()): number {
  const match = /^(\d{4})-(\d{2})$/.exec(birthYearMonth);
  if (!match) throw new Error(`Formato de nacimiento inválido: ${birthYearMonth} (esperado AAAA-MM)`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw new Error(`Mes inválido: ${month}`);
  const months = (today.getFullYear() - year) * 12 + (today.getMonth() + 1 - month);
  if (months < 0) throw new Error('La fecha de nacimiento está en el futuro');
  return months;
}

export function ageBandFor(months: number): AgeBandId | undefined {
  return AGE_BANDS.find((b) => months >= b.minMonths && months < b.maxMonths)?.id;
}

/** ¿Encaja una edad (meses) en un rango [min, max] de un plan o actividad? */
export function fitsAgeRange(months: number, range: { minMonths: number; maxMonths: number }): boolean {
  return months >= range.minMonths && months <= range.maxMonths;
}

export function formatAge(months: number): string {
  if (months < 24) return `${months} meses`;
  const years = Math.floor(months / 12);
  return `${years} años`;
}
