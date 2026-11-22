'use client';

import { createInviteAction, type ActionState } from '@/app/actions/profile';
import { SubmitButton } from '@/components/profile/submit-button';
import { Button } from '@/components/ui/button';
import { Field, FormError, Input } from '@/components/ui/field';
import { Check, Copy } from 'lucide-react';
import { useActionState, useState } from 'react';

export function InviteForm() {
  const [state, action] = useActionState<ActionState, FormData>(createInviteAction, undefined);
  const [copied, setCopied] = useState(false);
  const link = state?.value && typeof window !== 'undefined' ? `${window.location.origin}/invitacion/${state.value}` : null;

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4">
        <FormError message={state?.error} />
        <Field
          label="Email de su cuenta de Google"
          htmlFor="invite-email"
          error={state?.fieldErrors?.['']}
          hint="Generamos un enlace que tú le envías (WhatsApp, correo…). Solo funcionará si entra con este email y caduca en 14 días."
        >
          <Input id="invite-email" name="email" type="email" required placeholder="abuela@gmail.com" />
        </Field>
        <SubmitButton className="self-start" pendingText="Generando…">
          Generar enlace
        </SubmitButton>
      </form>
      {link && (
        <div className="flex flex-col gap-2 rounded-2xl bg-surface-2 p-4">
          <p className="text-sm font-semibold">Enlace de invitación (solo se muestra ahora)</p>
          <code className="break-all text-xs">{link}</code>
          <Button
            size="sm"
            variant="secondary"
            className="w-fit bg-surface"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopied(true);
            }}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? 'Copiado' : 'Copiar enlace'}
          </Button>
        </div>
      )}
    </div>
  );
}
