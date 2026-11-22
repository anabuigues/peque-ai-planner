import { z } from 'zod';
import { cacheKey } from './hash';
import { assertNoPersonalData } from './privacy';
import type { AiCacheStore, ModelClient } from './types';

export interface GenerateJsonOptions<TInput, TSchema extends z.ZodType> {
  /** Identificador estable de la tarea, p. ej. "activities.generate". */
  task: string;
  /** Súbela cada vez que cambie el prompt o el esquema: invalida la caché de forma explícita. */
  promptVersion: string;
  input: TInput;
  schema: TSchema;
  buildPrompt: (input: TInput) => { system?: string; prompt: string };
  images?: { mimeType: string; data: string }[];
  client: ModelClient;
  cache: AiCacheStore;
  temperature?: number;
}

export interface GenerateJsonResult<T> {
  data: T;
  cached: boolean;
  key: string;
}

/**
 * Única puerta de entrada a la IA (ADR-0006).
 * 1. Bloquea datos personales (ADR-0010).
 * 2. Si la misma tarea + versión + modelo + entrada ya se resolvió, devuelve lo guardado sin llamar al modelo.
 * 3. Si no, llama al modelo con salida JSON estructurada, valida con Zod y persiste.
 */
export async function generateJson<TInput, TSchema extends z.ZodType>(
  opts: GenerateJsonOptions<TInput, TSchema>,
): Promise<GenerateJsonResult<z.infer<TSchema>>> {
  assertNoPersonalData(opts.input);

  const key = cacheKey({
    task: opts.task,
    promptVersion: opts.promptVersion,
    model: opts.client.model,
    input: { input: opts.input, images: opts.images?.map((i) => i.data) },
  });

  const hit = await opts.cache.get(key);
  if (hit) {
    return { data: opts.schema.parse(hit.output), cached: true, key };
  }

  const { system, prompt } = opts.buildPrompt(opts.input);
  const jsonSchema = z.toJSONSchema(opts.schema, { target: 'draft-7' }) as Record<string, unknown>;
  const res = await opts.client.generate({
    system,
    prompt,
    images: opts.images,
    jsonSchema,
    temperature: opts.temperature,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(res.text);
  } catch {
    throw new Error(`La IA devolvió un JSON inválido para la tarea ${opts.task}`);
  }
  const data = opts.schema.parse(parsed);

  await opts.cache.set(key, {
    task: opts.task,
    promptVersion: opts.promptVersion,
    model: opts.client.model,
    provider: opts.client.provider,
    inputHash: key,
    output: data,
    usage: res.usage,
    createdAt: new Date().toISOString(),
  });

  return { data, cached: false, key };
}
