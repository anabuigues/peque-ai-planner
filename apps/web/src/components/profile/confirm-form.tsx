'use client';

import type { ActionState } from '@/app/actions/profile';
import { Button } from '@/components/ui/button';
import { FormError, Input } from '@/components/ui/field';
import { useActionState, useState } from 'react';
import { SubmitButton } from './submit-button';

/** Acción destructiva que se confirma escribiendo BORRAR (docs/specs/perfil.md). */
export function ConfirmForm({
  action: serverAction,
  label,
  description,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  label: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ActionState, FormData>(serverAction, undefined);
  if (!open) {
    return (
      <Button variant="secondary" className="text-red-600" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl bg-red-50 p-4 dark:bg-red-500/10">
      <p className="text-sm">{description}</p>
      <FormError message={state?.error} />
      <Input name="confirm" placeholder="Escribe BORRAR" autoComplete="off" aria-label="Escribe BORRAR para confirmar" />
      <div className="flex gap-2">
        <SubmitButton className="bg-red-600 text-white" pendingText="Procesando…">
          {label}
        </SubmitButton>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
