import 'server-only';
import { ON_DEMAND_DAILY_LIMIT, OnDemandFilters, runOnDemandRequest, sha256 } from '@peque/catalog';
import { Activity, ageInMonths, type Child } from '@peque/shared';
import { after } from 'next/server';
import { cache } from 'react';
import { ageBandForRequest, filterActivities, type ActivityFilters } from '../activity-filter';
import { catalogDeps, hasAiCredentials } from '../catalog-deps';
import { adminDb } from '../firebase-admin';
import { DomainError, getHousehold } from './households';

/** Campos de lista (sin el embedding, que pesa). */
const LIST_FIELDS = [
  'title', 'summary', 'categories', 'age', 'durationMinutes', 'materials', 'specialMaterials', 'steps', 'tips',
  'resources', 'youtubeSearchQuery', 'status', 'origin', 'attributions', 'requestedByHouseholdId', 'fingerprint',
  'createdAt', 'updatedAt', 'publishedAt',
];

function parse(id: string, data: unknown): Activity | null {
  const r = Activity.safeParse({ ...(data as object), id });
  return r.success ? r.data : null;
}

/** Catálogo publicado (una lectura por petición; volumen previsto: cientos o pocos miles). */
export const listPublishedActivities = cache(async (): Promise<Activity[]> => {
  const snap = await adminDb().collection('activities').where('status', '==', 'published').select(...LIST_FIELDS).get();
  return snap.docs.flatMap((d) => parse(d.id, d.data()) ?? []);
});

/** Sugerencias de la IA pedidas por este hogar y aún no publicadas (ADR-0020). */
export const listHouseholdSuggestions = cache(async (householdId: string): Promise<Activity[]> => {
  const snap = await adminDb()
    .collection('activities')
    .where('requestedByHouseholdId', '==', householdId)
    .select(...LIST_FIELDS)
    .get();
  return snap.docs.flatMap((d) => parse(d.id, d.data()) ?? []).filter((a) => a.status === 'draft');
});

export function childAges(children: Child[], childId?: string): number[] {
  const selected = childId ? children.filter((c) => c.id === childId) : children;
  return selected.map((c) => ageInMonths(c.birthYearMonth));
}

export async function searchActivities(children: Child[], filters: Omit<ActivityFilters, 'childAgesMonths'> & { para?: string }) {
  const all = await listPublishedActivities();
  return filterActivities(all, { ...filters, childAgesMonths: childAges(children, filters.para) });
}

export async function ideasForToday(children: Child[], count = 5): Promise<Activity[]> {
  return (await searchActivities(children, { categories: [], noSpecialMaterials: false })).slice(0, count);
}

/** Detalle visible para un hogar: publicada, o sugerencia de IA de ese mismo hogar. */
export async function getActivityForHousehold(id: string, householdId: string): Promise<Activity | null> {
  const snap = await adminDb().collection('activities').doc(id).get();
  if (!snap.exists) return null;
  const a = parse(snap.id, snap.data());
  if (!a) return null;
  if (a.status === 'published') return a;
  if (a.status === 'draft' && a.origin === 'ai-on-demand' && a.requestedByHouseholdId === householdId) return a;
  return null;
}

// --- Guardadas (por hogar) ---------------------------------------------------

const savedCol = (hid: string) => adminDb().collection(`households/${hid}/saved`);

export async function listSavedIds(uid: string, hid: string): Promise<Set<string>> {
  await getHousehold(uid, hid);
  const snap = await savedCol(hid).select().get();
  return new Set(snap.docs.map((d) => d.id));
}

export async function listSavedActivities(uid: string, hid: string): Promise<Activity[]> {
  const ids = [...(await listSavedIds(uid, hid))];
  if (!ids.length) return [];
  const docs = await adminDb().getAll(...ids.map((id) => adminDb().collection('activities').doc(id)), { fieldMask: LIST_FIELDS });
  return docs.flatMap((d) => {
    const a = d.exists ? parse(d.id, d.data()) : null;
    if (!a) return [];
    const visible = a.status === 'published' || (a.origin === 'ai-on-demand' && a.requestedByHouseholdId === hid && a.status === 'draft');
    return visible ? [a] : [];
  });
}

export async function setSaved(uid: string, hid: string, activityId: string, saved: boolean): Promise<void> {
  await getHousehold(uid, hid);
  const ref = savedCol(hid).doc(activityId);
  if (!saved) return void (await ref.delete());
  if (!(await getActivityForHousehold(activityId, hid))) throw new DomainError('Esa actividad no está disponible');
  await ref.set({ type: 'activity', savedAt: new Date().toISOString(), savedByUid: uid });
}

// --- Ideas de la IA bajo demanda (ADR-0020) ----------------------------------

export interface AiRequestView {
  id: string;
  status: 'queued' | 'generating' | 'done' | 'error';
  filters: OnDemandFilters;
  activityIds: string[];
  error?: string;
  createdAt: string;
}

const requestsCol = (hid: string) => adminDb().collection(`households/${hid}/aiRequests`);

export async function listAiRequests(uid: string, hid: string): Promise<AiRequestView[]> {
  await getHousehold(uid, hid);
  const snap = await requestsCol(hid).orderBy('createdAt', 'desc').limit(5).get();
  return snap.docs.map((d) => {
    const data = d.data() as Omit<AiRequestView, 'id'>;
    return { ...data, id: d.id, activityIds: data.activityIds ?? [] };
  });
}

export async function requestAiIdeas(
  uid: string,
  hid: string,
  children: Child[],
  input: { categoryId?: string; childId?: string; duration?: string; noSpecialMaterials?: boolean; keyword?: string },
): Promise<{ requestId: string; reused: boolean }> {
  await getHousehold(uid, hid);
  if (!hasAiCredentials()) throw new DomainError('Las ideas de la IA no están disponibles ahora mismo');
  const maxDuration = input.duration === '15' ? 15 : input.duration === '30' ? 30 : undefined;
  const filters = OnDemandFilters.parse({
    categoryId: input.categoryId || undefined,
    ageBandId: ageBandForRequest(childAges(children, input.childId)),
    maxDuration,
    noSpecialMaterials: input.noSpecialMaterials || undefined,
    keyword: input.keyword?.trim().slice(0, 40) || undefined,
  });
  const filtersHash = sha256(JSON.stringify(filters));

  // Petición idéntica ya resuelta: se reutiliza sin contar para el límite.
  const same = await requestsCol(hid).where('filtersHash', '==', filtersHash).get();
  const done = same.docs.find((d) => d.get('status') === 'done' || d.get('status') === 'queued' || d.get('status') === 'generating');
  if (done) return { requestId: done.id, reused: true };

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const today = await requestsCol(hid).where('createdAt', '>=', since.toISOString()).get();
  if (today.size >= ON_DEMAND_DAILY_LIMIT) {
    throw new DomainError(`Hoy ya habéis pedido ${ON_DEMAND_DAILY_LIMIT} veces ideas a la IA. Mañana podréis pedir más.`);
  }
  const ref = requestsCol(hid).doc();
  await ref.set({ status: 'queued', filters, filtersHash, activityIds: [], requestedByUid: uid, createdAt: new Date().toISOString() });
  // En segundo plano: el modelo tarda de 1 a 3 minutos.
  after(() => runOnDemandRequest(catalogDeps('family'), hid, ref.id, filters));
  return { requestId: ref.id, reused: false };
}
