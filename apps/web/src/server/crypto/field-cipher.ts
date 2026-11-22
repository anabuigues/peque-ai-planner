import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Cifrado de campo (ADR-0009): AES-256-GCM con IV aleatorio de 96 bits.
 * Formato: "v1:<iv b64>:<ciphertext||tag b64>". El AAD (ruta del documento + campo)
 * impide mover un valor cifrado a otro documento o campo.
 * Módulo puro (sin dependencias de servidor) para poder testearlo.
 */
const VERSION = 'v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;

export class DecryptionError extends Error {
  constructor() {
    super('No se pudo descifrar el campo');
    this.name = 'DecryptionError';
  }
}

function assertKey(key: Buffer) {
  if (key.length !== 32) throw new Error('La clave debe ser de 256 bits');
}

export function encryptString(key: Buffer, plaintext: string, aad: string): string {
  assertKey(key);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(aad, 'utf8'));
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final(), cipher.getAuthTag()]);
  return `${VERSION}:${iv.toString('base64')}:${ct.toString('base64')}`;
}

export function decryptString(key: Buffer, value: string, aad: string): string {
  assertKey(key);
  const [version, ivB64, ctB64] = value.split(':');
  if (version !== VERSION || !ivB64 || !ctB64) throw new DecryptionError();
  try {
    const iv = Buffer.from(ivB64, 'base64');
    const data = Buffer.from(ctB64, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(Buffer.from(aad, 'utf8'));
    decipher.setAuthTag(data.subarray(data.length - TAG_BYTES));
    return Buffer.concat([decipher.update(data.subarray(0, data.length - TAG_BYTES)), decipher.final()]).toString('utf8');
  } catch {
    throw new DecryptionError();
  }
}

/** Para valores no textuales (arrays, objetos, números) se cifra su JSON. */
export function encryptJson(key: Buffer, value: unknown, aad: string): string {
  return encryptString(key, JSON.stringify(value), aad);
}

export function decryptJson<T>(key: Buffer, value: string, aad: string): T {
  return JSON.parse(decryptString(key, value, aad)) as T;
}

export function fieldAad(docPath: string, field: string): string {
  return `${docPath}#${field}`;
}

export function newDataKey(): Buffer {
  return randomBytes(32);
}

/** HMAC-SHA256 en hex (p. ej. para buscar invitaciones por email sin guardarlo en claro). */
export function hmacHex(key: Buffer, value: string): string {
  return createHmac('sha256', key).update(value, 'utf8').digest('hex');
}

export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Envoltura de la DEK con una KEK local (solo desarrollo). En GCP la hace Cloud KMS. */
export function wrapKeyLocal(kek: Buffer, dek: Buffer): string {
  return encryptString(kek, dek.toString('base64'), 'peque-plan/dek');
}

export function unwrapKeyLocal(kek: Buffer, wrapped: string): Buffer {
  return Buffer.from(decryptString(kek, wrapped, 'peque-plan/dek'), 'base64');
}
