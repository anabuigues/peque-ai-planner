'use client';

import type { AdminState } from '@/app/actions/admin-catalog';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

/** Botón que ejecuta una acción de servidor y muestra su resultado. */
export function ActionButton({
  action,
  children,
  confirm,
  variant = 'secondary',
  size = 'sm',
}: {
  action: () => Promise<AdminState>;
  children: React.ReactNode;
  confirm?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<AdminState>();
  const router = useRouter();
  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        size={size}
        variant={variant}
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            setMsg(await action());
            router.refresh();
          });
        }}
      >
        {pending ? 'Un momento…' : children}
      </Button>
      {msg?.error && <span className="text-xs text-red-600">{msg.error}</span>}
      {msg?.ok && <span className="text-xs text-emerald-600">{msg.ok}</span>}
    </span>
  );
}

/** Refresca la página cada 10 s mientras haya trabajos en segundo plano. */
export function AutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(t);
  }, [active, router]);
  return active ? (
    <span className="inline-flex items-center gap-2 text-xs text-muted">
      <span className="size-2 animate-pulse rounded-full bg-primary" /> Trabajando en segundo plano · se actualiza solo
    </span>
  ) : null;
}
