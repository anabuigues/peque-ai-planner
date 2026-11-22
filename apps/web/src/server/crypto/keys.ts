import 'server-only';
import { newDataKey, unwrapKeyLocal, wrapKeyLocal } from './field-cipher';

/**
 * Gestión de claves (ADR-0009):
 * - KEY_PROVIDER=local (desarrollo): KEK en DATA_KEK (.env.local, generada con `npm run setup:keys`).
 * - KEY_PROVIDER=kms (GCP, fase 5): la KEK vive en Cloud KMS. Pendiente de implementar.
 */
export interface KeyWrapper {
  wrap(dek: Buffer): Promise<string>;
  unwrap(wrapped: string): Promise<Buffer>;
  readonly version: string;
}

function readKey(name: string): Buffer {
  const b64 = process.env[name];
  if (!b64) throw new Error(`Falta ${name} en .env.local. Ejecuta: npm run setup:keys`);
  const key = Buffer.from(b64, 'base64');
  if (key.length !== 32) throw new Error(`${name} debe ser una clave de 256 bits en base64`);
  return key;
}

let wrapper: KeyWrapper | undefined;

export function keyWrapper(): KeyWrapper {
  if (wrapper) return wrapper;
  const provider = process.env.KEY_PROVIDER ?? 'local';
  if (provider === 'local') {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_LOCAL_KEK !== 'true') {
      throw new Error('KEY_PROVIDER=local no se permite en producción (usa Cloud KMS)');
    }
    const kek = readKey('DATA_KEK');
    wrapper = {
      version: 'local-1',
      wrap: async (dek) => wrapKeyLocal(kek, dek),
      unwrap: async (w) => unwrapKeyLocal(kek, w),
    };
    return wrapper;
  }
  throw new Error(`KEY_PROVIDER no soportado todavía: ${provider} (Cloud KMS llega en la fase 5)`);
}

export function inviteHmacKey(): Buffer {
  return readKey('INVITE_HMAC_KEY');
}

export { newDataKey };
