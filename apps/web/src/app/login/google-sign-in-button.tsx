'use client';

import { Button } from '@/components/ui/button';
import { clientAuth } from '@/lib/firebase-client';
import {
  getRedirectResult,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  type User,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const ERROR_MESSAGES: Record<string, string> = {
  'auth/popup-closed-by-user': 'Has cerrado la ventana de Google antes de terminar.',
  'auth/network-request-failed': 'No hay conexión con el servicio de acceso.',
};

function messageFor(e: unknown): string {
  const code = (e as { code?: string })?.code;
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  return e instanceof Error ? e.message : 'Error al iniciar sesión';
}

async function createSession(user: User, forceRefresh = false): Promise<void> {
  const idToken = await user.getIdToken(forceRefresh);
  const res = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const body = (await res.json()) as { ok?: boolean; refreshToken?: boolean; error?: string };
  if (!res.ok) throw new Error(body.error ?? 'No se pudo iniciar sesión');
  // Se acaba de asignar el rol admin: pedimos un token nuevo que ya lo incluya.
  if (body.refreshToken && !forceRefresh) return createSession(user, true);
}

export function GoogleSignInButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish(user: User) {
    await createSession(user);
    router.replace('/');
    router.refresh();
  }

  // Vuelta de un login por redirección (plan B cuando el navegador bloquea el popup).
  useEffect(() => {
    getRedirectResult(clientAuth())
      .then((result) => (result ? finish(result.user) : undefined))
      .catch((e) => setError(messageFor(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <Button
        size="lg"
        variant="secondary"
        className="w-full border border-border bg-surface"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          try {
            const { user } = await signInWithPopup(clientAuth(), provider);
            await finish(user);
          } catch (e) {
            if ((e as { code?: string })?.code === 'auth/popup-blocked') {
              await signInWithRedirect(clientAuth(), provider);
              return;
            }
            setError(messageFor(e));
            setLoading(false);
          }
        }}
      >
        <GoogleIcon />
        {loading ? 'Entrando…' : 'Continuar con Google'}
      </Button>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.7-4.9h-4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
    </svg>
  );
}
