import { GoogleGenAI } from '@google/genai';
import { QuotaExceededError, type AiProvider, type ModelClient, type ModelRequest, type ModelResponse } from './types';

export const DEFAULT_MODEL = 'gemini-3.8-flash';
export const DEFAULT_EMBEDDING_MODEL = 'gemini-embedding-001';
export const DEFAULT_FALLBACK_MODEL = 'gemini-3.6-flash';
export const EMBEDDING_DIMENSIONS = 768;

/** Errores temporales del servicio (saturación, fallo interno): se reintentan con espera. */
function isTransient(e: unknown): boolean {
  const err = e as { status?: number; message?: string };
  return err?.status === 503 || err?.status === 500 || /UNAVAILABLE|high demand|INTERNAL/i.test(err?.message ?? '');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Hasta 4 intentos con espera creciente (5 s, 20 s, 60 s) ante errores temporales. */
export async function withRetry<T>(fn: () => Promise<T>, delays = [5_000, 20_000, 60_000]): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (!isTransient(e) || attempt >= delays.length) throw e;
      await sleep(delays[attempt]!);
    }
  }
}

/** La API devuelve 429 / RESOURCE_EXHAUSTED al agotar la cuota: lo traducimos a QuotaExceededError. */
function mapError(e: unknown): never {
  const err = e as { status?: number; message?: string };
  if (err?.status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(err?.message ?? '')) {
    throw new QuotaExceededError('La API de Gemini ha indicado que se ha superado la cuota');
  }
  throw e;
}

class GoogleGenAiClient implements ModelClient {
  constructor(
    private readonly ai: GoogleGenAI,
    readonly provider: AiProvider,
    readonly model: string,
    readonly embeddingModel: string,
    private readonly fallbackModel?: string,
  ) {}

  async embed(text: string): Promise<number[]> {
    const res = await withRetry(() =>
      this.ai.models.embedContent({ model: this.embeddingModel, contents: text, config: { outputDimensionality: EMBEDDING_DIMENSIONS } }),
    ).catch(mapError);
    const values = res.embeddings?.[0]?.values;
    if (!values?.length) throw new Error('La IA no devolvió el embedding');
    return values;
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    const parts = [
      { text: request.prompt },
      ...(request.images ?? []).map((img) => ({ inlineData: img })),
    ];
    const call = (model: string) =>
      this.ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: request.system,
        temperature: request.temperature ?? 0.4,
        responseMimeType: 'application/json',
        responseJsonSchema: request.jsonSchema,
      },
      });
    // Modelo principal con reintentos; si sigue saturado, una vez con el modelo de reserva.
    const res = await withRetry(() => call(this.model), this.fallbackModel ? [5_000] : undefined)
      .catch((e) => {
        if (this.fallbackModel && isTransient(e)) return withRetry(() => call(this.fallbackModel!), [10_000]);
        throw e;
      })
      .catch(mapError);
    return {
      text: res.text ?? '',
      usage: {
        inputTokens: res.usageMetadata?.promptTokenCount,
        outputTokens: res.usageMetadata?.candidatesTokenCount,
      },
    };
  }
}

/**
 * Crea el cliente según el entorno (ADR-0006):
 * - AI_PROVIDER=gemini-api (local): GEMINI_API_KEY. Solo con datos públicos (ADR-0010).
 * - AI_PROVIDER=vertex (GCP): GOOGLE_CLOUD_PROJECT y GOOGLE_CLOUD_LOCATION (región UE).
 */
export function createModelClient(env: NodeJS.ProcessEnv = process.env): ModelClient {
  const provider = (env.AI_PROVIDER ?? 'gemini-api') as AiProvider;
  const model = env.AI_MODEL ?? DEFAULT_MODEL;
  const embeddingModel = env.AI_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL;
  const fallback = env.AI_FALLBACK_MODEL === 'none' ? undefined : (env.AI_FALLBACK_MODEL ?? DEFAULT_FALLBACK_MODEL);

  if (provider === 'vertex') {
    const project = env.GOOGLE_CLOUD_PROJECT;
    const location = env.GOOGLE_CLOUD_LOCATION ?? 'europe-southwest1';
    if (!project) throw new Error('Falta GOOGLE_CLOUD_PROJECT para usar Vertex AI');
    return new GoogleGenAiClient(new GoogleGenAI({ vertexai: true, project, location }), provider, model, embeddingModel, fallback);
  }
  if (provider === 'gemini-api') {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) throw new MissingApiKeyError();
    return new GoogleGenAiClient(new GoogleGenAI({ apiKey }), provider, model, embeddingModel, fallback);
  }
  throw new Error(`AI_PROVIDER no soportado: ${provider}`);
}

export class MissingApiKeyError extends Error {
  constructor() {
    super('Falta GEMINI_API_KEY en .env.local (clave de Google AI Studio)');
    this.name = 'MissingApiKeyError';
  }
}

export function hasAiCredentials(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.AI_PROVIDER ?? 'gemini-api') === 'vertex' ? Boolean(env.GOOGLE_CLOUD_PROJECT) : Boolean(env.GEMINI_API_KEY);
}
