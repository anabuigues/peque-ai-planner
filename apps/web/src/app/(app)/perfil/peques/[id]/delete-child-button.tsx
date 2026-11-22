'use client';

import { Button } from '@/components/ui/button';
import { useState, useTransition } from 'react';

export function DeleteChildButton({ onDelete, alias }: { onDelete: () => Promise<unknown>; alias: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  if (!confirm) {
    return (
      <Button variant="ghost" className="text-red-600" onClick={() => setConfirm(true)}>
        Borrar a {alias} de este hogar
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">¿Seguro? Se borrarán sus datos de este hogar.</span>
      <Button size="sm" className="bg-red-600 text-white" disabled={pending} onClick={() => start(async () => void (await onDelete()))}>
        Sí, borrar
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
        Cancelar
      </Button>
    </div>
  );
}
