import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import {
  Child,
  CHILD_COLORS,
  ChildInput,
  DEFAULT_PREFERENCES,
  encodeGeohash,
  LIMITS,
  Preferences,
  PRIVACY_POLICY_VERSION,
  type Area,
  type GeoPoint,
  type Household,
  type HouseholdInput,
  type HouseholdSummary,
  type LocationInput,
} from '@peque/shared';
import { FieldValue, type DocumentReference, type Transaction } from 'firebase-admin/firestore';
import { cache } from 'react';
import {
  decryptJson,
  decryptString,
  encryptJson,
  encryptString,
  fieldAad,
  hmacHex,
  safeEqualHex,
} from '../crypto/field-cipher';
import { inviteHmacKey, keyWrapper, newDataKey } from '../crypto/keys';
import { adminAuth, adminDb } from '../firebase-admin';
import { resolveArea } from '../geo';

/**
 * Repositorio de hogares (docs/specs/perfil.md).
 * Única capa que cifra y descifra datos del hogar (ADR-0009, ADR-0014).
 * Todas las funciones reciben el uid ya autenticado y comprueban la pertenencia.
 * Nunca registrar en logs valores descifrados ni tokens.
 */

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

const db = () => adminDb();
const householdRef = (id: string) => db().collection('households').doc(id);
const childrenCol = (hid: string) => householdRef(hid).collection('children');
const userRef = (uid: string) => db().collection('users').doc(uid);
const invitesCol = () => db().collection('invites');

interface HouseholdDoc {
  ownerUid: string;
  memberUids: string[];
  name: string; // cifrado
  cityId: string;
  area: Area;
  preciseLocation?: string; // cifrado
  preferences: Preferences;
  wrappedDek: string;
  dekVersion: string;
}

interface ChildDoc {
  alias: string;
  birthYearMonth: string;
  interests: string;
  notes: string;
  color: (typeof CHILD_COLORS)[number];
}

export interface UserDoc {
  email?: string | null;
  name?: string | null;
  picture?: string | null;
  householdIds?: string[];
  activeHouseholdId?: string | null;
  privacyConsent?: { version: string; acceptedAt: string; guardianDeclaration: boolean };
}

// --- Claves -----------------------------------------------------------------

/** DEK descifrada, cacheada durante la petición. */
const unwrapDek = cache(async (wrapped: string) => keyWrapper().unwrap(wrapped));

async function dekFor(doc: HouseholdDoc): Promise<Buffer> {
  return unwrapDek(doc.wrappedDek);
}

// --- Usuario ----------------------------------------------------------------

export const getUserDoc = cache(async (uid: string): Promise<UserDoc> => {
  const snap = await userRef(uid).get();
  return (snap.data() as UserDoc | undefined) ?? {};
});

export function hasCurrentConsent(user: UserDoc): boolean {
  return user.privacyConsent?.version === PRIVACY_POLICY_VERSION && user.privacyConsent.guardianDeclaration;
}

export async function recordConsent(uid: string): Promise<void> {
  await userRef(uid).set(
    {
      privacyConsent: {
        version: PRIVACY_POLICY_VERSION,
        acceptedAt: new Date().toISOString(),
        guardianDeclaration: true,
      },
    },
    { merge: true },
  );
}

// --- Lectura de hogares -----------------------------------------------------

async function loadMembership(uid: string, hid: string): Promise<HouseholdDoc> {
  const snap = await householdRef(hid).get();
  const data = snap.data() as HouseholdDoc | undefined;
  if (!data || !data.memberUids.includes(uid)) throw new DomainError('No perteneces a este hogar');
  return data;
}

async function toHousehold(id: string, doc: HouseholdDoc): Promise<Household> {
  const dek = await dekFor(doc);
  const path = `households/${id}`;
  return {
    id,
    name: decryptString(dek, doc.name, fieldAad(path, 'name')),
    ownerUid: doc.ownerUid,
    memberUids: doc.memberUids,
    cityId: doc.cityId,
    area: doc.area,
    preciseLocation: doc.preciseLocation
      ? decryptJson<GeoPoint>(dek, doc.preciseLocation, fieldAad(path, 'preciseLocation'))
      : undefined,
    preferences: Preferences.parse(doc.preferences ?? {}),
  };
}

