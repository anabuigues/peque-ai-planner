#!/usr/bin/env node
// Genera las claves locales de desarrollo en .env.local si no existen (ADR-0009).
// Nunca uses estas claves en producción: allí la KEK vive en Cloud KMS.
import { randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const file = new URL('../.env.local', import.meta.url);
const current = existsSync(file) ? readFileSync(file, 'utf8') : '';
const added = [];
for (const name of ['DATA_KEK', 'INVITE_HMAC_KEY']) {
  if (new RegExp(`^${name}=.+`, 'm').test(current)) continue;
  appendFileSync(file, `${current.endsWith('\n') || !current ? '' : '\n'}${name}=${randomBytes(32).toString('base64')}\n`);
  added.push(name);
}
console.log(added.length ? `Claves añadidas a .env.local: ${added.join(', ')}` : 'Las claves ya existían; no se ha cambiado nada.');
