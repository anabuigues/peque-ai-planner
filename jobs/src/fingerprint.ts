import { createHash } from 'node:crypto';

/** Huella de un título para deduplicar contenido (sin acentos, minúsculas, sin signos). */
export function titleFingerprint(title: string): string {
  const normalized = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}