export const getHousehold = cache(async (uid: string, hid: string): Promise<Household> => {
  return toHousehold(hid, await loadMembership(uid, hid));
});

/** Hogares del usuario. La pertenencia real se comprueba en memberUids (ADR-0015). */
export const listHouseholds = cache(async (uid: string): Promise<HouseholdSummary[]> => {
  const snap = await db().collection('households').where('memberUids', 'array-contains', uid).get();
  const items = await Promise.all(
    snap.docs.map(async (d) => {
      const doc = d.data() as HouseholdDoc;
      const dek = await dekFor(doc);
      return {
        id: d.id,
        name: decryptString(dek, doc.name, fieldAad(`households/${d.id}`, 'name')),
        areaLabel: doc.area.label,
        role: doc.ownerUid === uid ? ('owner' as const) : ('member' as const),
      };
    }),
  );
  return items.sort((a, b) => a.name.localeCompare(b.name, 'es'));
});

/** Hogar activo válido del usuario, o null si no tiene ninguno. */
export const getActiveHousehold = cache(async (uid: string): Promise<Household | null> => {
  const [user, households] = await Promise.all([getUserDoc(uid), listHouseholds(uid)]);
  if (households.length === 0) return null;
  const id = households.some((h) => h.id === user.activeHouseholdId)
    ? user.activeHouseholdId!
    : households[0]!.id;
  return getHousehold(uid, id);
});

export async function setActiveHousehold(uid: string, hid: string): Promise<void> {
  await loadMembership(uid, hid);
  await userRef(uid).set({ activeHouseholdId: hid }, { merge: true });
}

// --- Crear y editar hogares -------------------------------------------------

function locationFields(path: string, dek: Buffer, location: LocationInput) {
  const { area, cityId } = resolveArea(location);
  if (location.precise) {
    // El geohash en claro se calcula del punto preciso: sigue siendo una celda de ~1 km.
    area.geohash6 = encodeGeohash(location.precise.lat, location.precise.lng, 6);
  }
  return {
    area,
    cityId,
    preciseLocation: location.precise
      ? encryptJson(dek, location.precise, fieldAad(path, 'preciseLocation'))
      : FieldValue.delete(),
  };
}

async function countUserHouseholds(tx: Transaction, uid: string): Promise<number> {
  const snap = await tx.get(db().collection('households').where('memberUids', 'array-contains', uid));
  return snap.size;
}

export async function createHousehold(
  uid: string,
  input: HouseholdInput,
  copyChildren: { fromHouseholdId: string; childIds: string[] }[] = [],
): Promise<string> {
  // Lee y descifra antes los peques a copiar (requiere ser miembro del hogar de origen).
  const toCopy: ChildInput[] = [];
  for (const { fromHouseholdId, childIds } of copyChildren) {
    const children = await listChildren(uid, fromHouseholdId);
    for (const c of children.filter((c) => childIds.includes(c.id))) {
      toCopy.push({ alias: c.alias, birthYearMonth: c.birthYearMonth, interests: c.interests, notes: c.notes });
    }
  }
  if (toCopy.length > LIMITS.childrenPerHousehold) throw new DomainError('Demasiados peques para un hogar');

  const ref = householdRef(db().collection('households').doc().id);
  const path = ref.path;
  const dek = newDataKey();
  const wrapper = keyWrapper();
  const wrappedDek = await wrapper.wrap(dek);
  const loc = locationFields(path, dek, input.location);
  const now = new Date().toISOString();

  await db().runTransaction(async (tx) => {
    if ((await countUserHouseholds(tx, uid)) >= LIMITS.householdsPerUser) {
      throw new DomainError(`Puedes pertenecer a un máximo de ${LIMITS.householdsPerUser} hogares`);
    }
    tx.set(ref, {
      ownerUid: uid,
      memberUids: [uid],
      name: encryptString(dek, input.name, fieldAad(path, 'name')),
      cityId: loc.cityId,
      area: loc.area,
      ...(input.location.precise ? { preciseLocation: loc.preciseLocation } : {}),
      preferences: DEFAULT_PREFERENCES,
      wrappedDek,
      dekVersion: wrapper.version,
      createdAt: now,
      updatedAt: now,
    });
    toCopy.forEach((child, i) => {
      const cref = childrenCol(ref.id).doc();
      tx.set(cref, childDoc(cref, dek, child, CHILD_COLORS[i % CHILD_COLORS.length]!, now));
    });
    tx.set(
      userRef(uid),
      { householdIds: FieldValue.arrayUnion(ref.id), activeHouseholdId: ref.id },
      { merge: true },
    );
  });
  return ref.id;
}

