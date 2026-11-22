/** Reglas de URLs aceptables para enlaces y rastreo (ADR-0017). */
const SHORTENERS = new Set(['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'buff.ly', 'is.gd', 'cutt.ly', 'rebrand.ly']);

export function isSafeUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false;
  if (u.username || u.password) return false;
  if (u.port && u.port !== '443') return false;
  const host = u.hostname.toLowerCase();
  if (/^[\d.]+$/.test(host) || host.includes(':') || host === 'localhost' || host.endsWith('.local') || !host.includes('.')) return false;
  if (SHORTENERS.has(host)) return false;
  return true;
}

export function youtubeId(raw: string): string | null {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtu.be') return /^[\w-]{11}$/.test(u.pathname.slice(1)) ? u.pathname.slice(1) : null;
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const v = u.searchParams.get('v');
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const m = /^\/(?:embed|shorts)\/([\w-]{11})/.exec(u.pathname);
      return m?.[1] ?? null;
    }
  } catch {
    /* URL inválida */
  }
  return null;
}

export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/** Normaliza para deduplicar: YouTube canónico, sin fragmento ni parámetros de seguimiento. */
export function normalizeUrl(raw: string): string {
  const yt = youtubeId(raw);
  if (yt) return youtubeWatchUrl(yt);
  const u = new URL(raw);
  u.hash = '';
  for (const p of [...u.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid|mc_)/i.test(p)) u.searchParams.delete(p);
  }
  return u.toString();
}
