import { ActivityContent, AGE_BANDS, ACTIVITY_CATEGORY_IDS, type ActivityOrigin, type Attribution } from '@peque/shared';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { cosine, titleFingerprint } from './text';

export const DUPLICATE_THRESHOLD = 0.9;
const col = (db: Firestore) => db.collection('activities');

export async function existingTitles(db: Firestore, categoryId: string): Promise<string[]> {
  const snap = await col(db).where('categories', 'array-contains', categoryId).select('title').get();
  return snap.docs.map((d) => d.get('title') as string);
}

export async function findDuplicate(
  db: Firestore,
  content: { title: string; categories: string[] },
  vector: number[],
): Promise<{ id: string; reason: 'fingerprint' | 'similar'; score: number } | null> {
  const fp = titleFingerprint(content.title);
  const exact = await col(db).where('fingerprint', '==', fp).limit(1).get();
  if (!exact.empty) return { id: exact.docs[0]!.id, reason: 'fingerprint', score: 1 };
  const snap = await col(db).where('categories', 'array-contains', content.categories[0]!).select('embedding').get();
  let best: { id: string; score: number } | null = null;
  for (const d of snap.docs) {
    const emb = d.get('embedding') as number[] | undefined;
    if (!emb?.length) continue;
    const score = cosine(vector, emb);
    if (!best || score > best.score) best = { id: d.id, score };
  }
  return best && best.score >= DUPLICATE_THRESHOLD ? { ...best, reason: 'similar' } : null;
}

export interface DraftInput {
  content: ActivityContent;
  embedding: number[];
  origin: ActivityOrigin;
  attribution?: Attribution;
  requestedByHouseholdId?: string;
  generation?: { batchId?: string; requestId?: string; model: string; promptVersion: string };
}

export async function saveDraft(db: Firestore, input: DraftInput): Promise<string> {
  const now = new Date().toISOString();
  const content = ActivityContent.parse(input.content);
  const ref = col(db).doc();
  await ref.set(
    stripUndefined({
      ...content,
      status: 'draft',
      origin: input.origin,
      attributions: input.attribution ? [input.attribution] : [],
      sourceIds: input.attribution ? [input.attribution.sourceId] : [],
      requestedByHouseholdId: input.requestedByHouseholdId,
      fingerprint: titleFingerprint(content.title),
      embedding: input.embedding,
      generation: input.generation ? { ...input.generation, createdAt: now } : undefined,
      createdAt: now,
      updatedAt: now,
    }),
  );
  return ref.id;
}

export async function addAttribution(db: Firestore, activityId: string, attribution: Attribution): Promise<void> {
  const ref = col(db).doc(activityId);
  const current = ((await ref.get()).get('attributions') as Attribution[] | undefined) ?? [];
  if (current.some((a) => a.url === attribution.url)) return;
  await ref.update({
    attributions: FieldValue.arrayUnion(attribution),
    sourceIds: FieldValue.arrayUnion(attribution.sourceId),
    updatedAt: new Date().toISOString(),
  });
}

// --- Revisión (solo admin) ---

export async function setActivitiesStatus(
  db: Firestore,
  ids: string[],
  status: 'published' | 'draft' | 'archived',
  reviewerUid: string,
): Promise<void> {
  const now = new Date().toISOString();
  for (let i = 0; i < ids.length; i += 400) {
    const batch = db.batch();
    for (const id of ids.slice(i, i + 400)) {
      batch.update(col(db).doc(id), {
        status,
        reviewedByUid: reviewerUid,
        updatedAt: now,
        ...(status === 'published' ? { publishedAt: now } : {}),
      });
    }
    await batch.commit();
  }
}

export async function updateActivityContent(db: Firestore, id: string, content: ActivityContent): Promise<void> {
  const parsed = ActivityContent.parse(content);
  await col(db).doc(id).update({ ...stripUndefined(parsed), fingerprint: titleFingerprint(parsed.title), updatedAt: new Date().toISOString() });
}

/** Actividades publicadas por categoría × franja de edad (tabla de cobertura del panel). */
export async function coverage(db: Firestore): Promise<Record<string, Record<string, number>>> {
  const snap = await col(db).where('status', '==', 'published').select('categories', 'age').get();
  const table: Record<string, Record<string, number>> = Object.fromEntries(
    ACTIVITY_CATEGORY_IDS.map((c) => [c, Object.fromEntries(AGE_BANDS.map((b) => [b.id, 0]))]),
  );
  for (const d of snap.docs) {
    const cats = d.get('categories') as string[];
    const age = d.get('age') as { minMonths: number; maxMonths: number };
    for (const c of cats) {
      for (const b of AGE_BANDS) {
        if (age.minMonths < b.maxMonths && age.maxMonths >= b.minMonths && table[c]) table[c]![b.id]! += 1;
      }
    }
  }
  return table;
}

export function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}
