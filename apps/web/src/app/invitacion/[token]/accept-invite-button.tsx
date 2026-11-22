'use client';

import { acceptInviteAction } from '@/app/actions/profile';
import { Button } from '@/components/ui/button';
import { useState, useTransition } from 'react';

export function AcceptInviteButton({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <Button
        className="w-fit"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await acceptInviteAction(token);
            if (res?.error) setError(res.error);
          })
        }
      >
        {pending ? 'Uniéndote…' : 'Unirme al hogar'}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
