/**
 * Datos de ejemplo para el emulador (idempotente: ids fijos).
 * Solo catálogo público. Los hogares sintéticos se añaden en la fase 1, cuando exista el cifrado de campo.
 */
import { initAdmin } from './firebase';
import { titleFingerprint } from '@peque/catalog';
import { SEED_ACTIVITIES } from './seed-data';

const { db } = initAdmin();
const now = new Date().toISOString();

await db.collection('cities').doc('madrid').set({
  id: 'madrid',
  name: 'Madrid',
  center: { lat: 40.4168, lng: -3.7038 },
});

const batch = db.batch();
for (const { slug, ...content } of SEED_ACTIVITIES) {
  batch.set(db.collection('activities').doc(`seed-${slug}`), {
    ...content,
    status: 'published',
    origin: 'manual',
    attributions: [],
    fingerprint: titleFingerprint(content.title),
    createdAt: now,
    updatedAt: now,
  });
}
await batch.commit();

console.log(`Seed completado: 1 ciudad, ${SEED_ACTIVITIES.length} actividades publicadas.`);
