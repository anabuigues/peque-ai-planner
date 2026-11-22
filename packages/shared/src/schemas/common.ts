import { z } from 'zod';

export const ContentStatus = z.enum(['draft', 'published', 'archived']);
export type ContentStatus = z.infer<typeof ContentStatus>;

export const AgeRange = z
  .object({
    minMonths: z.number().int().min(0).max(216),
    maxMonths: z.number().int().min(0).max(216),
  })
  .refine((r) => r.minMonths <= r.maxMonths, 'minMonths debe ser <= maxMonths');
export type AgeRange = z.infer<typeof AgeRange>;

export const GeoPoint = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof GeoPoint>;
