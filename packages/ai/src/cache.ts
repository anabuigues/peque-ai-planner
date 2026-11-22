import type { AiCacheEntry } from '@peque/shared';
import type { AiCacheStore } from './types';

/** Interfaz mínima de Firestore (Admin SDK) para no acoplar este paquete a firebase-admin. */
interface FirestoreLike {
  collection(path: string): {
    doc(id: string): {
      get(): Promise<{ exists: boolean; data(): unknown }>;
      set(data: Record<string, unknown>): Promise<unknown>;
    };
  };
}

export const AI_CACHE_COLLECTION = 'aiCache';

export function firestoreCacheStore(db: FirestoreLike): AiCacheStore {
  const col = db.collection(AI_CACHE_COLLECTION);
  return {
    async get(key) {
      const snap = await col.doc(key).get();
      return snap.exists ? (snap.data() as AiCacheEntry) : null;
    },
    async set(key, entry) {
      await col.doc(key).set(entry as unknown as Record<string, unknown>);
    },
  };
}

export function memoryCacheStore(): AiCacheStore & { size(): number } {
  const map = new Map<string, AiCacheEntry>();
  return {
    async get(key) {
      return map.get(key) ?? null;
    },
    async set(key, entry) {
      map.set(key, entry);
    },
    size: () => map.size,
  };
}
