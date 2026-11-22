import 'server-only';
import { createModelClient, firestoreCacheStore, hasAiCredentials } from '@peque/ai';
import { budgetGuard, PoliteFetcher, type CatalogDeps } from '@peque/catalog';
import { adminDb } from './firebase-admin';

/** Dependencias del catálogo para el servidor web (panel de admin y sugerencias de familias). */
export function catalogDeps(channel: 'admin' | 'family'): CatalogDeps {
  const db = adminDb();
  return {
    db,
    client: createModelClient(),
    cache: firestoreCacheStore(db),
    guard: budgetGuard(db, channel),
    fetcher: new PoliteFetcher(),
  };
}

export { hasAiCredentials };
