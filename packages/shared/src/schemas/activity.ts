import { z } from 'zod';
import { ACTIVITY_CATEGORY_IDS } from '../taxonomies';
import { AgeRange, ContentStatus } from './common';

export const ActivityResource = z.object({
  type: z.enum(['video', 'article', 'image', 'search']),
  title: z.string().min(1),
  url: z.string().url(),
});

export const ActivityStep = z.object({
  order: z.number().int().min(1),
  text: z.string().min(1),
});

/** Contenido de una actividad (lo que genera la IA o escribe el admin). */
export const ActivityContent = z.object({
  title: z.string().min(3).max(120),
  summary: z.string().min(10).max(500),
  categories: z.array(z.enum(ACTIVITY_CATEGORY_IDS)).min(1),
  age: AgeRange,
  durationMinutes: z.number().int().min(5).max(240),
  materials: z.array(z.string().min(1)).default([]),
  steps: z.array(ActivityStep).min(1),
  tips: z.array(z.string()).default([]),
  resources: z.array(ActivityResource).default([]),
});
export type ActivityContent = z.infer<typeof ActivityContent>;

export const Activity = ActivityContent.extend({
  id: z.string(),
  status: ContentStatus,
  source: z.enum(['ai', 'manual']),
  fingerprint: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Activity = z.infer<typeof Activity>;
