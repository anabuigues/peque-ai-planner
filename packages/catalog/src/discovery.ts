import { decodeEntities } from './text';
import type { PoliteFetcher } from './http';

export interface Discovery {
  kind: 'rss' | 'sitemap' | 'urls';
  url?: string;
  urls?: string[];
}

export interface DiscoveredUrl {
  url: string;
  lastmod?: string;
}

const tagValues = (xml: string, tag: string) =>
  [...xml.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi'))].map((m) =>
    decodeEntities(m[1]!.replace(/<!\[CDATA\[|\]\]>/g, '').trim()),
  );

/** Enlaces de un RSS 2.0 o Atom. */
export function parseFeed(xml: string): DiscoveredUrl[] {
  const items = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map((m) => m[0]);
  return items.flatMap((item) => {
    const link = tagValues(item, 'link')[0] || /<link[^>]*href="([^"]+)"/i.exec(item)?.[1];
    const date = tagValues(item, 'pubDate')[0] || tagValues(item, 'updated')[0] || tagValues(item, 'published')[0];
    return link ? [{ url: link, lastmod: date ? new Date(date).toISOString() : undefined }] : [];
  });
}

/** URLs y sitemaps hijos de un sitemap o índice de sitemaps. */
export function parseSitemap(xml: string): { urls: DiscoveredUrl[]; sitemaps: string[] } {
  if (/<sitemapindex/i.test(xml)) {
    return { urls: [], sitemaps: [...xml.matchAll(/<sitemap>[\s\S]*?<\/sitemap>/gi)].flatMap((m) => tagValues(m[0], 'loc')) };
  }
  const urls = [...xml.matchAll(/<url>[\s\S]*?<\/url>/gi)].flatMap((m) => {
    const loc = tagValues(m[0], 'loc')[0];
    const lastmod = tagValues(m[0], 'lastmod')[0];
    return loc ? [{ url: loc, lastmod: lastmod ? new Date(lastmod).toISOString() : undefined }] : [];
  });
  return { urls, sitemaps: [] };
}

export function matchesPathFilter(url: string, pathFilter?: string): boolean {
  if (!pathFilter) return true;
  try {
    return new URL(url).pathname.startsWith(pathFilter);
  } catch {
    return false;
  }
}

/** Descubre las URLs de una fuente (máx. 5 sitemaps hijos y 5.000 URLs). */
export async function discoverUrls(
  discovery: Discovery,
  fetcher: PoliteFetcher,
  pathFilter?: string,
): Promise<DiscoveredUrl[]> {
  let found: DiscoveredUrl[] = [];
  if (discovery.kind === 'urls') {
    found = (discovery.urls ?? []).map((url) => ({ url }));
  } else if (discovery.kind === 'rss' && discovery.url) {
    found = parseFeed((await fetcher.get(discovery.url, { accept: 'application/rss+xml,application/atom+xml,application/xml' })).text);
  } else if (discovery.kind === 'sitemap' && discovery.url) {
    const queue = [discovery.url];
    let visited = 0;
    while (queue.length && visited < 6 && found.length < 5000) {
      const sm = queue.shift()!;
      visited++;
      const parsed = parseSitemap((await fetcher.get(sm, { accept: 'application/xml,text/xml' })).text);
      found.push(...parsed.urls);
      queue.push(...parsed.sitemaps.filter((s) => !pathFilter || s.includes(pathFilter.replace(/\/$/, '')) || true));
    }
  }
  const seen = new Set<string>();
  return found
    .filter((d) => matchesPathFilter(d.url, pathFilter))
    .filter((d) => (seen.has(d.url) ? false : (seen.add(d.url), true)))
    .slice(0, 5000);
}
