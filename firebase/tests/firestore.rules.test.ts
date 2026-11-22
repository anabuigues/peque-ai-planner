import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-peque-plan-rules',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'households/h1'), { memberUids: ['ana', 'luis'] });
    await setDoc(doc(db, 'households/h1/children/c1'), { name: 'cifrado' });
    await setDoc(doc(db, 'activities/pub'), { status: 'published', title: 'A' });
    await setDoc(doc(db, 'activities/draft'), { status: 'draft', title: 'B' });
    await setDoc(doc(db, 'aiCache/k1'), { output: {} });
    await setDoc(doc(db, 'sources/s1'), { type: 'web' });
    await setDoc(doc(db, 'invites/t1'), { householdId: 'h1' });
    await setDoc(doc(db, 'users/ana'), { householdIds: ['h1'] });
  });
});

const user = (uid: string, admin = false) =>
  env.authenticatedContext(uid, admin ? { admin: true } : {}).firestore();

describe('hogar (solo servidor, ADR-0014)', () => {
  it('ni siquiera los miembros acceden desde el cliente', async () => {
    await assertFails(getDoc(doc(user('ana'), 'households/h1')));
    await assertFails(getDoc(doc(user('luis'), 'households/h1/children/c1')));
    await assertFails(setDoc(doc(user('ana'), 'households/h1/children/c2'), { alias: 'x' }));
  });

  it('otro usuario y el admin tampoco', async () => {
    await assertFails(getDoc(doc(user('eva'), 'households/h1')));
    await assertFails(getDoc(doc(user('admin1', true), 'households/h1/children/c1')));
  });

  it('invitaciones inaccesibles desde el cliente', async () => {
    await assertFails(getDoc(doc(user('ana'), 'invites/t1')));
    await assertFails(setDoc(doc(user('ana'), 'invites/t2'), { householdId: 'h1' }));
  });

  it('cada usuario lee su perfil pero no lo escribe', async () => {
    await assertSucceeds(getDoc(doc(user('ana'), 'users/ana')));
    await assertFails(getDoc(doc(user('eva'), 'users/ana')));
    await assertFails(setDoc(doc(user('ana'), 'users/ana'), { householdIds: ['h9'] }));
  });

  it('sin sesión no se accede a nada', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'activities/pub')));
  });
});

describe('catálogo', () => {
  it('las familias leen solo lo publicado', async () => {
    await assertSucceeds(getDoc(doc(user('ana'), 'activities/pub')));
    await assertFails(getDoc(doc(user('ana'), 'activities/draft')));
  });

  it('solo el admin escribe y ve borradores', async () => {
    await assertFails(setDoc(doc(user('ana'), 'activities/new'), { status: 'published' }));
    await assertSucceeds(setDoc(doc(user('admin1', true), 'activities/new'), { status: 'draft' }));
    await assertSucceeds(getDoc(doc(user('admin1', true), 'activities/draft')));
  });
});

describe('operación de datos (solo admin, ADR-0007)', () => {
  it('una familia no ve fuentes ni la caché de IA', async () => {
    await assertFails(getDoc(doc(user('ana'), 'aiCache/k1')));
    await assertFails(getDoc(doc(user('ana'), 'sources/s1')));
    await assertFails(setDoc(doc(user('ana'), 'ingestionRuns/r1'), { job: 'x' }));
  });

  it('el admin sí', async () => {
    await assertSucceeds(getDoc(doc(user('admin1', true), 'aiCache/k1')));
    await assertSucceeds(setDoc(doc(user('admin1', true), 'sources/s2'), { type: 'rss' }));
  });
});
