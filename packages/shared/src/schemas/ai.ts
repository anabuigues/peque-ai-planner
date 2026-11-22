import { z } from 'zod';

export const AiCacheEntry = z.object({
  task: z.string(),
  promptVersion: z.string(),
  model: z.string(),
  provider: z.enum(['gemini-api', 'vertex', 'fake']),
  inputHash: z.string(),
  output: z.unknown(),
  usage: z
    .object({ inputTokens: z.number().optional(), outputTokens: z.number().optional() })
    .optional(),
  createdAt: z.string(),
});
export type AiCacheEntry = z.infer<typeof AiCacheEntry>;
