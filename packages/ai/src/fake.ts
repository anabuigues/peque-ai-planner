import type { ModelClient, ModelRequest, ModelResponse } from './types';

/** Cliente simulado para tests y para trabajar sin clave: cuenta llamadas y devuelve respuestas fijas. */
export function fakeModelClient(
  respond: (req: ModelRequest) => unknown,
  model = 'fake-model',
): ModelClient & { calls: ModelRequest[] } {
  const calls: ModelRequest[] = [];
  return {
    provider: 'fake',
    model,
    calls,
    async generate(req): Promise<ModelResponse> {
      calls.push(req);
      return { text: JSON.stringify(respond(req)), usage: { inputTokens: 1, outputTokens: 1 } };
    },
  };
}