export async function updateHouseholdName(uid: string, hid: string, name: string): Promise<void> {
  const doc = await loadMembership(uid, hid);
  const dek = await dekFor(doc);
  await householdRef(hid).update({
    name: encryptString(dek, name, fieldAad(`households/${hid}`, 'name')),
    updatedAt: new Date().toISOString(),
  });
}

export async function updateLocation(uid: string, hid: string, location: LocationInput): Promise<void> {
  const doc = await loadMembership(uid, hid);
  const dek = await dekFor(doc);
  const loc = locationFields(`households/${hid}`, dek, location);
  await householdRef(hid).update({ ...loc, updatedAt: new Date().toISOString() });
}

export async function updatePreferences(uid: string, hid: string, prefs: Preferences): Promise<void> {
  await loadMembership(uid, hid);
  await householdRef(hid).update({ preferences: Preferences.parse(prefs), updatedAt: new Date().toISOString() });
}

// --- Peques -----------------------------------------------------------------

function childDoc(ref: DocumentReference, dek: Buffer, input: ChildInput, color: ChildDoc['color'], now: string) {
  const p = ref.path;
  return {
    alias: encryptString(dek, input.alias, fieldAad(p, 'alias')),
    birthYearMonth: encryptString(dek, input.birthYearMonth, fieldAad(p, 'birthYearMonth')),
    interests: encryptJson(dek, input.interests, fieldAad(p, 'interests')),
    notes: encryptString(dek, input.notes, fieldAad(p, 'notes')),
    color,
    createdAt: now,
    updatedAt: now,
  };
}

function decodeChild(id: string, path: string, dek: Buffer, d: ChildDoc): Child {
  return Child.parse({
    id,
    alias: decryptString(dek, d.alias, fieldAad(path, 'alias')),
    birthYearMonth: decryptString(dek, d.birthYearMonth, fieldAad(path, 'birthYearMonth')),
    interests: decryptJson(dek, d.interests, fieldAad(path, 'interests')),
    notes: decryptString(dek, d.notes, fieldAad(path, 'notes')),
    color: d.color,
  });
}

export const listChildren = cache(async (uid: string, hid: string): Promise<Child[]> => {
  const doc = await loadMembership(uid, hid);
  const dek = await dekFor(doc);
  const snap = await childrenCol(hid).orderBy('createdAt').get();
  return snap.docs.map((d) => decodeChild(d.id, d.ref.path, dek, d.data() as ChildDoc));
});

export async function getChild(uid: string, hid: string, childId: string): Promise<Child | null> {
  const doc = await loadMembership(uid, hid);
  const dek = await dekFor(doc);
  const snap = await childrenCol(hid).doc(childId).get();
  return snap.exists ? decodeChild(snap.id, snap.ref.path, dek, snap.data() as ChildDoc) : null;
}

export async function createChild(uid: string, hid: string, input: ChildInput): Promise<string> {
  const doc = await loadMembership(uid, hid);
  const dek = await dekFor(doc);
  const existing = await childrenCol(hid).count().get();
  const count = existing.data().count;
  if (count >= LIMITS.childrenPerHousehold) throw new DomainError('Has llegado al máximo de peques del hogar');
  const ref = childrenCol(hid).doc();
  await ref.set(childDoc(ref, dek, ChildInput.parse(input), CHILD_COLORS[count % CHILD_COLORS.length]!, new Date().toISOString()));
  return ref.id;
}

export async function updateChild(uid: string, hid: string, childId: string, input: ChildInput): Promise<void> {
  const doc = await loadMembership(uid, hid);
  const dek = await dekFor(doc);
  const ref = childrenCol(hid).doc(childId);
  const snap = await ref.get();
  if (!snap.exists) throw new DomainError('Ese peque no existe');
  const { color, createdAt } = snap.data() as ChildDoc & { createdAt: string };
  await ref.set({ ...childDoc(ref, dek, ChildInput.parse(input), color, new Date().toISOString()), createdAt });
}

