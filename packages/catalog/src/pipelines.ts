import { embedText, generateJson, QuotaExceededError, type AiCacheStore, type CallGuard, type ModelClient } from '@peque/ai';
import type { ActivityContent, Attribution } from '@peque/shared';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { discoverUrls, type Discovery } from './discovery';
import { FetchError, type FetchLike, type PoliteFetcher } from './http';
import { validateResources } from './links';
import {
  AiActivity,
  EXTRACT_VERSION,
  ExtractOutput,
  extractPrompt,
  GENERATE_VERSION,
  GenerateOutput,
  generatePrompt,
  ON_DEMAND_VERSION,
  OnDemandOutput,
  onDemandPrompt,
  REWRITE_VERSION,
  RewriteOutput,
  rewritePrompt,
  sanitizeKeyword,
  type OnDemandFilters,
} from './prompts';
import { addAttribution, existingTitles, findDuplicate, saveDraft } from './store';
import { copiedPhrases, htmlToText, sha256 } from './text';
import { youtubeWatchUrl } from './urls';

export interface CatalogDeps {
  db: Firestore;
  client: ModelClient;
  cache: AiCacheStore;
  guard?: CallGuard;
  fetcher: PoliteFetcher;
  /** fetch directo para comprobar enlaces (oEmbed) sin el ritmo del rastreo. */
  fetchImpl?: FetchLike;
  log?: (msg: string) => void;
}

export function toContent(ai: AiActivity, resources: ActivityContent['resources'] = []): ActivityContent {
  const min = Math.min(ai.minAgeMonths, ai.maxAgeMonths);
  const max = Math.max(ai.minAgeMonths, ai.maxAgeMonths);
  return {
    title: ai.title.trim(),
    summary: ai.summary.trim(),
    categories: [...new Set(ai.categories)],
    age: { minMonths: min, maxMonths: max },
    durationMinutes: ai.durationMinutes,
    materials: ai.materials,
    specialMaterials: ai.specialMaterials,
    steps: ai.steps.map((text, i) => ({ order: i + 1, text: text.trim() })),
    tips: ai.tips,
    resources,
    youtubeSearchQuery: ai.youtubeSearchQuery,
  };
}

/**
 * Las páginas se procesan en paralelo: la comprobación de duplicados y el guardado se
 * serializan para que dos páginas con la misma actividad no creen dos borradores.
 */
let dedupChain: Promise<unknown> = Promise.resolve();
function withDedupLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = dedupChain.then(fn, fn);
  dedupChain = run.catch(() => undefined);
  return run;
}

type ProcessResult =
  | { status: 'created'; id: string; linksValid: number; linksRejected: number }
  | { status: 'duplicate'; id: string };

/** Deduplica, valida enlaces y guarda como borrador una actividad propuesta por la IA. */
export async function processAiActivity(
  ai: AiActivity,
  deps: CatalogDeps,
  opts: {
    origin: 'web' | 'ai-admin' | 'ai-on-demand';
    attribution?: Attribution;
    requestedByHouseholdId?: string;
    generation: { batchId?: string; requestId?: string; promptVersion: string };
    extraVideoUrls?: string[];
  },
): Promise<ProcessResult> {
  const { vector } = await embedText({ text: `${ai.title}\n${ai.summary}`, client: deps.client, cache: deps.cache, guard: deps.guard });
  // Los enlaces se validan fuera del cerrojo (lento); el cerrojo solo cubre deduplicar y guardar.
  const precheck = await findDuplicate(deps.db, { title: ai.title, categories: ai.categories }, vector);
  const { resources, rejected } = precheck
    ? { resources: [], rejected: 0 }
    : await validateResources(
        { title: ai.title, summary: ai.summary },
        [...(opts.extraVideoUrls ?? []), ...ai.videoCandidates],
        { db: deps.db, fetchImpl: deps.fetchImpl, client: deps.client, cache: deps.cache, guard: deps.guard },
      );
  return withDedupLock(async (): Promise<ProcessResult> => {
    const dup = await findDuplicate(deps.db, { title: ai.title, categories: ai.categories }, vector);
    if (dup) {
      if (opts.attribution) await addAttribution(deps.db, dup.id, opts.attribution);
      return { status: 'duplicate', id: dup.id };
    }
    const id = await saveDraft(deps.db, {
      content: toContent(ai, resources),
      embedding: vector,
      origin: opts.origin,
      attribution: opts.attribution,
      requestedByHouseholdId: opts.requestedByHouseholdId,
      generation: { ...opts.generation, model: deps.client.model },
    });
    return { status: 'created', id, linksValid: resources.length, linksRejected: rejected };
  });
}

