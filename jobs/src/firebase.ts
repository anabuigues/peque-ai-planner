import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/** Admin SDK para scripts. En local exige emuladores para no tocar nunca datos reales (ADR-0003). */
export function initAdmin() {
  const projectId = process.env.GCLOUD_PROJECT ?? 'demo-peque-plan';
  if (projectId.startsWith('demo-') && !process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Proyecto demo sin FIRESTORE_EMULATOR_HOST: arranca los emuladores y revisa .env.local');
  }
  const app = getApps()[0] ?? initializeApp({ projectId });
  return { db: getFirestore(app), auth: getAuth(app) };
}
