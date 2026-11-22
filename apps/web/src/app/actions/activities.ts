'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import * as acts from '@/server/repos/activities';
import { DomainError, getActiveHousehold, listChildren } from '@/server/repos/households';
import { requireUser } from '@/server/session';

export async function toggleSavedAction(activityId: string, saved: boolean): Promise<{ error?: string }> {
  const user = await requireUser();
  const h = await getActiveHousehold(user.uid);
  if (!h) return { error: 'No tienes hogar activo' };
  try {
    await acts.setSaved(user.uid, h.id, activityId, saved);
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar' };
  }
  revalidatePath('/actividades');
  return {};
}

const IdeasInput = z.object({
  categoryId: z.string().optional(),
  childId: z.string().optional(),
  duration: z.string().optional(),
  noSpecialMaterials: z.boolean().optional(),
  keyword: z.string().max(40).optional(),
});

/** "Pedir ideas a la IA" (ADR-0020): solo filtros genéricos; la generación corre en segundo plano. */
export async function requestIdeasAction(input: z.infer<typeof IdeasInput>): Promise<{ error?: string; reused?: boolean }> {
  const user = await requireUser();
  const h = await getActiveHousehold(user.uid);
  if (!h) return { error: 'No tienes hogar activo' };
  try {
    const children = await listChildren(user.uid, h.id);
    const r = await acts.requestAiIdeas(user.uid, h.id, children, IdeasInput.parse(input));
    revalidatePath('/actividades');
    return { reused: r.reused };
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo pedir ideas ahora' };
  }
}
