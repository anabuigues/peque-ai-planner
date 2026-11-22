'use server';

import {
  ChildInput,
  HouseholdInput,
  LocationInput,
  Preferences,
  PLAN_CATEGORY_IDS,
  TRANSPORT_OPTIONS,
} from '@peque/shared';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { searchMunicipalities } from '@/server/geo';
import * as repo from '@/server/repos/households';
import { DomainError } from '@/server/repos/households';
import { requireUser, SESSION_COOKIE } from '@/server/session';

export type ActionState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean; value?: string } | undefined;

function fail(e: unknown): ActionState {
  if (e instanceof DomainError) return { error: e.message };
  if (e instanceof z.ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of e.issues) fieldErrors[issue.path.join('.')] ??= issue.message;
    return { error: 'Revisa los campos marcados', fieldErrors };
  }
  // No registrar el contenido del formulario: puede llevar datos de menores.
  console.error('Error en acción de perfil:', e instanceof Error ? e.name : 'desconocido');
  return { error: 'Algo ha fallado. Inténtalo de nuevo.' };
}

async function activeHouseholdId(uid: string): Promise<string> {
  const h = await repo.getActiveHousehold(uid);
  if (!h) redirect('/bienvenida');
  return h.id;
}

// --- Lectura de formularios -------------------------------------------------

function readLocation(form: FormData) {
  const lat = form.get('lat');
  const lng = form.get('lng');
  return LocationInput.parse({
    kind: form.get('locationKind'),
    id: form.get('locationId'),
    precise: lat && lng ? { lat: Number(lat), lng: Number(lng) } : undefined,
  });
}

function readChild(form: FormData) {
  return ChildInput.parse({
    alias: form.get('alias'),
    birthYearMonth: `${form.get('birthYear')}-${String(form.get('birthMonth')).padStart(2, '0')}`,
    interests: form.getAll('interests'),
    notes: form.get('notes') ?? '',
  });
}

function readPreferences(form: FormData) {
  const distance = form.get('maxDistanceKm');
  return Preferences.parse({
    maxDistanceKm: distance === 'none' || distance === null ? null : Number(distance),
    budget: form.get('budget') ?? 'any',
    transport: form.getAll('transport').filter((t) => (TRANSPORT_OPTIONS as readonly string[]).includes(String(t))),
    planCategories: form.getAll('planCategories').filter((c) => (PLAN_CATEGORY_IDS as readonly string[]).includes(String(c))),
    setting: form.get('setting') ?? 'any',
  });
}

// --- Consentimiento y alta --------------------------------------------------

export async function acceptConsentAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (form.get('privacy') !== 'on' || form.get('guardian') !== 'on') {
    return { error: 'Necesitamos ambas confirmaciones para continuar' };
  }
  await repo.recordConsent(user.uid);
  redirect('/bienvenida');
}

export async function createHouseholdAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  let next: string;
  try {
    const input = HouseholdInput.parse({ name: form.get('name'), location: readLocation(form) });
    const copy = form.getAll('copyChild').map(String);
    const bySource = new Map<string, string[]>();
    for (const item of copy) {
      const [hid, cid] = item.split(':');
      if (hid && cid) bySource.set(hid, [...(bySource.get(hid) ?? []), cid]);
    }
    await repo.createHousehold(
      user.uid,
      input,
      [...bySource].map(([fromHouseholdId, childIds]) => ({ fromHouseholdId, childIds })),
    );
    next = String(form.get('next') ?? '/perfil');
  } catch (e) {
    return fail(e);
  }
  revalidatePath('/', 'layout');
  redirect(next.startsWith('/') ? next : '/perfil');
}

export async function acceptInviteByIdAction(inviteId: string): Promise<ActionState> {
  const user = await requireUser();
  try {
    await repo.acceptInviteById(inviteId, user.uid, user.email);
  } catch (e) {
    return fail(e);
  }
  revalidatePath('/', 'layout');
  redirect('/bienvenida?paso=peques');
}

export async function acceptInviteAction(token: string): Promise<ActionState> {
  const user = await requireUser();
  try {
    await repo.acceptInvite(token, user.uid, user.email);
  } catch (e) {
    return fail(e);
  }
  revalidatePath('/', 'layout');
  redirect('/perfil');
}

