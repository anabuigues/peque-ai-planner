import { createHash } from 'node:crypto';

/** JSON estable: ordena claves para que el mismo contenido dé siempre el mismo hash. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
}

/** Normaliza texto: espacios colapsados y recortado, para que diferencias triviales no rompan la caché. */
export function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function cacheKey(parts: {
  task: string;
  promptVersion: string;
  model: string;
  input: unknown;
}): string {
  const normalizedInput =
    typeof parts.input === 'string' ? normalizeText(parts.input) : stableStringify(parts.input);
  return sha256([parts.task, parts.promptVersion, parts.model, normalizedInput].join('␞'));
}
