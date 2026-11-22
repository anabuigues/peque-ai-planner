/**
 * CLI del catálogo (docs/specs/ingesta-datos.md):
 *   npm run ingest:activities -w @peque/jobs -- --source <id> [--max 100]
 *   npm run ingest:activities -w @peque/jobs -- --resume [--max 100]
 *   npm run generate:activities -w @peque/jobs -- --category <id|all> [--count 10] [--age 3-6]
 * Respeta el presupuesto diario de IA (AI_DAILY_REQUEST_BUDGET).
 */
import { createModelClient, firestoreCacheStore, hasAiCredentials } from '@peque/ai';
import {
  budgetGuard,
  PoliteFetcher,
  runCrawl,
  runGenerationBatch,
  runResume,
  startGenerationBatch,
  startRun,
  usageToday,
  type CatalogDeps,
} from '@peque/catalog';
import { ACTIVITY_CATEGORY_IDS } from '@peque/shared';
import { initAdmin } from './firebase';

const [command, ...rest] = process.argv.slice(2);
const arg = (name: string) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
};
const flag = (name: string) => rest.includes(`--${name}`);

if (!hasAiCredentials()) {
  console.error('Falta GEMINI_API_KEY en .env.local (clave de Google AI Studio).');
  process.exit(1);
}

const { db } = initAdmin();
const deps: CatalogDeps = {
  db,
  client: createModelClient(),
  cache: firestoreCacheStore(db),
  guard: budgetGuard(db, 'admin'),
  fetcher: new PoliteFetcher(),
  log: (m) => console.log(m),
};
const CLI_UID = 'cli';
const max = Number(arg('max') ?? 100);

if (command === 'ingest') {
  const sourceId = arg('source');
  if (flag('resume') || !sourceId) {
    const runId = await startRun(db, 'resume', CLI_UID);
    await runResume(deps, runId, max);
    console.log('Ejecución', runId, (await db.collection('ingestionRuns').doc(runId).get()).data());
  } else {
    const runId = await startRun(db, 'crawl', CLI_UID, sourceId);
    await runCrawl(deps, runId, sourceId, max);
    console.log('Ejecución', runId, (await db.collection('ingestionRuns').doc(runId).get()).data());
  }
} else if (command === 'generate') {
  const category = arg('category') ?? 'all';
  const categories = category === 'all' ? [...ACTIVITY_CATEGORY_IDS] : [category];
  const count = Number(arg('count') ?? 10);
  for (const categoryId of categories) {
    const batchId = await startGenerationBatch(db, { categoryId, ageBandId: arg('age'), count }, CLI_UID);
    console.log(`Generando ${count} actividades de ${categoryId}… (puede tardar unos minutos)`);
    await runGenerationBatch(deps, batchId, { categoryId, ageBandId: arg('age'), count });
    const b = (await db.collection('generationBatches').doc(batchId).get()).data()!;
    console.log(`  ${b.status}: ${b.created ?? 0} creadas, ${b.duplicates ?? 0} duplicadas${b.error ? ` · ${b.error}` : ''}`);
    if (b.status === 'paused_quota') break;
  }
} else {
  console.error('Uso: catalog-cli.ts ingest --source <id> | ingest --resume | generate --category <id|all>');
  process.exit(1);
}
console.log('Cuota de hoy:', await usageToday(db));
process.exit(0);
