import { randomBytes } from 'node:crypto';

// Proyecto aparte para no tocar los datos del emulador de desarrollo.
process.env.GCLOUD_PROJECT = 'demo-peque-plan-it';
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
process.env.KEY_PROVIDER = 'local';
process.env.DATA_KEK = randomBytes(32).toString('base64');
process.env.INVITE_HMAC_KEY = randomBytes(32).toString('base64');
