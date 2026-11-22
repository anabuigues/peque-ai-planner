import { generateJson, type AiCacheStore, type CallGuard, type ModelClient } from '@peque/ai';
import type { ActivityResource } from '@peque/shared';
import type { Firestore } from 'firebase-admin/firestore';
import type { FetchLike } from './http';
import { RELEVANCE_VERSION, RelevanceOutput, relevancePrompt } from './prompts';
import { USER_AGENT } from './robots';
import { htmlToText, sha256 } from './text';
import { isSafeUrl, normalizeUrl, youtubeId, youtubeWatchUrl } from './urls';

/** Validación automática de enlaces (ADR-0017). */
export type LinkStatus = 'ok' | 'not_found' | 'not_embeddable' | 'unsafe' | 'error';

export interface LinkCheck {
  url: string;
  status: LinkStatus;
  title?: string;
  provider?: string;
  type: 'video' | 'article';
  checkedAt: string;
}

const TTL_MS = 30 * 86_400_000;

export interface LinkDeps {
  db: Firestore;
  fetchImpl?: FetchLike;
  now?: () => Date;
}

/** Existencia: oEmbed para YouTube, GET con título para el resto. Cacheado 30 días en linkChecks. */
export async function checkLinkExists(rawUrl: string, deps: LinkDeps): Promise<LinkCheck> {
  const now = deps.now?.() ?? new Date();
  const fetchImpl = deps.fetchImpl ?? fetch;
  if (!isSafeUrl(rawUrl)) {
    return { url: rawUrl, status: 'unsafe', type: 'article', checkedAt: now.toISOString() };
  }
  const url = normalizeUrl(rawUrl);
  const ref = deps.db.collection('linkChecks').doc(sha256(url));
  const cached = (await ref.get()).data() as LinkCheck | undefined;
  if (cached && now.getTime() - new Date(cached.checkedAt).getTime() < TTL_MS) return cached;

  let result: LinkCheck;
  const yt = youtubeId(url);
  try {
    if (yt) {
      const res = await fetchImpl(
        `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(youtubeWatchUrl(yt))}`,
        { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(5000) },
      );
      if (res.status === 200) {
        const data = (await res.json()) as { title?: string; author_name?: string };
        result = { url, status: 'ok', type: 'video', title: data.title, provider: `YouTube · ${data.author_name ?? ''}`.trim(), checkedAt: now.toISOString() };
      } else {
        result = { url, status: res.status === 401 || res.status === 403 ? 'not_embeddable' : 'not_found', type: 'video', checkedAt: now.toISOString() };
      }
    } else {
      const res = await fetchImpl(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
        redirect: 'follow',
        signal: AbortSignal.timeout(5000),
      });
      const ok = res.status === 200 && (res.headers.get('content-type') ?? '').includes('text/html');
      const title = ok ? htmlToText((await res.text()).slice(0, 1_000_000)).title : undefined;
      result = { url, status: ok ? 'ok' : 'not_found', type: 'article', title, provider: new URL(url).hostname.replace(/^www\./, ''), checkedAt: now.toISOString() };
    }
  } catch {
    result = { url, status: 'error', type: yt ? 'video' : 'article', checkedAt: now.toISOString() };
  }
  await ref.set(Object.fromEntries(Object.entries(result).filter(([, v]) => v !== undefined)));
  return result;
}

export interface RelevanceDeps extends LinkDeps {
  client: ModelClient;
  cache: AiCacheStore;
  guard?: CallGuard;
}

/** Devuelve como máximo `max` recursos que existen y son relevantes para la actividad. */
export async function validateResources(
  activity: { title: string; summary: string },
  candidates: string[],
  deps: RelevanceDeps,
  max = 2,
): Promise<{ resources: ActivityResource[]; rejected: number }> {
  const resources: ActivityResource[] = [];
  let rejected = 0;
  const seen = new Set<string>();
  for (const raw of candidates) {
    if (resources.length >= max) break;
    let key: string;
    try {
      key = normalizeUrl(raw);
    } catch {
      rejected++;
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    const check = await checkLinkExists(raw, deps);
    if (check.status !== 'ok' || !check.title) {
      rejected++;
      continue;
    }
    const { data } = await generateJson({
      task: 'links.relevance',
      promptVersion: RELEVANCE_VERSION,
      input: { activityTitle: activity.title, activitySummary: activity.summary, linkTitle: check.title, provider: check.provider ?? '' },
      schema: RelevanceOutput,
      buildPrompt: relevancePrompt,
      client: deps.client,
      cache: deps.cache,
      guard: deps.guard,
      purpose: 'relevance',
      temperature: 0,
    });
    if (data.relevant && data.score >= 0.6) {
      resources.push({ type: check.type, url: check.url, title: check.title, provider: check.provider, validatedAt: check.checkedAt });
    } else {
      rejected++;
    }
  }
  return { resources, rejected };
}
