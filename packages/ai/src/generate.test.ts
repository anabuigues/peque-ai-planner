import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { memoryCacheStore } from './cache';
import { fakeModelClient } from './fake';
import { generateJson } from './generate';
import { cacheKey } from './hash';
import { PersonalDataError } from './privacy';

const Schema = z.object({ titles: z.array(z.string()) });
const buildPrompt = (input: { category: string }) => ({ prompt: `Ideas de ${input.category}` });

describe('generateJson', () => {
  it('no vuelve a llamar al modelo con la misma entrada (caché persistente)', async () => {
    const client = fakeModelClient(() => ({ titles: ['Trasvase de agua'] }));
    const cache = memoryCacheStore();
    const base = { task: 't', promptVersion: 'v1', schema: Schema, buildPrompt, client, cache };

    const first = await generateJson({ ...base, input: { category: 'vida-practica' } });
    const second = await generateJson({ ...base, input: { category: 'vida-practica' } });

    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(second.data).toEqual(first.data);
    expect(client.calls).toHaveLength(1);
    expect(cache.size()).toBe(1);
  });

  it('una nueva versión de prompt sí genera de nuevo', async () => {
    const client = fakeModelClient(() => ({ titles: ['x'] }));
    const cache = memoryCacheStore();
    const base = { task: 't', schema: Schema, buildPrompt, client, cache, input: { category: 'a' } };
    await generateJson({ ...base, promptVersion: 'v1' });
    await generateJson({ ...base, promptVersion: 'v2' });
    expect(client.calls).toHaveLength(2);
  });

  it('envía un JSON Schema al modelo y valida la respuesta', async () => {
    const client = fakeModelClient(() => ({ titles: 'no es un array' }));
    await expect(
      generateJson({
        task: 't',
        promptVersion: 'v1',
        schema: Schema,
        buildPrompt,
        client,
        cache: memoryCacheStore(),
        input: { category: 'a' },
      }),
    ).rejects.toThrow();
    expect(client.calls[0]?.jsonSchema).toMatchObject({ type: 'object' });
  });

  it('bloquea datos personales de menores (ADR-0010)', async () => {
    const client = fakeModelClient(() => ({ titles: [] }));
    await expect(
      generateJson({
        task: 't',
        promptVersion: 'v1',
        schema: Schema,
        buildPrompt: () => ({ prompt: 'x' }),
        client,
        cache: memoryCacheStore(),
        input: { category: 'a', children: [{ birthYearMonth: '2022-01' }] },
      }),
    ).rejects.toBeInstanceOf(PersonalDataError);
    expect(client.calls).toHaveLength(0);
  });
});

describe('cacheKey', () => {
  it('es estable ante orden de claves y espacios', () => {
    const a = cacheKey({ task: 't', promptVersion: 'v', model: 'm', input: { a: 1, b: 2 } });
    const b = cacheKey({ task: 't', promptVersion: 'v', model: 'm', input: { b: 2, a: 1 } });
    expect(a).toBe(b);
    const c = cacheKey({ task: 't', promptVersion: 'v', model: 'm', input: 'hola   mundo ' });
    const d = cacheKey({ task: 't', promptVersion: 'v', model: 'm', input: 'hola mundo' });
    expect(c).toBe(d);
  });
});
