import { z } from 'zod';
import { CHILD_INTERESTS, PLAN_CATEGORY_IDS } from '../taxonomies';
import { GeoPoint } from './common';

/** Límites de la spec de perfil (docs/specs/perfil.md). */
export const LIMITS = {
  householdsPerUser: 10,
  adultsPerHousehold: 8,
  childrenPerHousehold: 12,
  inviteTtlDays: 14,
} as const;

export const PRIVACY_POLICY_VERSION = '2026-11-22';

const BirthYearMonth = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Usa el formato AAAA-MM')
  .refine((v) => {
    const [y, m] = v.split('-').map(Number) as [number, number];
    const now = new Date();
    const months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
    return months >= 0 && months <= 17 * 12 + 11;
  }, 'La fecha debe estar entre hoy y hace 17 años');

/** Datos de un peque tal como los ve la aplicación (descifrados). */
export const ChildInput = z.object({
  alias: z.string().trim().min(1, 'Escribe un alias').max(30, 'Máximo 30 caracteres'),
  birthYearMonth: BirthYearMonth,
  interests: z.array(z.enum(CHILD_INTERESTS)).max(6, 'Máximo 6 intereses').default([]),
  notes: z.string().trim().max(280, 'Máximo 280 caracteres').default(''),
});
export type ChildInput = z.infer<typeof ChildInput>;

export const CHILD_COLORS = ['violet', 'pink', 'amber', 'teal', 'blue', 'orange', 'green', 'indigo'] as const;

export const Child = ChildInput.extend({
  id: z.string(),
  color: z.enum(CHILD_COLORS),
});
export type Child = z.infer<typeof Child>;

export const AreaKind = z.enum(['barrio', 'municipio']);
export const Area = z.object({
  kind: AreaKind,
  /** id de barrio (mad-XXX) o código INE del municipio. */
  id: z.string(),
  label: z.string(),
  geohash6: z.string().length(6),
});
export type Area = z.infer<typeof Area>;

export const DISTANCE_OPTIONS = [2, 5, 10, 25, null] as const;
export const BUDGET_OPTIONS = ['free', 'upTo10', 'upTo25', 'any'] as const;
export const TRANSPORT_OPTIONS = ['walk', 'public', 'car'] as const;
export const SETTING_OPTIONS = ['any', 'indoor', 'outdoor'] as const;

export const Preferences = z.object({
  maxDistanceKm: z.union([z.literal(2), z.literal(5), z.literal(10), z.literal(25), z.null()]).default(10),
  budget: z.enum(BUDGET_OPTIONS).default('any'),
  transport: z.array(z.enum(TRANSPORT_OPTIONS)).default([]),
  planCategories: z.array(z.enum(PLAN_CATEGORY_IDS)).default([]),
  setting: z.enum(SETTING_OPTIONS).default('any'),
});
export type Preferences = z.infer<typeof Preferences>;
export const DEFAULT_PREFERENCES: Preferences = Preferences.parse({});

export const LocationInput = z.object({
  kind: AreaKind,
  id: z.string().min(1),
  /** Coordenadas de "usar mi ubicación" (se guardan cifradas). */
  precise: GeoPoint.optional(),
});
export type LocationInput = z.infer<typeof LocationInput>;

export const HouseholdInput = z.object({
  name: z.string().trim().min(1, 'Ponle un nombre').max(40, 'Máximo 40 caracteres'),
  location: LocationInput,
});
export type HouseholdInput = z.infer<typeof HouseholdInput>;

export type MemberRole = 'owner' | 'member';

/** Vista de un hogar para la app (descifrada). */
export interface Household {
  id: string;
  name: string;
  ownerUid: string;
  memberUids: string[];
  cityId: string;
  area: Area;
  preciseLocation?: GeoPoint;
  preferences: Preferences;
}

export interface HouseholdSummary {
  id: string;
  name: string;
  areaLabel: string;
  role: MemberRole;
}
