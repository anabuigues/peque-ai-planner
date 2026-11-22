import { z } from 'zod';
import { ACTIVITY_CATEGORY_IDS } from '../taxonomies';
import { AgeRange, ContentStatus } from './common';

export const ActivityResource = z.object({
  type: z.enum(['video', 'article']),
  url: z.string().url(),
  title: z.string().min(1),
  provider: z.string().optional(),
  validatedAt: z.string().optional(),
});
export type ActivityResource = z.infer<typeof ActivityResource>;

export const ActivityStep = z.object({
  order: z.number().int().min(1),
  text: z.string().min(1),
});

export const ActivityOrigin = z.enum(['web', 'ai-admin', 'ai-on-demand', 'manual']);
export type ActivityOrigin = z.infer<typeof ActivityOrigin>;

export const Attribution = z.object({
  sourceId: z.string(),
  sourceName: z.string(),
  url: z.string().url(),
  retrievedAt: z.string(),
});
export type Attribution = z.infer<typeof Attribution>;

/** Contenido editorial de una actividad (lo que produce la IA o escribe la admin). */
export const ActivityContent = z.object({
  title: z.string().min(3).max(120),
  summary: z.string().min(10).max(500),
  categories: z.array(z.enum(ACTIVITY_CATEGORY_IDS)).min(1).max(2),
  age: AgeRange,
  durationMinutes: z.number().int().min(5).max(240),
  materials: z.array(z.string().min(1)).default([]),
  specialMaterials: z.boolean().default(false),
  steps: z.array(ActivityStep).min(1).max(12),
  tips: z.array(z.string()).default([]),
  resources: z.array(ActivityResource).default([]),
  youtubeSearchQuery: z.string().max(120).optional(),
});
export type ActivityContent = z.infer<typeof ActivityContent>;

export const Activity = ActivityContent.extend({
  id: z.string(),
  status: ContentStatus,
  origin: ActivityOrigin,
  attributions: z.array(Attribution).default([]),
  requestedByHouseholdId: z.string().optional(),
  fingerprint: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().optional(),
});
export type Activity = z.infer<typeof Activity>;

export const DURATION_FILTERS = [
  { id: '15', label: 'Hasta 15 min', min: 0, max: 15 },
  { id: '30', label: '15–30 min', min: 16, max: 30 },
  { id: 'long', label: 'Más de 30 min', min: 31, max: 10_000 },
] as const;
export type DurationFilterId = (typeof DURATION_FILTERS)[number]['id'];