// --- Lotes de la admin (ADR-0018) ------------------------------------------

export async function runGenerationBatch(
  deps: CatalogDeps,
  batchId: string,
  input: { categoryId: string; ageBandId?: string; count: number },
): Promise<void> {
  const ref = deps.db.collection('generationBatches').doc(batchId);
  try {
    await ref.update({ status: 'generating' });
    const titles = await existingTitles(deps.db, input.categoryId);
    const { data, cached } = await generateJson({
      task: 'activities.generate',
      promptVersion: GENERATE_VERSION,
      input: { ...input, existingTitles: titles },
      schema: GenerateOutput,
      buildPrompt: generatePrompt,
      client: deps.client,
      cache: deps.cache,
      guard: deps.guard,
      purpose: 'generate',
      temperature: 0.8,
    });
    await ref.update({ status: 'validating', fromCache: cached });
    let created = 0, duplicates = 0, valid = 0, rejected = 0;
    for (const ai of data.activities) {
      const r = await processAiActivity(ai, deps, { origin: 'ai-admin', generation: { batchId, promptVersion: GENERATE_VERSION } });
      if (r.status === 'created') {
        created++;
        valid += r.linksValid;
        rejected += r.linksRejected;
      } else duplicates++;
    }
    await ref.update({ status: 'done', created, duplicates, links: { valid, rejected }, finishedAt: new Date().toISOString() });
  } catch (e) {
    await ref.update({
      status: e instanceof QuotaExceededError ? 'paused_quota' : 'error',
      error: e instanceof Error ? e.message.slice(0, 300) : 'Error desconocido',
      finishedAt: new Date().toISOString(),
    });
  }
}

export async function startGenerationBatch(
  db: Firestore,
  input: { categoryId: string; ageBandId?: string; count: number },
  startedByUid: string,
): Promise<string> {
  const ref = db.collection('generationBatches').doc();
  await ref.set({
    status: 'queued',
    category: input.categoryId,
    ...(input.ageBandId ? { ageBand: input.ageBandId } : {}),
    requested: input.count,
    startedByUid,
    startedAt: new Date().toISOString(),
  });
  return ref.id;
}

// --- Sugerencias bajo demanda de las familias (ADR-0020) --------------------

export const ON_DEMAND_DAILY_LIMIT = 3;

export async function runOnDemandRequest(
  deps: CatalogDeps,
  householdId: string,
  requestId: string,
  filters: OnDemandFilters,
): Promise<void> {
  const ref = deps.db.doc(`households/${householdId}/aiRequests/${requestId}`);
  try {
    await ref.update({ status: 'generating' });
    const clean = { ...filters, keyword: sanitizeKeyword(filters.keyword) };
    const titles = clean.categoryId ? await existingTitles(deps.db, clean.categoryId) : [];
    const { data } = await generateJson({
      task: 'activities.ondemand',
      promptVersion: ON_DEMAND_VERSION,
      input: { ...clean, existingTitles: titles },
      schema: OnDemandOutput,
      buildPrompt: onDemandPrompt,
      client: deps.client,
      cache: deps.cache,
      guard: deps.guard,
      purpose: 'onDemand',
      temperature: 0.9,
    });
    const ids: string[] = [];
    for (const ai of data.activities) {
      const r = await processAiActivity(ai, deps, {
        origin: 'ai-on-demand',
        requestedByHouseholdId: householdId,
        generation: { requestId, promptVersion: ON_DEMAND_VERSION },
      });
      ids.push(r.id);
    }
    await ref.update({ status: 'done', activityIds: ids, finishedAt: new Date().toISOString() });
  } catch (e) {
    await ref.update({
      status: 'error',
      error: e instanceof QuotaExceededError ? e.message : 'No hemos podido generar ideas ahora. Inténtalo más tarde.',
      finishedAt: new Date().toISOString(),
    });
  }
}

// --- Rastreo de webs (ADR-0019) ---------------------------------------------

export interface SourceDoc {
  name: string;
  homepage: string;
  discovery: Discovery;
  pathFilter?: string;
  status: 'active' | 'paused' | 'blocked';
  robotsAllowed: boolean;
}

