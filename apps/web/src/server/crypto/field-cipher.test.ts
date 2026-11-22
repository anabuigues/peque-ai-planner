import { describe, expect, it } from 'vitest';
import {
  DecryptionError,
  decryptJson,
  decryptString,
  encryptJson,
  encryptString,
  fieldAad,
  hmacHex,
  newDataKey,
  unwrapKeyLocal,
  wrapKeyLocal,
} from './field-cipher';

const aad = fieldAad('households/h1/children/c1', 'alias');

describe('cifrado de campo', () => {
  it('cifra y descifra', () => {
    const key = newDataKey();
    const enc = encryptString(key, 'Leo', aad);
    expect(enc).toMatch(/^v1:/);
    expect(enc).not.toContain('Leo');
    expect(decryptString(key, enc, aad)).toBe('Leo');
  });

  it('dos cifrados del mismo valor son distintos (IV aleatorio)', () => {
    const key = newDataKey();
    expect(encryptString(key, 'Leo', aad)).not.toBe(encryptString(key, 'Leo', aad));
  });

  it('falla si se mueve a otro documento o campo (AAD)', () => {
    const key = newDataKey();
    const enc = encryptString(key, 'Leo', aad);
    expect(() => decryptString(key, enc, fieldAad('households/h1/children/c2', 'alias'))).toThrow(DecryptionError);
    expect(() => decryptString(key, enc, fieldAad('households/h1/children/c1', 'notes'))).toThrow(DecryptionError);
  });

  it('falla con la clave de otro hogar o si se manipula', () => {
    const enc = encryptString(newDataKey(), 'Leo', aad);
    expect(() => decryptString(newDataKey(), enc, aad)).toThrow(DecryptionError);
    const key = newDataKey();
    const good = encryptString(key, 'Leo', aad);
    const tampered = good.slice(0, -4) + (good.endsWith('AAAA') ? 'BBBB' : 'AAAA');
    expect(() => decryptString(key, tampered, aad)).toThrow(DecryptionError);
  });

  it('cifra JSON', () => {
    const key = newDataKey();
    const enc = encryptJson(key, ['animales', 'agua'], aad);
    expect(decryptJson(key, enc, aad)).toEqual(['animales', 'agua']);
  });

  it('envuelve y desenvuelve la DEK', () => {
    const kek = newDataKey();
    const dek = newDataKey();
    expect(unwrapKeyLocal(kek, wrapKeyLocal(kek, dek)).equals(dek)).toBe(true);
    expect(() => unwrapKeyLocal(newDataKey(), wrapKeyLocal(kek, dek))).toThrow(DecryptionError);
  });

  it('HMAC estable por clave', () => {
    const k = newDataKey();
    expect(hmacHex(k, 'a@b.es')).toBe(hmacHex(k, 'a@b.es'));
    expect(hmacHex(k, 'a@b.es')).not.toBe(hmacHex(newDataKey(), 'a@b.es'));
  });
});
