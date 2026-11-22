import 'server-only';
import { budgetFromEnv, coverage, listSources, usageToday } from '@peque/catalog';
import { Activity } from '@peque/shared';
import { adminDb } from '../firebase-admin';

/** Lecturas del panel de administración (solo se llaman tras requireAdmin). */
const db = () => adminDb();

export async function adminOverview() {
  const [usage, pending, runs, batches, cov, sources] = await Promise.all([
    usageToday(db(), budgetFromEnv()),
    db().collection('sourceItems').where('status', '==', 'pending').count().get(),
    db().collection('ingestionRuns').orderBy('startedAt', 'desc').limit(5).get(),
    db().collection('generationBatches').orderBy('startedAt', 'desc').limit(8).get(),
    coverage(db()),
    listSources(db()),
  ]);
  const drafts = await db().collection('activities').where('status', '==', 'draft').count().get();
  const published = await db().collection('activities').where('status', '==', 'published').count().get();
  const adminLeft = Math.max(0, usage.adminLimit - usage.used);
  // Cada página cuesta ~3 llamadas (extracción, embedding y alguna comprobación de relevancia).
  const pagesPerDay = Math.max(1, Math.floor(usage.adminLimit / 3));
  return {
    usage,
    pending: pending.data().count,
    estimatedDays: Math.ceil(pending.data().count / pagesPerDay),
    adminLeft,
    runs: runs.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as RunView[],
    batches: batches.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as BatchView[],
    coverage: cov,
    sources,
    counts: { drafts: drafts.data().count, published: published.data().count },
  };
}

export interface RunView {
  id: string;
  job: string;
  sourceId?: string;
  status: string;
  counters?: Record<string, number>;
  startedAt: string;
  error?: string;
}
export interface BatchView {
  id: string;
  status: string;
  category: string;
  ageBand?: string;
  requested: number;
  created?: number;
  duplicates?: number;
  links?: { valid: number; rejected: number };
  startedAt: string;
  error?: string;
}

export type AdminTab = 'pendientes' | 'familias' | 'publicadas' | 'descartadas';

const LIST_FIELDS = ['title', 'summary', 'categories', 'age', 'durationMinutes', 'materials', 'specialMaterials', 'steps', 'tips', 'resources', 'youtubeSearchQuery', 'status', 'origin', 'attributions', 'requestedByHouseholdId', 'fingerprint', 'createdAt', 'updatedAt', 'publishedAt', 'generation', 'sourceIds'];

export async function listForReview(tab: AdminTab, filters: { category?: string; source?: string; origin?: string }) {
  let q = db().collection('activities').select(...LIST_FIELDS) as FirebaseFirestore.Query;
  if (tab === 'pendientes') q = q.where('status', '==', 'draft');
  if (tab === 'publicadas') q = q.where('status', '==', 'published');
  if (tab === 'descartadas') q = q.where('status', '==', 'archived');
  if (tab === 'familias') q = q.where('origin', '==', 'ai-on-demand');
  const snap = await q.get();
  let items = snap.docs.flatMap((d) => {
    const r = Activity.safeParse({ ...d.data(), id: d.id });
    return r.success ? [{ ...r.data, sourceIds: (d.get('sourceIds') as string[] | undefined) ?? [], batchId: d.get('generation.batchId') as string | undefined }] : [];
  });
  if (tab === 'pendientes') items = items.filter((a) => a.origin !== 'ai-on-demand');
  if (tab === 'familias') items = items.filter((a) => a.status === 'draft');
  if (filters.category) items = items.filter((a) => a.categories.includes(filters.category as never));
  if (filters.source) items = items.filter((a) => a.sourceIds.includes(filters.source!));
  if (filters.origin) items = items.filter((a) => a.origin === filters.origin);
  // Para las sugerencias de familias: cuántos hogares la han guardado.
  if (tab === 'familias') {
    const saved = await db().collectionGroup('saved').where('type', '==', 'activity').select().get();
    const counts = new Map<string, number>();
    for (const d of saved.docs) counts.set(d.id, (counts.get(d.id) ?? 0) + 1);
    return items.map((a) => ({ ...a, savedBy: counts.get(a.id) ?? 0 })).sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  }
  return items.map((a) => ({ ...a, savedBy: 0 })).sort((x, y) => y.createdAt.localeCompare(x.createdAt));
}

export async function getActivityForAdmin(id: string) {
  const snap = await db().collection('activities').doc(id).get();
  if (!snap.exists) return null;
  const r = Activity.safeParse({ ...snap.data(), id: snap.id });
  return r.success ? r.data : null;
}