/** Extrae, comprueba copia (con una reescritura) y guarda las actividades de una página. */
export async function processPage(
  deps: CatalogDeps,
  sourceId: string,
  source: SourceDoc,
  url: string,
): Promise<{ status: string; activityIds: string[]; contentHash?: string }> {
  let page;
  try {
    page = await deps.fetcher.get(url);
  } catch (e) {
    return { status: e instanceof FetchError && e.status === 403 ? 'blocked' : 'error', activityIds: [] };
  }
  if (page.status !== 200 || !page.contentType.includes('html')) return { status: 'error', activityIds: [] };
  const { title, text, youtubeIds } = htmlToText(page.text);
  const contentHash = sha256(text);
  if (text.length < 200) return { status: 'not_activity', activityIds: [], contentHash };

  const { data } = await generateJson({
    task: 'activities.extract',
    promptVersion: EXTRACT_VERSION,
    input: { pageTitle: title, text },
    schema: ExtractOutput,
    buildPrompt: extractPrompt,
    client: deps.client,
    cache: deps.cache,
    guard: deps.guard,
    purpose: 'extract',
    temperature: 0.3,
  });
  if (data.activities.length === 0) return { status: 'not_activity', activityIds: [], contentHash };

  const attribution: Attribution = { sourceId, sourceName: source.name, url, retrievedAt: new Date().toISOString() };
  const ids: string[] = [];
  let copyRejected = 0;
  for (let ai of data.activities) {
    const ownText = (a: AiActivity) => [a.title, a.summary, ...a.steps, ...a.tips].join('\n');
    let copied = copiedPhrases(ownText(ai), text);
    if (copied.length) {
      const rewritten = await generateJson({
        task: 'activities.rewrite',
        promptVersion: REWRITE_VERSION,
        input: { activity: ai, copied },
        schema: RewriteOutput,
        buildPrompt: rewritePrompt,
        client: deps.client,
        cache: deps.cache,
        guard: deps.guard,
        purpose: 'extract',
        temperature: 0.7,
      });
      ai = rewritten.data.activity;
      copied = copiedPhrases(ownText(ai), text);
    }
    if (copied.length) {
      copyRejected++;
      deps.log?.(`Descartada por copia: ${url}`);
      continue;
    }
    const r = await processAiActivity({ ...ai, videoCandidates: [] }, deps, {
      origin: 'web',
      attribution,
      generation: { promptVersion: EXTRACT_VERSION },
      extraVideoUrls: youtubeIds.map(youtubeWatchUrl),
    });
    ids.push(r.id);
  }
  return { status: ids.length ? 'activity' : copyRejected ? 'copy' : 'duplicate', activityIds: ids, contentHash };
}

const itemsCol = (db: Firestore) => db.collection('sourceItems');

/** Descubre las URLs de una fuente y deja en cola (pending) las nuevas o actualizadas. */
export async function enqueueSource(deps: CatalogDeps, sourceId: string, source: SourceDoc): Promise<{ discovered: number; queued: number }> {
  const found = await discoverUrls(source.discovery, deps.fetcher, source.pathFilter);
  let queued = 0;
  for (let i = 0; i < found.length; i += 200) {
    const chunk = found.slice(i, i + 200);
    const refs = chunk.map((d) => itemsCol(deps.db).doc(sha256(d.url)));
    const snaps = await deps.db.getAll(...refs);
    const batch = deps.db.batch();
    snaps.forEach((snap, j) => {
      const d = chunk[j]!;
      const existing = snap.data() as { status?: string; processedAt?: string } | undefined;
      const changed = existing?.processedAt && d.lastmod && d.lastmod > existing.processedAt;
      if (!existing || changed) {
        batch.set(refs[j]!, { sourceId, url: d.url, status: 'pending', discoveredAt: new Date().toISOString(), ...(d.lastmod ? { lastmod: d.lastmod } : {}) }, { merge: true });
        queued++;
      }
    });
    await batch.commit();
  }
  return { discovered: found.length, queued };
}

