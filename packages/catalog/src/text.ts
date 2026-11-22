import { createHash } from 'node:crypto';

/** Palabras normalizadas (minúsculas, sin acentos ni signos). */
export function words(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9ñ]+/)
    .filter(Boolean);
}

export function titleFingerprint(title: string): string {
  return createHash('sha256').update(words(title).join(' ')).digest('hex').slice(0, 16);
}

export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/**
 * Control de copia (ADR-0019): secuencias de `n` palabras seguidas que el texto generado
 * comparte con la fuente. Devuelve las frases coincidentes (vacío = sin copia).
 */
export function copiedPhrases(generated: string, source: string, n = 8): string[] {
  const src = words(source);
  if (src.length < n) return [];
  const shingles = new Set<string>();
  for (let i = 0; i + n <= src.length; i++) shingles.add(src.slice(i, i + n).join(' '));
  const gen = words(generated);
  const hits = new Set<string>();
  for (let i = 0; i + n <= gen.length; i++) {
    const s = gen.slice(i, i + n).join(' ');
    if (shingles.has(s)) hits.add(s);
  }
  return [...hits];
}

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', aacute: 'á', eacute: 'é', iacute: 'í',
  oacute: 'ó', uacute: 'ú', ntilde: 'ñ', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  Ntilde: 'Ñ', uuml: 'ü', iexcl: '¡', iquest: '¿', laquo: '«', raquo: '»', hellip: '…', ndash: '–', mdash: '—',
  rsquo: '\u2019', lsquo: '\u2018', rdquo: '\u201d', ldquo: '\u201c',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1]?.toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e] ?? m;
  });
}

const YT_EMBED = /(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/g;

/**
 * Texto principal de una página HTML (sin menús, cabeceras, pies, scripts ni comentarios),
 * su título y los vídeos de YouTube que contiene. No guarda imágenes (ADR-0019).
 */
export function htmlToText(html: string): { title: string; text: string; youtubeIds: string[] } {
  const youtubeIds = [...new Set([...html.matchAll(YT_EMBED)].map((m) => m[1]!))];
  const title = decodeEntities(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? '').replace(/\s+/g, ' ');
  let body = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|iframe|form|nav|header|footer|aside|button|select)\b[\s\S]*?<\/\1>/gi, ' ');
  const main = /<article\b[\s\S]*?<\/article>/i.exec(body)?.[0] ?? /<main\b[\s\S]*?<\/main>/i.exec(body)?.[0];
  if (main) body = main;
  // Quita bloques de comentarios típicos de blogs
  body = body.replace(/<(div|section|ol)[^>]*(?:id|class)="[^"]*(?:comment|related|share|sidebar|newsletter)[^"]*"[\s\S]*?<\/\1>/gi, ' ');
  const text = decodeEntities(
    body
      .replace(/<(br|\/p|\/li|\/h[1-6]|\/div|\/tr)\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n- ')
      .replace(/<[^>]+>/g, ' '),
  )
    .split('\n')
    .map((l) => l.replace(/[ \t\u00a0]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
  return { title, text, youtubeIds };
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! ** 2;
    nb += b[i]! ** 2;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}
