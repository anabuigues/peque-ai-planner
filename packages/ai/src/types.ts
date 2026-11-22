import type { AiCacheEntry } from '@peque/shared';

export type AiProvider = 'gemini-api' | 'vertex' | 'fake';

export interface ModelRequest {
  system?: string;
  prompt: string;
  /** Imágenes opcionales (p. ej. capturas de redes sociales) en base64. */
  images?: { mimeType: string; data: string }[];
  jsonSchema: Record<string, unknown>;
  temperature?: number;
}

export interface ModelResponse {
  text: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface ModelClient {
  readonly provider: AiProvider;
  readonly model: string;
  generate(request: ModelRequest): Promise<ModelResponse>;
}

export interface AiCacheStore {
  get(key: string): Promise<AiCacheEntry | null>;
  set(key: string, entry: AiCacheEntry): Promise<void>;
}
