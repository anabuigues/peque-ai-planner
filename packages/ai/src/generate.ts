import { z } from 'zod';
import { cacheKey } from './hash';
import { assertNoPersonalData } from './privacy';
import type { AiCacheStore, CallGuard, CallPurpose, ModelClient } from './types';

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
  /** Cuota diaria: se consulta solo si hay que llamar de verdad al modelo. */
  guard?: CallGuard;
  purpose?: CallPurpose;
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

  await opts.guard?.beforeCall(opts.purpose ?? 'other');
  const { system, prompt } = opts.buildPrompt(opts.input);
  const jsonSchema = simplifySchema(z.toJSONSchema(opts.schema, { target: 'draft-7', io: 'input' })) as Record<string, unknown>;
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

/**
 * Embedding de un texto con la misma caché persistente (ADR-0018).
 * El texto debe ser contenido público del catálogo (ADR-0010).
 */
export async function embedText(opts: {
  text: string;
  client: ModelClient;
  cache: AiCacheStore;
  guard?: CallGuard;
}): Promise<{ vector: number[]; cached: boolean }> {
  const key = cacheKey({ task: 'embed', promptVersion: 'v1', model: opts.client.embeddingModel, input: opts.text });
  const hit = await opts.cache.get(key);
  if (hit) return { vector: hit.output as number[], cached: true };
  await opts.guard?.beforeCall('embed');
  const vector = await opts.client.embed(opts.text);
  await opts.cache.set(key, {
    task: 'embed',
    promptVersion: 'v1',
    model: opts.client.embeddingModel,
    provider: opts.client.provider,
    inputHash: key,
    output: vector,
    createdAt: new Date().toISOString(),
  });
  return { vector, cached: false };
}

/** Restricciones que hacen el esquema demasiado complejo para el modelo; se validan después con Zod. */
const DROPPED_KEYS = new Set(['minLength', 'maxLength', 'minItems', 'maxItems', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'pattern', 'format', '$schema', 'additionalProperties', 'default']);

export function simplifySchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(simplifySchema);
  if (!node || typeof node !== 'object') return node;
  return Object.fromEntries(
    Object.entries(node as Record<string, unknown>)
      .filter(([k]) => !DROPPED_KEYS.has(k))
      .map(([k, v]) => [k, simplifySchema(v)]),
  );
}
