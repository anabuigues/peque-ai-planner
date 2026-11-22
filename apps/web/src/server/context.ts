import 'server-only';
import type { Child, Household, HouseholdSummary } from '@peque/shared';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import {
  getActiveHousehold,
  getUserDoc,
  hasCurrentConsent,
  listChildren,
  listHouseholds,
  type UserDoc,
} from './repos/households';
import { requireUser, type SessionUser } from './session';

export interface AppContext {
  user: SessionUser;
  userDoc: UserDoc;
  households: HouseholdSummary[];
  household: Household;
  children: Child[];
}

/**
 * Contexto de las páginas de la app: sesión + hogar activo (ADR-0015).
 * Sin consentimiento vigente o sin hogares → alta guiada.
 */
export const requireAppContext = cache(async (): Promise<AppContext> => {
  const user = await requireUser();
  const [userDoc, households] = await Promise.all([getUserDoc(user.uid), listHouseholds(user.uid)]);
  if (!hasCurrentConsent(userDoc) || households.length === 0) redirect('/bienvenida');
  const household = await getActiveHousehold(user.uid);
  if (!household) redirect('/bienvenida');
  const children = await listChildren(user.uid, household.id);
  return { user, userDoc, households, household, children };
});
