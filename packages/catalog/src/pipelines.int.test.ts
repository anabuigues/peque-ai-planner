import { fakeModelClient, firestoreCacheStore, type ModelRequest } from '@peque/ai';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { beforeEach, describe, expect, it } from 'vitest';
import { budgetGuard } from './budget';
import { PoliteFetcher } from './http';
import type { AiActivity } from './prompts';
import { runGenerationBatch, runOnDemandRequest, runCrawl, startGenerationBatch, startRun, runResume, type CatalogDeps } from './pipelines';
import { blockSource, createSource } from './sources';

const PROJECT = process.env.GCLOUD_PROJECT!;
const app = getApps()[0] ?? initializeApp({ projectId: PROJECT });
const db = getFirestore(app);

const act = (title: string, extra: Partial<AiActivity> = {}): AiActivity => ({
  title,
  summary: `Resumen propio de ${title} para hacer en casa.`,
  categories: ['sensorial'],
  minAgeMonths: 12,
  maxAgeMonths: 48,
  durationMinutes: 15,
  materials: ['bandeja'],
  specialMaterials: false,
  steps: ['Prepara la bandeja.', 'Deja que explore.'],
  tips: ['Supervisa siempre.'],
  youtubeSearchQuery: title,
  videoCandidates: [],
  ...extra,
});

const SOURCE_TEXT =
  'Para esta actividad sensorial coloca harina en una bandeja grande y deja que el peque dibuje con los dedos libremente mientras observa las formas que aparecen. Es una propuesta sencilla que gusta mucho a los más pequeños y se recoge en un momento.';

function pageHtml(text: string) {
  return `<html><head><title>Bandeja de harina</title></head><body><article><p>${text}</p><iframe src="https://www.youtube.com/embed/REALVIDEO01"></iframe></article></body></html>`;
}

