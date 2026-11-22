import { ACTIVITY_CATEGORIES, ACTIVITY_CATEGORY_IDS, AGE_BANDS } from '@peque/shared';
import { z } from 'zod';

/**
 * Prompts y esquemas de salida (ADR-0006). Cambiar un prompt o un esquema exige subir su versión.
 * Ninguna entrada contiene datos personales (ADR-0010).
 */

const categoryGuide = ACTIVITY_CATEGORIES.map((c) => `- ${c.id}: ${c.label} — ${c.description}`).join('\n');

const SAFETY = `Seguridad: para menores de 3 años, nada de piezas pequeñas que quepan en la boca (riesgo de atragantamiento) salvo con supervisión estricta y advertencia explícita; indica siempre supervisión adulta cuando haya agua, cuerdas, cocina o herramientas; materiales no tóxicos.`;

/** Lo que produce la IA para una actividad (sin campos de sistema). */
/** Tolerante: recorta lo que se pase de largo en lugar de rechazar toda la respuesta. */
const clip = (max: number) => z.string().trim().transform((s) => s.slice(0, max));
const clamp = (min: number, max: number) => z.number().transform((n) => Math.min(max, Math.max(min, Math.round(n))));
export const AiActivity = z.object({
  title: clip(120).pipe(z.string().min(3)),
  summary: clip(500).pipe(z.string().min(10)),
  categories: z
    .array(z.string())
    .transform((cs) => [...new Set(cs.filter((c): c is (typeof ACTIVITY_CATEGORY_IDS)[number] => (ACTIVITY_CATEGORY_IDS as readonly string[]).includes(c)))].slice(0, 2))
    .pipe(z.array(z.enum(ACTIVITY_CATEGORY_IDS)).min(1)),
  minAgeMonths: clamp(0, 216),
  maxAgeMonths: clamp(0, 216),
  durationMinutes: clamp(5, 240),
  materials: z.array(clip(120)).transform((a) => a.filter(Boolean).slice(0, 15)),
  specialMaterials: z.boolean(),
  steps: z.array(clip(300)).transform((a) => a.filter((x) => x.length >= 3).slice(0, 8)).pipe(z.array(z.string()).min(1)),
  tips: z.array(clip(300)).transform((a) => a.filter((x) => x.length >= 3).slice(0, 4)),
  youtubeSearchQuery: clip(120),
  videoCandidates: z.array(z.string()).transform((a) => a.slice(0, 3)),
});
export type AiActivity = z.output<typeof AiActivity>;

// --- Extracción desde una página web (ADR-0019) ---
export const EXTRACT_VERSION = 'activities.extract@1';
export const ExtractOutput = z.object({ activities: z.array(AiActivity).transform((a) => a.slice(0, 5)) });

export function extractPrompt(input: { pageTitle: string; text: string }) {
  return {
    system: `Eres editora de un catálogo de actividades para hacer en casa con niños de 0 a 12 años, en español de España.
Recibes el texto de una página web. Tu trabajo:
1. Decide si la página describe una o varias actividades concretas para hacer con niños. Si no (noticias, tiendas, opinión, índices), devuelve "activities": [].
2. Por cada actividad, rellena los datos estructurados y REDACTA CON TUS PROPIAS PALABRAS un resumen breve, pasos (máx. 8, máx. 30 palabras cada uno) y consejos. Está PROHIBIDO copiar frases de la página: no reproduzcas ninguna secuencia de 8 o más palabras del original. No incluyas nombres de autores, marcas ni enlaces a tiendas.
3. Usa solo estas categorías (1 o 2):
${categoryGuide}
4. Edad en meses (mínima y máxima razonables). "specialMaterials" = true si necesita algo que no suele haber en casa (mesa de luz, lámpara UV, material Montessori específico).
5. "videoCandidates": deja la lista vacía (los vídeos de la página se añaden aparte). "youtubeSearchQuery": búsqueda en español para encontrar ejemplos.
${SAFETY}`,
    prompt: `Título de la página: ${input.pageTitle}\n\nTexto de la página:\n"""\n${input.text.slice(0, 20_000)}\n"""`,
  };
}

export const REWRITE_VERSION = 'activities.rewrite@1';
export const RewriteOutput = z.object({ activity: AiActivity });
export function rewritePrompt(input: { activity: AiActivity; copied: string[] }) {
  return {
    system: `Reescribe la actividad con palabras completamente distintas, manteniendo el significado, los datos y la seguridad. Evita estas frases copiadas y cualquier secuencia de 8 palabras de ellas:\n${input.copied.map((c) => `- "${c}"`).join('\n')}`,
    prompt: JSON.stringify(input.activity),
  };
}

