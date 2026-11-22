import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse, type NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/server/firebase-admin';
import { adminEmails, SESSION_COOKIE, SESSION_MAX_AGE_MS } from '@/server/session';

/**
 * Intercambia el ID token de Firebase por una cookie de sesión httpOnly (ADR-0004).
 * Si el email está en ADMIN_EMAILS y aún no tiene el claim, lo asigna y pide al cliente
 * que refresque su token para que la sesión ya incluya el rol.
 */
export async function POST(request: NextRequest) {
  const { idToken } = (await request.json().catch(() => ({}))) as { idToken?: string };
  if (!idToken) return NextResponse.json({ error: 'Falta idToken' }, { status: 400 });

  const auth = adminAuth();
  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }

  // Sesiones solo a partir de logins recientes (5 min) para evitar reutilizar tokens viejos.
  if (Date.now() / 1000 - decoded.auth_time > 5 * 60) {
    return NextResponse.json({ error: 'Vuelve a iniciar sesión' }, { status: 401 });
  }

  const email = decoded.email?.toLowerCase();
  if (email && adminEmails().includes(email) && decoded.admin !== true) {
    await auth.setCustomUserClaims(decoded.uid, { admin: true });
    return NextResponse.json({ refreshToken: true });
  }

  await adminDb()
    .collection('users')
    .doc(decoded.uid)
    .set(
      {
        email: decoded.email ?? null,
        name: decoded.name ?? null,
        picture: decoded.picture ?? null,
        lastLoginAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