export async function deleteChild(uid: string, hid: string, childId: string): Promise<void> {
  await loadMembership(uid, hid);
  await childrenCol(hid).doc(childId).delete();
}

// --- Adultos ----------------------------------------------------------------

export interface Member {
  uid: string;
  name: string;
  email: string;
  picture?: string;
  role: 'owner' | 'member';
}

export async function listMembers(uid: string, hid: string): Promise<Member[]> {
  const doc = await loadMembership(uid, hid);
  const users = await db().getAll(...doc.memberUids.map((m) => userRef(m)));
  return users
    .map((u) => {
      const d = (u.data() as UserDoc | undefined) ?? {};
      return {
        uid: u.id,
        name: d.name ?? d.email?.split('@')[0] ?? 'Adulto',
        email: d.email ?? '',
        picture: d.picture ?? undefined,
        role: u.id === doc.ownerUid ? ('owner' as const) : ('member' as const),
      };
    })
    .sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : a.name.localeCompare(b.name, 'es')));
}

async function requireOwner(uid: string, hid: string): Promise<HouseholdDoc> {
  const doc = await loadMembership(uid, hid);
  if (doc.ownerUid !== uid) throw new DomainError('Solo el titular del hogar puede hacer esto');
  return doc;
}

function detachMember(tx: Transaction, hid: string, memberUid: string) {
  tx.update(householdRef(hid), { memberUids: FieldValue.arrayRemove(memberUid), updatedAt: new Date().toISOString() });
  tx.set(userRef(memberUid), { householdIds: FieldValue.arrayRemove(hid) }, { merge: true });
}

export async function removeMember(uid: string, hid: string, memberUid: string): Promise<void> {
  const doc = await requireOwner(uid, hid);
  if (memberUid === doc.ownerUid) throw new DomainError('El titular no puede expulsarse a sí mismo');
  if (!doc.memberUids.includes(memberUid)) throw new DomainError('Esa persona no está en el hogar');
  await db().runTransaction(async (tx) => detachMember(tx, hid, memberUid));
}

export async function leaveHousehold(uid: string, hid: string): Promise<void> {
  const doc = await loadMembership(uid, hid);
  if (doc.ownerUid === uid) {
    throw new DomainError('Eres titular: transfiere la titularidad o borra el hogar antes de salir');
  }
  await db().runTransaction(async (tx) => detachMember(tx, hid, uid));
}

export async function transferOwnership(uid: string, hid: string, newOwnerUid: string): Promise<void> {
  const doc = await requireOwner(uid, hid);
  if (!doc.memberUids.includes(newOwnerUid)) throw new DomainError('Esa persona no está en el hogar');
  await householdRef(hid).update({ ownerUid: newOwnerUid, updatedAt: new Date().toISOString() });
}

// --- Invitaciones -----------------------------------------------------------

