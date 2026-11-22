/** Asigna el rol admin a un usuario existente: npm run set-admin -- correo@ejemplo.com */
import { initAdmin } from './firebase';

const email = process.argv[2];
if (!email) {
  console.error('Uso: npm run set-admin -- <email>');
  process.exit(1);
}
const { auth } = initAdmin();
const user = await auth.getUserByEmail(email);
await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), admin: true });
console.log(`${email} ahora es admin. Debe cerrar sesión y volver a entrar.`);
