import { describe, expect, it } from 'vitest';
import { titleFingerprint } from './fingerprint';

describe('titleFingerprint', () => {
  it('ignora acentos, mayúsculas y signos', () => {
    expect(titleFingerprint('Trasvase de agua!')).toBe(titleFingerprint('  trasvase DE água '));
  });
  it('distingue títulos distintos', () => {
    expect(titleFingerprint('Mesa de luz')).not.toBe(titleFingerprint('Luz negra'));
  });
});
