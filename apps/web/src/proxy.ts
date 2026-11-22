import { NextResponse, type NextRequest } from 'next/server';

/**
 * Filtro rápido: sin cookie de sesión, a /login. La verificación real de la cookie
 * se hace en el servidor (requireUser) en cada página y acción.
 */
const PUBLIC_PATHS = ['/login', '/api/session', '/design', '/privacidad'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  if (!request.cookies.has('__session')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Volver a la página pedida tras entrar (p. ej. un enlace de invitación).
    url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|ico)$).*)'],
};