// --- Generación por la admin (ADR-0018) ---
export const GENERATE_VERSION = 'activities.generate@1';
export const GenerateOutput = z.object({ activities: z.array(AiActivity).min(1).transform((a) => a.slice(0, 20)) });

export function generatePrompt(input: { categoryId: string; ageBandId?: string; count: number; existingTitles: string[] }) {
  const cat = ACTIVITY_CATEGORIES.find((c) => c.id === input.categoryId)!;
  const band = AGE_BANDS.find((b) => b.id === input.ageBandId);
  return {
    system: `Eres educadora infantil y escribes fichas de actividades para hacer en casa, en español de España, claras y prácticas.
Categorías disponibles:
${categoryGuide}
${SAFETY}
"videoCandidates": hasta 3 URLs de vídeos de YouTube reales que conozcas y muestren la actividad; si no estás segura, deja la lista vacía (se validarán y descartarán las que no existan).`,
    prompt: `Propón ${input.count} actividades DISTINTAS de la categoría "${cat.label}" (${cat.id})${
      band ? ` para ${band.label} (${band.minMonths}-${band.maxMonths} meses)` : ', repartidas entre 0 y 12 años'
    }.
No repitas ni hagas variantes triviales de estas actividades que ya existen:
${input.existingTitles.slice(0, 300).map((t) => `- ${t}`).join('\n') || '(ninguna)'}`,
  };
}

// --- Sugerencias bajo demanda de las familias (ADR-0020) ---
export const ON_DEMAND_VERSION = 'activities.ondemand@1';
export const OnDemandFilters = z.object({
  categoryId: z.enum(ACTIVITY_CATEGORY_IDS).optional(),
  ageBandId: z.string().optional(),
  maxDuration: z.number().int().optional(),
  noSpecialMaterials: z.boolean().optional(),
  keyword: z.string().max(40).optional(),
});
export type OnDemandFilters = z.infer<typeof OnDemandFilters>;
export const OnDemandOutput = z.object({ activities: z.array(AiActivity).min(1).transform((a) => a.slice(0, 3)) });

/** Quita de la palabra libre emails, teléfonos y números largos antes de enviarla (ADR-0020). */
export function sanitizeKeyword(keyword?: string): string | undefined {
  if (!keyword) return undefined;
  const clean = keyword
    .replace(/\S+@\S+/g, ' ')
    .replace(/\+?\d[\d\s-]{5,}\d/g, ' ')
    .replace(/\d{4,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
  return clean || undefined;
}

export function onDemandPrompt(input: OnDemandFilters & { existingTitles: string[] }) {
  const cat = ACTIVITY_CATEGORIES.find((c) => c.id === input.categoryId);
  const band = AGE_BANDS.find((b) => b.id === input.ageBandId);
  const parts = [
    cat ? `categoría "${cat.label}" (${cat.id})` : 'cualquier categoría',
    band ? `para ${band.label}` : 'para niños de 0 a 12 años',
    input.maxDuration ? `de como máximo ${input.maxDuration} minutos` : null,
    input.noSpecialMaterials ? 'sin materiales especiales (solo cosas que hay en casa)' : null,
    input.keyword ? `relacionadas con "${input.keyword}"` : null,
  ].filter(Boolean);
  return {
    system: generatePrompt({ categoryId: cat?.id ?? 'sensorial', count: 3, existingTitles: [] }).system,
    prompt: `Una familia no encuentra actividades en nuestro catálogo. Propón 3 actividades originales: ${parts.join(', ')}.
No repitas estas que ya existen:
${input.existingTitles.slice(0, 200).map((t) => `- ${t}`).join('\n') || '(ninguna)'}`,
  };
}

// --- Relevancia de un enlace (ADR-0017) ---
export const RELEVANCE_VERSION = 'links.relevance@1';
export const RelevanceOutput = z.object({ relevant: z.boolean(), score: z.number().transform((n) => Math.min(1, Math.max(0, n))) });
export function relevancePrompt(input: { activityTitle: string; activitySummary: string; linkTitle: string; provider: string }) {
  return {
    system: 'Decides si un vídeo o una página web muestra o explica la actividad indicada (o una casi idéntica). Responde con relevant y una puntuación de 0 a 1.',
    prompt: `Actividad: ${input.activityTitle}\nResumen: ${input.activitySummary}\n\n${input.provider}: "${input.linkTitle}"`,
  };
}
