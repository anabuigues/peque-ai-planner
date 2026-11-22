'use client';

import { clientAuth } from '@/lib/firebase-client';
import { signOut } from 'firebase/auth';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      title="Cerrar sesión"
      aria-label="Cerrar sesión"
      className="flex size-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-foreground"
      onClick={async () => {
        await fetch('/api/session', { method: 'DELETE' });
        await signOut(clientAuth());
        router.replace('/login');
        router.refresh();
      }}
    >
      <LogOut className="size-4" />
    </button>
  );
}
