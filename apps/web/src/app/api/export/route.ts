import { exportUserData } from '@/server/repos/households';
import { getSessionUser } from '@/server/session';

/** Derecho de acceso y portabilidad (RGPD arts. 15 y 20): descarga JSON con los datos descifrados. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const data = await exportUserData(user.uid);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="peque-plan-mis-datos-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
