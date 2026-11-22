/**
 * ADR-0010: nunca se envían datos personales a la IA.
 * Bloquea claves que identifican a menores o a hogares. Es una red de seguridad,
 * no sustituye a construir los prompts solo con datos públicos o agregados.
 */
export const FORBIDDEN_INPUT_KEYS = new Set([
  'childname',
  'children',
  'child',
  'birthdate',
  'birthyearmonth',
  'email',
  'phone',
  'homeaddress',
  'home',
  'householdid',
  'uid',
  'userid',
  'notes',
]);

export class PersonalDataError extends Error {
  constructor(public readonly path: string) {
    super(`Entrada a la IA con un campo personal prohibido: "${path}" (ADR-0010)`);
    this.name = 'PersonalDataError';
  }
}

export function assertNoPersonalData(value: unknown, path = 'input'): void {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertNoPersonalData(v, `${path}[${i}]`));
    return;
  }
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_INPUT_KEYS.has(key.toLowerCase())) throw new PersonalDataError(`${path}.${key}`);
    assertNoPersonalData(v, `${path}.${key}`);
  }
}