/** Webs simuladas: robots, RSS, páginas y oEmbed. */
function fakeWeb(pages: Record<string, string>) {
  return (async (url: string) => {
    if (url.endsWith('/robots.txt')) return new Response(url.includes('prohibido') ? 'User-agent: *\nDisallow: /' : '', { status: 200 });
    if (url.startsWith('https://www.youtube.com/oembed')) {
      return url.includes('REALVIDEO01')
        ? Response.json({ title: 'Bandeja sensorial de harina para niños', author_name: 'Canal' })
        : new Response('Not Found', { status: 404 });
    }
    if (url === 'https://blog.test/feed') {
      return new Response(`<rss><channel>${Object.keys(pages).map((u) => `<item><link>${u}</link></item>`).join('')}</channel></rss>`, { status: 200 });
    }
    if (pages[url]) return new Response(pages[url], { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
    return new Response('no', { status: 404 });
  }) as typeof fetch;
}

/** Modelo simulado que responde según la tarea. */
function fakeModel(overrides: { extract?: (req: ModelRequest) => unknown; generate?: () => unknown } = {}) {
  return fakeModelClient((req) => {
    if (req.system?.startsWith('Decides si un vídeo')) return { relevant: req.prompt.includes('harina'), score: 0.9 };
    if (req.system?.startsWith('Reescribe')) {
      const a = JSON.parse(req.prompt) as AiActivity;
      return { activity: { ...a, summary: 'Dibujar sobre harina con los dedos.', steps: ['Extiende harina en una bandeja.', 'Traza dibujos con el dedo.'] } };
    }
    if (req.prompt.includes('Texto de la página')) return overrides.extract?.(req) ?? { activities: [] };
    if (req.prompt.includes('Una familia no encuentra')) return { activities: [act('Botellas sensoriales'), act('Caja de texturas'), act('Sonidos escondidos')] };
    return overrides.generate?.() ?? { activities: [] };
  });
}

async function clear() {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
}

function deps(client: ReturnType<typeof fakeModel>, web: typeof fetch, guard?: CatalogDeps['guard']): CatalogDeps {
  return { db, client, cache: firestoreCacheStore(db), fetcher: new PoliteFetcher(web, 0), fetchImpl: web, guard };
}

beforeEach(clear);

describe('lotes de IA de la admin', () => {
  it('crea borradores, descarta duplicados y enlaces inventados, y no repite llamadas', async () => {
    await db.collection('activities').doc('old').set({ title: 'Caja de arroz', categories: ['sensorial'], status: 'archived', fingerprint: 'x' });
    const { titleFingerprint } = await import('./text');
    await db.collection('activities').doc('old').update({ fingerprint: titleFingerprint('Caja de arroz') });
    const client = fakeModel({
      generate: () => ({
        activities: [
          act('Bandeja de harina', { videoCandidates: ['https://www.youtube.com/watch?v=REALVIDEO01', 'https://youtu.be/INVENTADO11'] }),
          act('Caja de arroz'),
          act('Botellas de colores'),
        ],
      }),
    });
    const web = fakeWeb({});
    const batchId = await startGenerationBatch(db, { categoryId: 'sensorial', count: 3 }, 'admin');
    await runGenerationBatch(deps(client, web), batchId, { categoryId: 'sensorial', count: 3 });
    const batch = (await db.collection('generationBatches').doc(batchId).get()).data()!;
    expect(batch).toMatchObject({ status: 'done', created: 2, duplicates: 1, links: { valid: 1, rejected: 1 } });

    const drafts = await db.collection('activities').where('origin', '==', 'ai-admin').get();
    const harina = drafts.docs.find((d) => d.get('title') === 'Bandeja de harina')!.data();
    expect(harina.status).toBe('draft');
    expect(harina.resources).toEqual([expect.objectContaining({ type: 'video', url: 'https://www.youtube.com/watch?v=REALVIDEO01' })]);

    const callsBefore = client.calls.length + client.embedCalls.length;
    const embedsBefore = client.embedCalls.length;
    const again = await startGenerationBatch(db, { categoryId: 'sensorial', count: 3 }, 'admin');
    await runGenerationBatch(deps(client, web), again, { categoryId: 'sensorial', count: 3 });
    // El prompt cambia (incluye los títulos nuevos), así que sí hay 1 llamada de generación; los embeddings ya cacheados no se repiten.
    expect((await db.collection('generationBatches').doc(again).get()).get('duplicates')).toBe(3);
    expect(callsBefore).toBeGreaterThan(0);
    expect(client.embedCalls.length).toBe(embedsBefore); // los 3 títulos ya tenían embedding en caché
  });
});

describe('rastreo web', () => {
  it('extrae con palabras propias, reescribe si copia, atribuye y no duplica', async () => {
    const pages = {
      'https://blog.test/harina': pageHtml(SOURCE_TEXT),
      'https://blog.test/harina-2': pageHtml(SOURCE_TEXT + ' Versión ampliada del mismo artículo con más detalles para las familias.'),
    };
    const web = fakeWeb(pages);
    let n = 0;
    const client = fakeModel({
      extract: () => {
        n++;
        // La primera extracción copia una frase de la fuente: debe reescribirse.
        return {
          activities: [
            act('Bandeja de harina', {
              steps: n === 1 ? ['Coloca harina en una bandeja grande y deja que el peque dibuje con los dedos.'] : ['Extiende harina y dibuja.'],
            }),
          ],
        };
      },
    });
    const d = deps(client, web);
    const { id: sourceId, robotsAllowed } = await createSource(d.db, d.fetcher, { name: 'Blog Test', homepage: 'https://blog.test', discoveryKind: 'rss', discoveryUrl: 'https://blog.test/feed', urls: [] }, 'admin');
    expect(robotsAllowed).toBe(true);
    const runId = await startRun(db, 'crawl', 'admin', sourceId);
    await runCrawl(d, runId, sourceId);

    const acts = await db.collection('activities').where('origin', '==', 'web').get();
    expect(acts.size).toBe(1);
    const a = acts.docs[0]!.data();
    expect(a.attributions).toHaveLength(2);
    expect(a.attributions[0]).toMatchObject({ sourceName: 'Blog Test' });
    expect(JSON.stringify(a)).not.toContain('deja que el peque dibuje con los dedos');
    expect(a.resources[0]?.url).toBe('https://www.youtube.com/watch?v=REALVIDEO01');
    expect(client.calls.some((c) => c.system?.startsWith('Reescribe'))).toBe(true);

    const run = (await db.collection('ingestionRuns').doc(runId).get()).data()!;
    expect(run).toMatchObject({ status: 'done', counters: { discovered: 2, queued: 2, pending: 0 } });

    // Segunda pasada: nada nuevo en cola, ninguna llamada nueva.
    const calls = client.calls.length;
    const run2 = await startRun(db, 'crawl', 'admin', sourceId);
    await runCrawl(d, run2, sourceId);
    expect((await db.collection('ingestionRuns').doc(run2).get()).get('counters.queued')).toBe(0);
    expect(client.calls.length).toBe(calls);

    // Bloquear la fuente archiva sus borradores.
    expect(await blockSource(db, sourceId, 'admin', false)).toBe(1);
    expect((await db.collection('activities').doc(acts.docs[0]!.id).get()).get('status')).toBe('archived');
  });

  it('una fuente que prohíbe el rastreo queda en pausa', async () => {
    const web = fakeWeb({});
    const d = deps(fakeModel(), web);
    const { robotsAllowed } = await createSource(db, d.fetcher, { name: 'Prohibido', homepage: 'https://prohibido.test', discoveryKind: 'urls', urls: ['https://prohibido.test/a'] }, 'admin');
    expect(robotsAllowed).toBe(false);
  });

  it('se pausa al agotar la cuota del día y continúa después sin repetir', async () => {
    const pages = Object.fromEntries(
      Array.from({ length: 4 }, (_, i) => [`https://blog.test/p${i}`, pageHtml(`Actividad número ${i}. ${SOURCE_TEXT.replace('harina', `material${i}`)}`)]),
    );
    const web = fakeWeb(pages);
    let i = 0;
    const client = fakeModel({ extract: () => ({ activities: [act(`Actividad ${i++}`, { categories: ['cognicion'] })] }) });
    const guard = budgetGuard(db, 'admin', { daily: 5, familyReserve: 0.2 }); // admin: 4 llamadas
    const d = deps(client, web, guard);
    const { id } = await createSource(db, d.fetcher, { name: 'Blog cuota', homepage: 'https://blog.test', discoveryKind: 'rss', discoveryUrl: 'https://blog.test/feed', urls: [] }, 'admin');
    const run = await startRun(db, 'crawl', 'admin', id);
    await runCrawl({ ...d }, run, id);
    const r1 = (await db.collection('ingestionRuns').doc(run).get()).data()!;
    expect(r1.status).toBe('paused_quota');
    expect(r1.counters.pending).toBeGreaterThan(0);

    // "Al día siguiente": se reinicia el contador de uso.
    await db.collection('aiUsage').get().then((s) => Promise.all(s.docs.map((x) => x.ref.delete())));
    const resume = await startRun(db, 'resume', 'admin');
    await runResume(deps(client, web, budgetGuard(db, 'admin', { daily: 100, familyReserve: 0.2 })), resume);
    expect((await db.collection('ingestionRuns').doc(resume).get()).get('counters.pending')).toBe(0);
    expect((await db.collection('activities').get()).size).toBe(4);
  });
});

describe('sugerencias bajo demanda', () => {
  it('genera 3 ideas para el hogar, sin datos personales en el prompt', async () => {
    const client = fakeModel();
    const ref = db.doc('households/h1/aiRequests/r1');
    await ref.set({ status: 'queued' });
    await runOnDemandRequest(deps(client, fakeWeb({}), budgetGuard(db, 'family')), 'h1', 'r1', {
      categoryId: 'sensorial',
      ageBandId: '1-2',
      keyword: 'agua ana@correo.es 612345678',
    });
    const req = (await ref.get()).data()!;
    expect(req.status).toBe('done');
    expect(req.activityIds).toHaveLength(3);
    const prompt = client.calls.find((c) => c.prompt.includes('Una familia no encuentra'))!.prompt;
    expect(prompt).toContain('"agua"');
    expect(prompt).not.toMatch(/ana@|612345678/);
    const a = (await db.collection('activities').doc(req.activityIds[0]).get()).data()!;
    expect(a).toMatchObject({ origin: 'ai-on-demand', requestedByHouseholdId: 'h1', status: 'draft' });
  });
});