/** Procesa la cola hasta terminar, agotar la cuota del día o llegar a maxPages (carga por días). */
export async function processQueue(
  deps: CatalogDeps,
  runId: string,
  opts: { sourceId?: string; maxPages?: number; concurrency?: number } = {},
): Promise<'done' | 'paused_quota'> {
  const runRef = deps.db.collection('ingestionRuns').doc(runId);
  const sources = new Map<string, SourceDoc | null>();
  const sourceFor = async (id: string) => {
    if (!sources.has(id)) sources.set(id, ((await deps.db.collection('sources').doc(id).get()).data() as SourceDoc) ?? null);
    return sources.get(id)!;
  };
  let query = itemsCol(deps.db).where('status', '==', 'pending');
  if (opts.sourceId) query = query.where('sourceId', '==', opts.sourceId);
  const pending = (await query.limit(opts.maxPages ?? 100).get()).docs;
  let stop = false;
  const counters = { fetched: 0, activities: 0, rejected: 0 };

  const worker = async () => {
    while (!stop) {
      const doc = pending.shift();
      if (!doc) return;
      const item = doc.data() as { sourceId: string; url: string };
      const source = await sourceFor(item.sourceId);
      if (!source || source.status !== 'active') continue;
      try {
        const r = await processPage(deps, item.sourceId, source, item.url);
        counters.fetched++;
        counters.activities += r.activityIds.length;
        if (r.status === 'copy') counters.rejected++;
        await doc.ref.update({ status: r.status, activityIds: r.activityIds, processedAt: new Date().toISOString(), ...(r.contentHash ? { contentHash: r.contentHash } : {}) });
      } catch (e) {
        if (e instanceof QuotaExceededError) {
          stop = true; // la página sigue en pending y se reintenta mañana
          return;
        }
        await doc.ref.update({ status: 'error', error: e instanceof Error ? e.message.slice(0, 200) : 'error', processedAt: new Date().toISOString() });
      }
    }
  };
  await Promise.all(Array.from({ length: opts.concurrency ?? 3 }, worker));
  const remaining = await (opts.sourceId
    ? itemsCol(deps.db).where('status', '==', 'pending').where('sourceId', '==', opts.sourceId)
    : itemsCol(deps.db).where('status', '==', 'pending')
  ).count().get();
  const status = stop ? 'paused_quota' : 'done';
  await runRef.update({
    status,
    'counters.fetched': FieldValue.increment(counters.fetched),
    'counters.activities': FieldValue.increment(counters.activities),
    'counters.rejected': FieldValue.increment(counters.rejected),
    'counters.pending': remaining.data().count,
    finishedAt: new Date().toISOString(),
  });
  return status;
}

export async function startRun(db: Firestore, job: 'crawl' | 'resume', startedByUid: string, sourceId?: string): Promise<string> {
  const ref = db.collection('ingestionRuns').doc();
  await ref.set({
    job,
    ...(sourceId ? { sourceId } : {}),
    status: 'running',
    counters: { discovered: 0, queued: 0, fetched: 0, activities: 0, rejected: 0 },
    startedByUid,
    startedAt: new Date().toISOString(),
  });
  return ref.id;
}

/** Rastreo completo de una fuente: descubrir + procesar la cola. */
export async function runCrawl(deps: CatalogDeps, runId: string, sourceId: string, maxPages = 100): Promise<void> {
  const runRef = deps.db.collection('ingestionRuns').doc(runId);
  try {
    const source = (await deps.db.collection('sources').doc(sourceId).get()).data() as SourceDoc | undefined;
    if (!source || source.status !== 'active' || !source.robotsAllowed) throw new Error('La fuente no está activa o robots.txt no permite rastrearla');
    const { discovered, queued } = await enqueueSource(deps, sourceId, source);
    await runRef.update({ 'counters.discovered': discovered, 'counters.queued': queued });
    await deps.db.collection('sources').doc(sourceId).update({ lastCrawlAt: new Date().toISOString() });
    await processQueue(deps, runId, { sourceId, maxPages });
  } catch (e) {
    await runRef.update({ status: 'error', error: e instanceof Error ? e.message.slice(0, 300) : 'error', finishedAt: new Date().toISOString() });
  }
}

/** "Continuar carga": procesa pendientes de todas las fuentes activas. */
export async function runResume(deps: CatalogDeps, runId: string, maxPages = 100): Promise<void> {
  try {
    await processQueue(deps, runId, { maxPages });
  } catch (e) {
    await deps.db.collection('ingestionRuns').doc(runId).update({ status: 'error', error: e instanceof Error ? e.message.slice(0, 300) : 'error' });
  }
}
