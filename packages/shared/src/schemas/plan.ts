import { z } from 'zod';
import { PLAN_CATEGORY_IDS } from '../taxonomies';
import { AgeRange, ContentStatus, GeoPoint } from './common';

export const PlanPrice = z.object({
  free: z.boolean(),
  amountEur: z.number().min(0).optional(),
  text: z.string().optional(),
});

export const PlanSource = z.object({
  type: z.enum(['opendata', 'newsletter', 'web', 'social', 'manual']),
  sourceId: z.string().optional(),
  externalId: z.string().optional(),
  url: z.string().url().optional(),
});

export const PlanContent = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(10).max(2000),
  categories: z.array(z.enum(PLAN_CATEGORY_IDS)).min(1),
  age: AgeRange,
  durationMinutes: z.number().int().min(10).max(1440).optional(),
  price: PlanPrice,
  indoor: z.boolean().optional(),
  address: z.string().optional(),
  location: GeoPoint.optional(),
  website: z.string().url().optional(),
  /** Fechas ISO de inicio/fin si es un evento; vacío si es permanente. */
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  scheduleText: z.string().optional(),
});
export type PlanContent = z.infer<typeof PlanContent>;

export const Plan = PlanContent.extend({
  id: z.string(),
  cityId: z.string(),
  geohash: z.string().optional(),
  mapsUrl: z.string().url().optional(),
  status: ContentStatus,
  sources: z.array(PlanSource).min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Plan = z.infer<typeof Plan>;

export const City = z.object({
  id: z.string(),
  name: z.string(),
  center: GeoPoint,
});
export type City = z.infer<typeof City>;

export function googleMapsUrl(point: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`;
}
