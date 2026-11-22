import type { ModelClient, ModelRequest, ModelResponse } from './types';

/** Cliente simulado para tests y para trabajar sin clave: cuenta llamadas y devuelve respuestas fijas. */
export function fakeModelClient(
  respond: (req: ModelRequest) => unknown,
  model = 'fake-model',
  embedder: (text: string) => number[] = defaultFakeEmbedding,
): ModelClient & { calls: ModelRequest[]; embedCalls: string[] } {
  const calls: ModelRequest[] = [];
  const embedCalls: string[] = [];
  return {
    provider: 'fake',
    model,
    embeddingModel: 'fake-embedding',
    calls,
    embedCalls,
    async embed(text) {
      embedCalls.push(text);
      return embedder(text);
    },
    async generate(req): Promise<ModelResponse> {
      calls.push(req);
      return { text: JSON.stringify(respond(req)), usage: { inputTokens: 1, outputTokens: 1 } };
    },
  };
}

/** Embedding falso determinista: bolsa de palabras en 64 dimensiones (textos iguales → vectores iguales). */
export function defaultFakeEmbedding(text: string): number[] {
  const v = new Array<number>(64).fill(0);
  for (const word of text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/)) {
    if (!word) continue;
    let h = 0;
    for (const c of word) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    v[h % 64]! += 1;
  }
  return v;
}
