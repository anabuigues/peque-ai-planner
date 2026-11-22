import { describe, expect, it } from 'vitest';
import { parseFeed, parseSitemap } from './discovery';
import { PoliteFetcher } from './http';
import { parseRobots } from './robots';
import { copiedPhrases, cosine, htmlToText, titleFingerprint } from './text';
import { isSafeUrl, normalizeUrl, youtubeId } from './urls';

describe('control de copia', () => {
  const source = 'Coloca las dos jarras sobre la bandeja y vierte el agua muy despacio sin hablar mientras el niño observa';
  it('detecta 8 palabras seguidas copiadas aunque cambien mayúsculas y signos', () => {
    expect(copiedPhrases('Primero, coloca las dos jarras sobre la bandeja y vierte el agua.', source)).not.toEqual([]);
  });
  it('acepta una redacción propia', () => {
    expect(copiedPhrases('Pon dos jarritas en una bandeja y enséñale a verter agua lentamente.', source)).toEqual([]);
  });
});

describe('htmlToText', () => {
  const html = `<html><head><title>Trasvases &amp; agua</title><script>x()</script></head><body>
    <nav>Menú</nav><article><h1>Trasvase</h1><p>Necesitas dos jarras.</p><ul><li>Jarra</li><li>Bandeja</li></ul>
    <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
    <div class="comments-area"><p>Comentario de alguien</p></div></article><footer>Pie</footer></body></html>`;
  const r = htmlToText(html);
  it('extrae título, texto principal y vídeos', () => {
    expect(r.title).toBe('Trasvases & agua');
    expect(r.text).toContain('Necesitas dos jarras.');
    expect(r.text).toContain('- Jarra');
    expect(r.text).not.toMatch(/Menú|Pie|Comentario|x\(\)/);
    expect(r.youtubeIds).toEqual(['dQw4w9WgXcQ']);
  });
});

describe('URLs', () => {
  it('solo https público, sin IPs ni acortadores', () => {
    expect(isSafeUrl('https://ejemplo.es/a')).toBe(true);
    expect(isSafeUrl('http://ejemplo.es/a')).toBe(false);
    expect(isSafeUrl('https://192.168.1.1/a')).toBe(false);
    expect(isSafeUrl('https://bit.ly/xyz')).toBe(false);
    expect(isSafeUrl('https://localhost/a')).toBe(false);
  });
  it('reconoce y normaliza YouTube', () => {
    expect(youtubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(normalizeUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=3')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(normalizeUrl('https://blog.es/a?utm_source=x&id=2#c')).toBe('https://blog.es/a?id=2');
  });
});

describe('robots.txt', () => {
  const allowed = parseRobots(`User-agent: *\nDisallow: /privado/\nAllow: /privado/publico\n\nUser-agent: OtroBot\nDisallow: /`);
  it('aplica el grupo * y la regla más larga', () => {
    expect(allowed('/actividades/trasvase')).toBe(true);
    expect(allowed('/privado/x')).toBe(false);
    expect(allowed('/privado/publico/x')).toBe(true);
  });
  it('respeta un grupo específico para nuestro bot', () => {
    const mine = parseRobots(`User-agent: *\nDisallow:\n\nUser-agent: PequePlanBot\nDisallow: /`);
    expect(mine('/cualquier')).toBe(false);
  });
});

describe('descubrimiento', () => {
  it('lee RSS y Atom', () => {
    expect(parseFeed('<rss><channel><item><title>A</title><link>https://b.es/a</link></item></channel></rss>').map((d) => d.url)).toEqual(['https://b.es/a']);
    expect(parseFeed('<feed><entry><link href="https://b.es/x"/><updated>2026-01-01</updated></entry></feed>')[0]).toMatchObject({ url: 'https://b.es/x' });
  });
  it('lee sitemaps e índices', () => {
    expect(parseSitemap('<urlset><url><loc>https://b.es/1</loc><lastmod>2026-02-01</lastmod></url></urlset>').urls[0]?.url).toBe('https://b.es/1');
    expect(parseSitemap('<sitemapindex><sitemap><loc>https://b.es/s1.xml</loc></sitemap></sitemapindex>').sitemaps).toEqual(['https://b.es/s1.xml']);
  });
});

describe('PoliteFetcher', () => {
  it('respeta robots.txt y espacia las peticiones por dominio', async () => {
    const times: number[] = [];
    const fake = async (url: string) => {
      if (url.endsWith('/robots.txt')) return new Response('User-agent: *\nDisallow: /no/', { status: 200 });
      times.push(Date.now());
      return new Response('<html>ok</html>', { status: 200, headers: { 'content-type': 'text/html' } });
    };
    const f = new PoliteFetcher(fake as typeof fetch, 150);
    await expect(f.get('https://b.es/no/x')).rejects.toThrow(/robots/);
    await Promise.all([f.get('https://b.es/1'), f.get('https://b.es/2')]);
    expect(times[1]! - times[0]!).toBeGreaterThanOrEqual(140);
  });
});

describe('similitud', () => {
  it('coseno y huella', () => {
    expect(cosine([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
    expect(titleFingerprint('Trasvase de Agua!')).toBe(titleFingerprint('trasvase de água'));
  });
});