export async function searchMunicipalitiesAction(query: string) {
  await requireUser();
  return searchMunicipalities(String(query).slice(0, 60)).map(({ code, name, province }) => ({ code, name, province }));
}

// --- Hogar activo -----------------------------------------------------------

export async function setActiveHouseholdAction(householdId: string): Promise<void> {
  const user = await requireUser();
  await repo.setActiveHousehold(user.uid, householdId);
  revalidatePath('/', 'layout');
}

export async function updateHouseholdNameAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    const name = HouseholdInput.shape.name.parse(form.get('name'));
    await repo.updateHouseholdName(user.uid, await activeHouseholdId(user.uid), name);
  } catch (e) {
    return fail(e);
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function updateLocationAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    await repo.updateLocation(user.uid, await activeHouseholdId(user.uid), readLocation(form));
  } catch (e) {
    return fail(e);
  }
  revalidatePath('/', 'layout');
  redirect('/perfil');
}

export async function updatePreferencesAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    await repo.updatePreferences(user.uid, await activeHouseholdId(user.uid), readPreferences(form));
  } catch (e) {
    return fail(e);
  }
  revalidatePath('/', 'layout');
  redirect(String(form.get('next') ?? '/perfil'));
}

// --- Peques -----------------------------------------------------------------

export async function saveChildAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const childId = form.get('childId');
  try {
    const hid = await activeHouseholdId(user.uid);
    const input = readChild(form);
    if (childId) await repo.updateChild(user.uid, hid, String(childId), input);
    else await repo.createChild(user.uid, hid, input);
  } catch (e) {
    return fail(e);
  }
  revalidatePath('/', 'layout');
  const next = String(form.get('next') ?? '/perfil');
  redirect(next.startsWith('/') ? next : '/perfil');
}

export async function deleteChildAction(childId: string): Promise<ActionState> {
  const user = await requireUser();
  try {
    await repo.deleteChild(user.uid, await activeHouseholdId(user.uid), childId);
  } catch (e) {
    return fail(e);
  }
  revalidatePath('/', 'layout');
  redirect('/perfil');
}

// --- Adultos e invitaciones -------------------------------------------------

export async function createInviteAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    const email = z.string().trim().email('Escribe un email válido').parse(form.get('email'));
    const token = await repo.createInvite(user.uid, await activeHouseholdId(user.uid), email);
    revalidatePath('/perfil/adultos');
    return { ok: true, value: token };
  } catch (e) {
    return fail(e);
  }
}

export async function revokeInviteAction(inviteId: string): Promise<ActionState> {
  const user = await requireUser();
  try {
    await repo.revokeInvite(user.uid, await activeHouseholdId(user.uid), inviteId);
  } catch (e) {
    return fail(e);
  }
  revalidatePath('/perfil/adultos');
  return { ok: true };
}

export async function removeMemberAction(memberUid: string): Promise<ActionState> {
  const user = await requireUser();
  try {
    await repo.removeMember(user.uid, await activeHouseholdId(user.uid), memberUid);
  } catch (e) {
    return fail(e);
  }
  revalidatePath('/perfil/adultos');
  return { ok: true };
}

export async function transferOwnershipAction(memberUid: string): Promise<ActionState> {
  const user = await requireUser();
  try {
    await repo.transferOwnership(user.uid, await activeHouseholdId(user.uid), memberUid);
  } catch (e) {
    return fail(e);
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}

// --- Salir, borrar ----------------------------------------------------------

const CONFIRM_WORD = 'BORRAR';

export async function leaveHouseholdAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (form.get('confirm') !== CONFIRM_WORD) return { error: `Escribe ${CONFIRM_WORD} para confirmar` };
  try {
    await repo.leaveHousehold(user.uid, await activeHouseholdId(user.uid));
  } catch (e) {
    return fail(e);
  }
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function deleteHouseholdAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (form.get('confirm') !== CONFIRM_WORD) return { error: `Escribe ${CONFIRM_WORD} para confirmar` };
  try {
    await repo.deleteHousehold(user.uid, await activeHouseholdId(user.uid));
  } catch (e) {
    return fail(e);
  }
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function deleteAccountAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (form.get('confirm') !== CONFIRM_WORD) return { error: `Escribe ${CONFIRM_WORD} para confirmar` };
  try {
    await repo.deleteAccount(user.uid);
  } catch (e) {
    return fail(e);
  }
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/login?cuenta=borrada');
}
