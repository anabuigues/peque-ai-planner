/**
 * Taxonomías compartidas entre web, jobs e IA.
 * Cambiar un id rompe datos existentes: añade nuevos, no renombres.
 */

export const ACTIVITY_CATEGORIES = [
  { id: 'vida-practica', label: 'Vida práctica', color: 'amber', description: 'Tareas cotidianas reales: verter, limpiar, cocinar, vestirse, cuidar plantas.' },
  { id: 'motricidad-gruesa', label: 'Motricidad gruesa', color: 'orange', description: 'Movimientos con todo el cuerpo: gatear, saltar, equilibrio, circuitos.' },
  { id: 'motricidad-fina', label: 'Motricidad fina', color: 'pink', description: 'Precisión de manos y dedos: pinzas, enhebrar, recortar, trasvases pequeños.' },
  { id: 'cognicion', label: 'Cognición', color: 'violet', description: 'Clasificar, emparejar, secuencias, causa-efecto, números y lógica.' },
  { id: 'lenguaje', label: 'Lenguaje', color: 'blue', description: 'Vocabulario, cuentos, canciones, conversación, primeras letras.' },
  { id: 'sensorial', label: 'Sensorial', color: 'teal', description: 'Explorar texturas, sonidos, olores, sabores y temperaturas.' },
  { id: 'mesa-de-luz', label: 'Mesa de luz', color: 'yellow', description: 'Actividades sobre una superficie iluminada desde abajo con materiales translúcidos.' },
  { id: 'luz-negra', label: 'Luz negra', color: 'indigo', description: 'Actividades con luz ultravioleta y materiales fluorescentes en penumbra.' },
] as const;

export type ActivityCategoryId = (typeof ACTIVITY_CATEGORIES)[number]['id'];
export const ACTIVITY_CATEGORY_IDS = ACTIVITY_CATEGORIES.map((c) => c.id) as [
  ActivityCategoryId,
  ...ActivityCategoryId[],
];

/** Franjas de edad en meses [min, max). Se usan para generar contenido y para filtrar. */
export const AGE_BANDS = [
  { id: '0-1', label: '0–12 meses', minMonths: 0, maxMonths: 12 },
  { id: '1-2', label: '1–2 años', minMonths: 12, maxMonths: 24 },
  { id: '2-3', label: '2–3 años', minMonths: 24, maxMonths: 36 },
  { id: '3-6', label: '3–6 años', minMonths: 36, maxMonths: 72 },
  { id: '6-9', label: '6–9 años', minMonths: 72, maxMonths: 108 },
  { id: '9-12', label: '9–12 años', minMonths: 108, maxMonths: 144 },
] as const;

export type AgeBandId = (typeof AGE_BANDS)[number]['id'];

export const PLAN_CATEGORIES = [
  { id: 'cultura', label: 'Museos y cultura' },
  { id: 'teatro-musica', label: 'Teatro y música' },
  { id: 'naturaleza', label: 'Naturaleza y parques' },
  { id: 'deporte', label: 'Deporte' },
  { id: 'talleres', label: 'Talleres' },
  { id: 'animales', label: 'Granjas y animales' },
  { id: 'ocio', label: 'Ocio y parques de juego' },
  { id: 'cine', label: 'Cine' },
] as const;

export type PlanCategoryId = (typeof PLAN_CATEGORIES)[number]['id'];
export const PLAN_CATEGORY_IDS = PLAN_CATEGORIES.map((c) => c.id) as [
  PlanCategoryId,
  ...PlanCategoryId[],
];

/** Intereses de los peques: lista cerrada (ADR-0011, minimización). */
export const CHILD_INTERESTS = [
  'animales',
  'arte',
  'musica',
  'deporte',
  'naturaleza',
  'ciencia',
  'construccion',
  'cuentos',
  'teatro',
  'cocina',
  'vehiculos',
  'agua',
] as const;

export type ChildInterest = (typeof CHILD_INTERESTS)[number];

export const CHILD_INTEREST_LABELS: Record<ChildInterest, string> = {
  animales: 'Animales',
  arte: 'Arte y manualidades',
  musica: 'Música',
  deporte: 'Deporte',
  naturaleza: 'Naturaleza',
  ciencia: 'Ciencia',
  construccion: 'Construcción',
  cuentos: 'Cuentos',
  teatro: 'Teatro y títeres',
  cocina: 'Cocina',
  vehiculos: 'Vehículos',
  agua: 'Agua',
};
