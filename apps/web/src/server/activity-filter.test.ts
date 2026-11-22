import type { Activity } from '@peque/shared';
import { describe, expect, it } from 'vitest';
import { filterActivities, parseFilters } from './activity-filter';

const base = (id: string, over: Partial<Activity> = {}): Activity => ({
  id,
  title: `Actividad ${id}`,
  summary: 'Resumen',
  categories: ['sensorial'],
  age: { minMonths: 0, maxMonths: 216 },
  durationMinutes: 15,
  materials: [],
  specialMaterials: false,
  steps: [{ order: 1, text: 'x' }],
  tips: [],
  resources: [],
  status: 'published',
  origin: 'web',
  attributions: [],
  fingerprint: id,
  createdAt: '',
  updatedAt: '',
  ...over,
});

const acts = [
  base('bebe', { age: { minMonths: 6, maxMonths: 18 } }),
  base('peque', { age: { minMonths: 30, maxMonths: 60 }, categories: ['cognicion'], materials: ['Pinzas'] }),
  base('ambos', { age: { minMonths: 6, maxMonths: 60 }, durationMinutes: 45 }),
  base('mayores', { age: { minMonths: 96, maxMonths: 144 }, specialMaterials: true, origin: 'ai-admin' }),
];
const none = { categories: [], noSpecialMaterials: false };

describe('filtro de actividades', () => {
  it('"Todos" = encaja con al menos un peque, primero las que encajan con más', () => {
    const r = filterActivities(acts, { ...none, childAgesMonths: [36, 8] });
    expect(r.map((a) => a.id).sort()).toEqual(['ambos', 'bebe', 'peque']);
    expect(r[0]!.id).toBe('ambos');
  });
  it('un peque concreto', () => {
    expect(filterActivities(acts, { ...none, childAgesMonths: [8] }).map((a) => a.id).sort()).toEqual(['ambos', 'bebe']);
  });
  it('combina categoría, duración, material, origen y búsqueda sin acentos', () => {
    expect(filterActivities(acts, { ...none, childAgesMonths: [], categories: ['cognicion'] }).map((a) => a.id)).toEqual(['peque']);
    expect(filterActivities(acts, { ...none, childAgesMonths: [], duration: 'long' }).map((a) => a.id)).toEqual(['ambos']);
    expect(filterActivities(acts, { ...none, childAgesMonths: [], noSpecialMaterials: true }).map((a) => a.id)).not.toContain('mayores');
    expect(filterActivities(acts, { ...none, childAgesMonths: [], origin: 'ai' }).map((a) => a.id)).toEqual(['mayores']);
    expect(filterActivities(acts, { ...none, childAgesMonths: [], query: 'PÍNZAS' }).map((a) => a.id)).toEqual(['peque']);
  });
  it('rotación diaria estable durante el día y distinta otro día', () => {
    const many = Array.from({ length: 30 }, (_, i) => base(`a${i}`));
    const d1 = filterActivities(many, { ...none, childAgesMonths: [] }, '2026-11-22').map((a) => a.id);
    expect(filterActivities(many, { ...none, childAgesMonths: [] }, '2026-11-22').map((a) => a.id)).toEqual(d1);
    expect(filterActivities(many, { ...none, childAgesMonths: [] }, '2026-11-23').map((a) => a.id)).not.toEqual(d1);
  });
  it('lee los filtros de la URL ignorando valores inválidos', () => {
    expect(parseFilters({ cat: 'sensorial,inventada', dur: '30', sin: '1', q: 'agua', origen: 'x' })).toMatchObject({
      categories: ['sensorial'],
      duration: '30',
      noSpecialMaterials: true,
      query: 'agua',
      origin: undefined,
    });
  });
});