interface InviteDoc {
  householdId: string;
  emailHmac: string;
  email: string; // cifrado con la DEK del hogar
  invitedByUid: string;
  status: 'pending' | 'accepted' | 'revoked';
  expiresAt: string;
  createdAt: string;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

export interface PendingInvite {
  id: string;
  email: string;
  invitedByUid: string;
  expiresAt: string;
}

export async function createInvite(uid: string, hid: string, email: string): Promise<string> {
  const doc = await loadMembership(uid, hid);
  if (doc.memberUids.length >= LIMITS.adultsPerHousehold) {
    throw new DomainError(`Un hogar puede tener como máximo ${LIMITS.adultsPerHousehold} adultos`);
  }
  const normalized = normalizeEmail(email);
  const members = await listMembers(uid, hid);
  if (members.some((m) => normalizeEmail(m.email) === normalized)) {
    throw new DomainError('Esa persona ya está en el hogar');
  }
  const dek = await dekFor(doc);
  const token = randomBytes(32).toString('base64url');
  const id = tokenHash(token);
  const now = new Date();
  const invite: InviteDoc = {
    householdId: hid,
    emailHmac: hmacHex(inviteHmacKey(), normalized),
    email: encryptString(dek, normalized, fieldAad(`invites/${id}`, 'email')),
    invitedByUid: uid,
    status: 'pending',
    expiresAt: new Date(now.getTime() + LIMITS.inviteTtlDays * 86_400_000).toISOString(),
    createdAt: now.toISOString(),
  };
  await invitesCol().doc(id).set(invite);
  return token; // solo se devuelve una vez; en la BD solo queda su hash
}

export async function listPendingInvites(uid: string, hid: string): Promise<PendingInvite[]> {
  const doc = await loadMembership(uid, hid);
  const dek = await dekFor(doc);
  const snap = await invitesCol().where('householdId', '==', hid).get();
  const now = new Date().toISOString();
  return snap.docs
    .map((d) => ({ id: d.id, data: d.data() as InviteDoc }))
    .filter(({ data }) => data.status === 'pending' && data.expiresAt > now)
    .map(({ id, data }) => ({
      id,
      email: decryptString(dek, data.email, fieldAad(`invites/${id}`, 'email')),
      invitedByUid: data.invitedByUid,
      expiresAt: data.expiresAt,
    }));
}

export async function revokeInvite(uid: string, hid: string, inviteId: string): Promise<void> {
  const doc = await loadMembership(uid, hid);
  const ref = invitesCol().doc(inviteId);
  const invite = (await ref.get()).data() as InviteDoc | undefined;
  if (!invite || invite.householdId !== hid) throw new DomainError('Invitación no encontrada');
  if (invite.invitedByUid !== uid && doc.ownerUid !== uid) {
    throw new DomainError('Solo quien invitó o el titular puede revocarla');
  }
  await ref.update({ status: 'revoked' });
}

export type InviteCheck =
  | { status: 'ok'; householdId: string; householdName: string; invitedBy: string }
  | { status: 'invalid' | 'expired' | 'used' | 'wrong-email' | 'already-member' };

async function inspectInvite(token: string, uid: string, email: string) {
  return inspectInviteById(tokenHash(token), uid, email);
}

async function inspectInviteById(id: string, uid: string, email: string) {
  const ref = invitesCol().doc(id);
  const invite = (await ref.get()).data() as InviteDoc | undefined;
  if (!invite || invite.status === 'revoked') return { check: { status: 'invalid' } as InviteCheck };
  if (invite.status === 'accepted') return { check: { status: 'used' } as InviteCheck };
  if (invite.expiresAt < new Date().toISOString()) return { check: { status: 'expired' } as InviteCheck };
  if (!safeEqualHex(invite.emailHmac, hmacHex(inviteHmacKey(), normalizeEmail(email)))) {
    return { check: { status: 'wrong-email' } as InviteCheck };
  }
  const hsnap = await householdRef(invite.householdId).get();
  const hdoc = hsnap.data() as HouseholdDoc | undefined;
  if (!hdoc) return { check: { status: 'invalid' } as InviteCheck };
  if (hdoc.memberUids.includes(uid)) return { check: { status: 'already-member' } as InviteCheck };
  const dek = await dekFor(hdoc);
  const inviter = await getUserDoc(invite.invitedByUid);
  return {
    ref,
    invite,
    check: {
      status: 'ok',
      householdId: invite.householdId,
      householdName: decryptString(dek, hdoc.name, fieldAad(`households/${invite.householdId}`, 'name')),
      invitedBy: inviter.name ?? 'Un adulto del hogar',
    } as InviteCheck,
  };
}

export async function checkInvite(token: string, uid: string, email: string): Promise<InviteCheck> {
  return (await inspectInvite(token, uid, email)).check;
}

export async function acceptInvite(token: string, uid: string, email: string): Promise<string> {
  return acceptInviteById(tokenHash(token), uid, email);
}

/**
 * Aceptar por id (hash del token) es igual de seguro que por token: lo que autoriza es que
 * el email de la sesión coincida con el HMAC guardado. Se usa en el alta para ofrecer las
 * invitaciones pendientes del usuario sin necesidad del enlace.
 */
export async function acceptInviteById(inviteId: string, uid: string, email: string): Promise<string> {
  const { check, ref } = await inspectInviteById(inviteId, uid, email);
  if (check.status !== 'ok' || !ref) throw new DomainError('La invitación no es válida');
  const hid = check.householdId;
  await db().runTransaction(async (tx) => {
    const inv = (await tx.get(ref)).data() as InviteDoc;
    const h = (await tx.get(householdRef(hid))).data() as HouseholdDoc | undefined;
    if (!h || inv.status !== 'pending') throw new DomainError('La invitación ya no es válida');
    if (h.memberUids.length >= LIMITS.adultsPerHousehold) throw new DomainError('El hogar está completo');
    if ((await countUserHouseholds(tx, uid)) >= LIMITS.householdsPerUser) {
      throw new DomainError(`Puedes pertenecer a un máximo de ${LIMITS.householdsPerUser} hogares`);
    }
    tx.update(householdRef(hid), { memberUids: FieldValue.arrayUnion(uid), updatedAt: new Date().toISOString() });
    tx.set(userRef(uid), { householdIds: FieldValue.arrayUnion(hid), activeHouseholdId: hid }, { merge: true });
    tx.update(ref, { status: 'accepted', acceptedByUid: uid, acceptedAt: new Date().toISOString() });
  });
  return hid;
}

/** Invitaciones pendientes para el email de la sesión (para ofrecerlas en el alta). */
export async function findInvitesForEmail(
  email: string,
): Promise<{ id: string; householdName: string; invitedBy: string }[]> {
  const snap = await invitesCol()
    .where('emailHmac', '==', hmacHex(inviteHmacKey(), normalizeEmail(email)))
    .where('status', '==', 'pending')
    .get();
  const now = new Date().toISOString();
  const out: { id: string; householdName: string; invitedBy: string }[] = [];
  for (const d of snap.docs) {
    const inv = d.data() as InviteDoc;
    if (inv.expiresAt < now) continue;
    const h = (await householdRef(inv.householdId).get()).data() as HouseholdDoc | undefined;
    if (!h) continue;
    const dek = await dekFor(h);
    out.push({
      id: d.id,
      householdName: decryptString(dek, h.name, fieldAad(`households/${inv.householdId}`, 'name')),
      invitedBy: (await getUserDoc(inv.invitedByUid)).name ?? 'Un adulto',
    });
  }
  return out;
}

// --- Borrado y exportación --------------------------------------------------

/** Borra el hogar, sus subcolecciones, sus invitaciones y su DEK (ADR-0013). */
export async function deleteHousehold(uid: string, hid: string): Promise<void> {
  const doc = await requireOwner(uid, hid);
  const invites = await invitesCol().where('householdId', '==', hid).get();
  const batch = db().batch();
  invites.docs.forEach((d) => batch.delete(d.ref));
  doc.memberUids.forEach((m) => batch.set(userRef(m), { householdIds: FieldValue.arrayRemove(hid) }, { merge: true }));
  await batch.commit();
  await db().recursiveDelete(householdRef(hid));
}

export async function deleteAccount(uid: string): Promise<void> {
  const snap = await db().collection('households').where('memberUids', 'array-contains', uid).get();
  const blocking = snap.docs.filter((d) => {
    const h = d.data() as HouseholdDoc;
    return h.ownerUid === uid && h.memberUids.length > 1;
  });
  if (blocking.length > 0) {
    throw new DomainError(
      'Eres titular de hogares con otros adultos. Transfiere la titularidad o bórralos antes de borrar tu cuenta.',
    );
  }
  for (const d of snap.docs) {
    const h = d.data() as HouseholdDoc;
    if (h.ownerUid === uid) await deleteHousehold(uid, d.id);
    else await leaveHousehold(uid, d.id);
  }
  await userRef(uid).delete();
  await adminAuth().deleteUser(uid);
}

export async function exportUserData(uid: string) {
  const user = await getUserDoc(uid);
  const households = await listHouseholds(uid);
  return {
    exportedAt: new Date().toISOString(),
    user: { email: user.email, name: user.name, privacyConsent: user.privacyConsent },
    households: await Promise.all(
      households.map(async (s) => {
        const h = await getHousehold(uid, s.id);
        const members = await listMembers(uid, s.id);
        return {
          name: h.name,
          role: s.role,
          area: h.area.label,
          preciseLocation: h.preciseLocation ?? null,
          preferences: h.preferences,
          adults: members.map((m) => ({ name: m.name, role: m.role })),
          children: (await listChildren(uid, s.id)).map((c) => ({ alias: c.alias, birthYearMonth: c.birthYearMonth, interests: c.interests, notes: c.notes })),
          pendingInvitesCreatedByYou: (await listPendingInvites(uid, s.id))
            .filter((i) => i.invitedByUid === uid)
            .map((i) => ({ email: i.email, expiresAt: i.expiresAt })),
        };
      }),
    ),
  };
}
