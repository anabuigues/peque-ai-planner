import 'server-only';
import { Activity } from '@peque/shared';
import { adminDb } from '../firebase-admin';

/** Actividades publicadas (las familias nunca ven borradores, ADR-0007). */
export async function listPublishedActivities(limit = 20): Promise<Activity[]> {
  const snap = await adminDb()
    .collection('activities')
    .where('status', '==', 'published')
    .limit(limit)
    .get();
  return snap.docs.flatMap((d) => {
    const parsed = Activity.safeParse({ id: d.id, ...d.data() });
    return parsed.success ? [parsed.data] : [];
  });
}

export async function countPublishedActivities(): Promise<number> {
  const snap = await adminDb().collection('activities').where('status', '==', 'published').count().get();
  return snap.data().count;
}
