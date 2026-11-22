import {
  ACTIVITY_CATEGORY_IDS,
  ageBandFor,
  DURATION_FILTERS,
  fitsAgeRange,
  normalizeForSearch,
  type Activity,
  type ActivityCategoryId,
} from '@peque/shared';

/** Filtros y personalización del catálogo (docs/specs/actividades.md). Módulo puro y testeable. */
export interface ActivityFilters {
  childAgesMonths: number[]; // edades de los peques seleccionados (vacío = sin personalización por edad)
  categories: ActivityCategoryId[];
  duration?: string;
  noSpecialMaterials: boolean;
  query?: string;
  origin?: 'web' | 'ai';
}

export function parseFilters(
  params: Record<string, string | string[] | undefined>,
): Omit<ActivityFilters, 'childAgesMonths'> & { para?: string } {
  const one = (k: string) => (Array.isArray(params[k]) ? params[k]![0] : (params[k] as string | undefined));
  const cats = (one('cat') ?? '')
    .split(',')
    .filter((c): c is ActivityCategoryId => (ACTIVITY_CATEGORY_IDS as readonly string[]).includes(c));
  const dur = one('dur');
  const origen = one('origen');
  return {
    para: one('para'),
    categories: cats,
    duration: DURATION_FILTERS.some((d) => d.id === dur) ? dur : undefined,
    noSpecialMaterials: one('sin') === '1',
    query: one('q')?.slice(0, 60) || undefined,
    origin: origen === 'web' || origen === 'ai' ? origen : undefined,
  };
}

/** Hash estable para la rotación diaria. */
function dailyScore(id: string, dayKey: string): number {
  let h = 2166136261;
  for (const c of id + dayKey) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

export function filterActivities(activities: Activity[], f: ActivityFilters, dayKey = new Date().toISOString().slice(0, 10)): Activity[] {
  const q = f.query ? normalizeForSearch(f.query) : '';
  const dur = DURATION_FILTERS.find((d) => d.id === f.duration);
  const scored = activities
    .filter((a) => {
      if (f.childAgesMonths.length && !f.childAgesMonths.some((m) => fitsAgeRange(m, a.age))) return false;
      if (f.categories.length && !a.categories.some((c) => f.categories.includes(c))) return false;
      if (dur && (a.durationMinutes < dur.min || a.durationMinutes > dur.max)) return false;
      if (f.noSpecialMaterials && a.specialMaterials) return false;
      if (f.origin === 'web' && a.origin !== 'web') return false;
      if (f.origin === 'ai' && a.origin !== 'ai-admin' && a.origin !== 'ai-on-demand') return false;
      if (q) {
        const hay = normalizeForSearch([a.title, a.summary, ...a.materials].join(' '));
        if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      return true;
    })
    .map((a) => ({
      a,
      fits: f.childAgesMonths.filter((m) => fitsAgeRange(m, a.age)).length,
      rot: dailyScore(a.id, dayKey),
    }));
  scored.sort((x, y) => y.fits - x.fits || x.rot - y.rot);
  return scored.map((s) => s.a);
}

/** Franja de edad común para pedir ideas a la IA (nunca la edad exacta, ADR-0020). */
export function ageBandForRequest(childAgesMonths: number[]): string | undefined {
  if (childAgesMonths.length !== 1) return undefined;
  return ageBandFor(childAgesMonths[0]!);
}
