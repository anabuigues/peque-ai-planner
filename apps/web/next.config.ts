import type { NextConfig } from 'next';

// Las variables vienen del .env.local de la raíz (scripts con --env-file-if-exists).
const isDev = process.env.NODE_ENV !== 'production';

// Cabeceras de seguridad (docs/specs/privacidad-seguridad.md §4).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://apis.google.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://firebasestorage.googleapis.com",
  "font-src 'self' data:",
  `connect-src 'self' https://*.googleapis.com https://*.firebaseio.com${isDev ? ' http://127.0.0.1:* http://localhost:* ws://localhost:*' : ''}`,
  `frame-src 'self' https://www.youtube-nocookie.com https://*.firebaseapp.com https://accounts.google.com${isDev ? ' http://127.0.0.1:* http://localhost:*' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  // Necesario para que el popup de Google Sign-In pueda comunicarse con la ventana.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
];

const nextConfig: NextConfig = {
  transpilePackages: ['@peque/shared', '@peque/ai', '@peque/catalog'],
  serverExternalPackages: ['firebase-admin'],
  poweredByHeader: false,
  // En desarrollo, permitir abrir la app tanto en localhost como en 127.0.0.1
  // (la dirección que muestran los emuladores). Sin esto Next bloquea sus scripts y el login no responde.
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
