import type { Firestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { PoliteFetcher } from './http';
import type { SourceDoc } from './pipelines';
import { setActivitiesStatus } from './store';
import { isSafeUrl } from './urls';

export const SourceInput = z
  .object({
    name: z.string().trim().min(2).max(80),
    homepage: z.string().url().refine(isSafeUrl, 'Debe ser una web https pública'),
    discoveryKind: z.enum(['rss', 'sitemap', 'urls']),
    discoveryUrl: z.string().optional(),
    urls: z.array(z.string()).default([]),
    pathFilter: z.string().trim().optional(),
    termsNote: z.string().trim().max(500).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.discoveryKind !== 'urls' && !(v.discoveryUrl && isSafeUrl(v.discoveryUrl))) {
      ctx.addIssue({ code: 'custom', path: ['discoveryUrl'], message: 'Indica la URL https del RSS o del sitemap' });
    }
    if (v.discoveryKind === 'urls' && (v.urls.length === 0 || !v.urls.every(isSafeUrl))) {
      ctx.addIssue({ code: 'custom', path: ['urls'], message: 'Añade al menos una URL https válida (una por línea)' });
    }
  });
export type SourceInput = z.infer<typeof SourceInput>;

export interface SourceView extends SourceDoc {
  id: string;
  termsNote?: string;
  lastCrawlAt?: string;
  createdAt: string;
  pending?: number;
}

/** Crea una fuente comprobando robots.txt (ADR-0019). */
export async function createSource(db: Firestore, fetcher: PoliteFetcher, input: SourceInput, uid: string): Promise<{ id: string; robotsAllowed: boolean }> {
  const v = SourceInput.parse(input);
  const probe = v.discoveryKind === 'urls' ? v.urls[0]! : v.discoveryUrl!;
  const robotsAllowed = (await fetcher.allowed(probe)) && (v.discoveryKind !== 'urls' || (await Promise.all(v.urls.map((u) => fetcher.allowed(u)))).every(Boolean));
  const ref = db.collection('sources').doc();
  await ref.set({
    name: v.name,
    homepage: v.homepage,
    discovery: v.discoveryKind === 'urls' ? { kind: 'urls', urls: v.urls } : { kind: v.discoveryKind, url: v.discoveryUrl },
    ...(v.pathFilter ? { pathFilter: v.pathFilter } : {}),
    ...(v.termsNote ? { termsNote: v.termsNote } : {}),
    content: ['activities'],
    robotsAllowed,
    status: robotsAllowed ? 'active' : 'paused',
    createdByUid: uid,
    createdAt: new Date().toISOString(),
  });
  return { id: ref.id, robotsAllowed };
}

export async function listSources(db: Firestore): Promise<SourceView[]> {
  const snap = await db.collection('sources').get();
  const views = await Promise.all(
    snap.docs.map(async (d) => {
      const pending = await db.collection('sourceItems').where('sourceId', '==', d.id).where('status', '==', 'pending').count().get();
      return { id: d.id, ...(d.data() as Omit<SourceView, 'id'>), pending: pending.data().count };
    }),
  );
  return views.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export async function setSourceStatus(db: Firestore, id: string, status: 'active' | 'paused'): Promise<void> {
  const doc = (await db.collection('sources').doc(id).get()).data() as SourceDoc | undefined;
  if (!doc) throw new Error('Fuente no encontrada');
  if (status === 'active' && !doc.robotsAllowed) throw new Error('robots.txt no permite rastrear esta fuente');
  await db.collection('sources').doc(id).update({ status });
}

/** Bloquea una fuente: archiva sus borradores y, si se pide, también sus publicadas. */
export async function blockSource(db: Firestore, id: string, uid: string, retirePublished: boolean): Promise<number> {
  await db.collection('sources').doc(id).update({ status: 'blocked', blockedAt: new Date().toISOString() });
  const snap = await db.collection('activities').where('sourceIds', 'array-contains', id).select('status').get();
  const ids = snap.docs.filter((d) => d.get('status') === 'draft' || (retirePublished && d.get('status') === 'published')).map((d) => d.id);
  await setActivitiesStatus(db, ids, 'archived', uid);
  return ids.length;
}
