'use client';

import { removeMemberAction, revokeInviteAction, transferOwnershipAction } from '@/app/actions/profile';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export function MemberActions({ memberUid, name }: { memberUid: string; name: string }) {
  const [mode, setMode] = useState<'idle' | 'remove' | 'transfer'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<{ error?: string } | undefined>) =>
    start(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
      else {
        setMode('idle');
        router.refresh();
      }
    });

  if (mode === 'idle') {
    return (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => setMode('transfer')}>
          Hacer titular
        </Button>
        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setMode('remove')}>
          Quitar
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <span className="text-xs">{mode === 'remove' ? `¿Quitar a ${name}?` : `¿Pasar la titularidad a ${name}?`}</span>
        <Button
          size="sm"
          disabled={pending}
          className={mode === 'remove' ? 'bg-red-600 text-white' : undefined}
          onClick={() => run(() => (mode === 'remove' ? removeMemberAction(memberUid) : transferOwnershipAction(memberUid)))}
        >
          Sí
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setMode('idle')}>
          No
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function RevokeInviteButton({ inviteId }: { inviteId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await revokeInviteAction(inviteId);
          router.refresh();
        })
      }
    >
      Revocar
    </Button>
  );
}
