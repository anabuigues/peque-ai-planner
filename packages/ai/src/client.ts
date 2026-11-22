import { GoogleGenAI } from '@google/genai';
import type { AiProvider, ModelClient, ModelRequest, ModelResponse } from './types';

export const DEFAULT_MODEL = 'gemini-2.5-flash';

class GoogleGenAiClient implements ModelClient {
  constructor(
    private readonly ai: GoogleGenAI,
    readonly provider: AiProvider,
    readonly model: string,
  ) {}

  async generate(request: ModelRequest): Promise<ModelResponse> {
    const parts = [
      { text: request.prompt },
      ...(request.images ?? []).map((img) => ({ inlineData: img })),
    ];
    const res = await this.ai.models.generateContent({
      model: this.model,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: request.system,
        temperature: request.temperature ?? 0.4,
        responseMimeType: 'application/json',
        responseJsonSchema: request.jsonSchema,
      },
    });
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

  if (provider === 'vertex') {
    const project = env.GOOGLE_CLOUD_PROJECT;
    const location = env.GOOGLE_CLOUD_LOCATION ?? 'europe-southwest1';
    if (!project) throw new Error('Falta GOOGLE_CLOUD_PROJECT para usar Vertex AI');
    return new GoogleGenAiClient(new GoogleGenAI({ vertexai: true, project, location }), provider, model);
  }
  if (provider === 'gemini-api') {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Falta GEMINI_API_KEY en .env.local (clave de Google AI Studio)');
    }
    return new GoogleGenAiClient(new GoogleGenAI({ apiKey }), provider, model);
  }
  throw new Error(`AI_PROVIDER no soportado: ${provider}`);
}
