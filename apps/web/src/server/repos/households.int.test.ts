import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { DecryptionError } from '../crypto/field-cipher';
import { adminAuth, adminDb } from '../firebase-admin';
import * as repo from './households';

const PROJECT = process.env.GCLOUD_PROJECT!;
const loc = { kind: 'barrio' as const, id: 'mad-016' }; // Sol
const leo = { alias: 'Leo', birthYearMonth: '2022-03', interests: ['animales' as const, 'agua' as const], notes: 'Le encanta el agua' };

async function clear() {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
}

async function newUser(email: string) {
  const u = await adminAuth().createUser({ email, displayName: email.split('@')[0] });
  await adminDb().collection('users').doc(u.uid).set({ email, name: email.split('@')[0] });
  return { uid: u.uid, email };
}

function rawContains(obj: unknown, ...needles: string[]) {
  const json = JSON.stringify(obj);
  return needles.some((n) => json.includes(n));
}

beforeEach(clear);
afterAll(clear);

describe('cifrado en reposo', () => {
  it('ni el hogar ni los peques guardan valores en claro', async () => {
    const ana = await newUser('ana@example.com');
    const hid = await repo.createHousehold(ana.uid, { name: 'Casa García', location: { ...loc, precise: { lat: 40.4171, lng: -3.7032 } } });
    const cid = await repo.createChild(ana.uid, hid, leo);

    const h = (await adminDb().doc(`households/${hid}`).get()).data();
    const c = (await adminDb().doc(`households/${hid}/children/${cid}`).get()).data();
    expect(rawContains(h, 'Casa García', '40.4171', '-3.7032')).toBe(false);
    expect(rawContains(c, 'Leo', '2022-03', 'animales', 'agua')).toBe(false);
    expect(h?.area).toMatchObject({ kind: 'barrio', id: 'mad-016' });

    const [child] = await repo.listChildren(ana.uid, hid);
    expect(child).toMatchObject(leo);
    expect((await repo.getHousehold(ana.uid, hid)).preciseLocation).toEqual({ lat: 40.4171, lng: -3.7032 });
  });

  it('un valor copiado a otro documento no se puede descifrar (AAD)', async () => {
    const ana = await newUser('ana@example.com');
    const hid = await repo.createHousehold(ana.uid, { name: 'Casa', location: loc });
    const c1 = await repo.createChild(ana.uid, hid, leo);
    const c2 = await repo.createChild(ana.uid, hid, { ...leo, alias: 'Mía' });
    const alias1 = (await adminDb().doc(`households/${hid}/children/${c1}`).get()).get('alias');
    await adminDb().doc(`households/${hid}/children/${c2}`).update({ alias: alias1 });
    await expect(repo.getChild(ana.uid, hid, c2)).rejects.toBeInstanceOf(DecryptionError);
  });
});

describe('varios hogares (ADR-0015)', () => {
  it('copia peques a otro hogar fuera de Madrid, con su propia clave e independientes', async () => {
    const ana = await newUser('ana@example.com');
    const casa = await repo.createHousehold(ana.uid, { name: 'Casa', location: loc });
    const leoId = await repo.createChild(ana.uid, casa, leo);
    const pueblo = await repo.createHousehold(
      ana.uid,
      { name: 'Casa del pueblo', location: { kind: 'municipio', id: '16078' } },
      [{ fromHouseholdId: casa, childIds: [leoId] }],
    );
    const [copy] = await repo.listChildren(ana.uid, pueblo);
    expect(copy).toMatchObject({ alias: 'Leo', birthYearMonth: '2022-03' });

    await repo.updateChild(ana.uid, pueblo, copy!.id, { ...leo, alias: 'Leo (pueblo)' });
    expect((await repo.getChild(ana.uid, casa, leoId))?.alias).toBe('Leo');

    const [h1, h2] = await Promise.all([casa, pueblo].map((id) => adminDb().doc(`households/${id}`).get()));
    expect(h1!.get('wrappedDek')).not.toBe(h2!.get('wrappedDek'));
    expect((await repo.getHousehold(ana.uid, pueblo)).area.kind).toBe('municipio');
    expect((await repo.listHouseholds(ana.uid)).map((h) => h.name)).toEqual(['Casa', 'Casa del pueblo']);
  });

  it('no permite más de 10 hogares', async () => {
    const ana = await newUser('ana@example.com');
    for (let i = 0; i < 10; i++) await repo.createHousehold(ana.uid, { name: `H${i}`, location: loc });
    await expect(repo.createHousehold(ana.uid, { name: 'H10', location: loc })).rejects.toThrow(/máximo de 10/);
  });

  it('un no miembro no puede leer el hogar', async () => {
    const ana = await newUser('ana@example.com');
    const eva = await newUser('eva@example.com');
    const hid = await repo.createHousehold(ana.uid, { name: 'Casa', location: loc });
    await expect(repo.listChildren(eva.uid, hid)).rejects.toThrow(/No perteneces/);
  });
});

