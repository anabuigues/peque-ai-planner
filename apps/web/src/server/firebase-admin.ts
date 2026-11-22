import 'server-only';
import { getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * En local, las variables *_EMULATOR_HOST hacen que el Admin SDK hable con los emuladores
 * y el proyecto demo-* garantiza que nunca toque recursos reales (ADR-0003).
 * En GCP usa las credenciales por defecto de la cuenta de servicio.
 */
function adminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  return initializeApp({
    projectId:
      process.env.GCLOUD_PROJECT ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'demo-peque-plan',
  });
}

export const adminAuth = () => getAuth(adminApp());
export const adminDb = () => getFirestore(adminApp());
