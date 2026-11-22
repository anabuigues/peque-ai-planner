'use client';

import { acceptInviteByIdAction } from '@/app/actions/profile';
import { Button } from '@/components/ui/button';
import { useState, useTransition } from 'react';

export function JoinInviteButton({ inviteId }: { inviteId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await acceptInviteByIdAction(inviteId);
            if (res?.error) setError(res.error);
          })
        }
      >
        Unirme
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