describe('invitaciones', () => {
  it('se aceptan con el email correcto, una sola vez, aunque ya tenga otro hogar', async () => {
    const ana = await newUser('ana@example.com');
    const luis = await newUser('luis@example.com');
    const eva = await newUser('eva@example.com');
    const hid = await repo.createHousehold(ana.uid, { name: 'Casa', location: loc });
    await repo.createHousehold(luis.uid, { name: 'Casa de Luis', location: loc });
    const token = await repo.createInvite(ana.uid, hid, 'Luis@Example.com ');

    const raw = (await adminDb().collection('invites').get()).docs[0]!.data();
    expect(rawContains(raw, 'luis@example.com', token)).toBe(false);

    expect(await repo.checkInvite(token, eva.uid, eva.email)).toEqual({ status: 'wrong-email' });
    expect(await repo.checkInvite(token, luis.uid, luis.email)).toMatchObject({ status: 'ok', householdName: 'Casa' });
    await repo.acceptInvite(token, luis.uid, luis.email);
    expect((await repo.listHouseholds(luis.uid)).length).toBe(2);
    expect((await repo.getActiveHousehold(luis.uid))?.id).toBe(hid);
    expect(await repo.checkInvite(token, luis.uid, luis.email)).toEqual({ status: 'used' });
  });

  it('caduca', async () => {
    const ana = await newUser('ana@example.com');
    const luis = await newUser('luis@example.com');
    const hid = await repo.createHousehold(ana.uid, { name: 'Casa', location: loc });
    const token = await repo.createInvite(ana.uid, hid, luis.email);
    const ref = (await adminDb().collection('invites').get()).docs[0]!.ref;
    await ref.update({ expiresAt: '2000-01-01T00:00:00.000Z' });
    expect(await repo.checkInvite(token, luis.uid, luis.email)).toEqual({ status: 'expired' });
  });
});

describe('titular y borrado', () => {
  async function householdWithMember() {
    const ana = await newUser('ana@example.com');
    const luis = await newUser('luis@example.com');
    const hid = await repo.createHousehold(ana.uid, { name: 'Casa', location: loc });
    await repo.createChild(ana.uid, hid, leo);
    await repo.acceptInvite(await repo.createInvite(ana.uid, hid, luis.email), luis.uid, luis.email);
    return { ana, luis, hid };
  }

  it('un miembro no puede expulsar ni borrar; el titular sí', async () => {
    const { ana, luis, hid } = await householdWithMember();
    await expect(repo.removeMember(luis.uid, hid, ana.uid)).rejects.toThrow(/titular/);
    await expect(repo.deleteHousehold(luis.uid, hid)).rejects.toThrow(/titular/);
    await repo.removeMember(ana.uid, hid, luis.uid);
    expect(await repo.listHouseholds(luis.uid)).toEqual([]);
  });

  it('borrar el hogar elimina documentos, invitaciones y la clave', async () => {
    const { ana, luis, hid } = await householdWithMember();
    await repo.createInvite(ana.uid, hid, 'abuela@example.com');
    await repo.deleteHousehold(ana.uid, hid);
    expect((await adminDb().doc(`households/${hid}`).get()).exists).toBe(false);
    expect((await adminDb().collection(`households/${hid}/children`).get()).size).toBe(0);
    expect((await adminDb().collection('invites').where('householdId', '==', hid).get()).size).toBe(0);
    expect(await repo.listHouseholds(luis.uid)).toEqual([]);
  });

  it('borrar la cuenta se bloquea si es titular con más adultos', async () => {
    const { ana, luis, hid } = await householdWithMember();
    await expect(repo.deleteAccount(ana.uid)).rejects.toThrow(/titular/);
    await repo.transferOwnership(ana.uid, hid, luis.uid);
    await repo.deleteAccount(ana.uid);
    expect((await adminDb().doc(`users/${ana.uid}`).get()).exists).toBe(false);
    await expect(adminAuth().getUser(ana.uid)).rejects.toThrow();
    expect((await repo.getHousehold(luis.uid, hid)).memberUids).toEqual([luis.uid]);
  });

  it('exporta los datos descifrados', async () => {
    const { ana } = await householdWithMember();
    const data = await repo.exportUserData(ana.uid);
    expect(data.households[0]).toMatchObject({ name: 'Casa', role: 'owner', children: [leo] });
  });
});
