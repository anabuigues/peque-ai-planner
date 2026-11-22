'use client';

import { acceptConsentAction, type ActionState } from '@/app/actions/profile';
import { SubmitButton } from '@/components/profile/submit-button';
import { FormError } from '@/components/ui/field';
import { useActionState } from 'react';

export function ConsentForm() {
  const [state, action] = useActionState<ActionState, FormData>(acceptConsentAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-4 border-t border-border pt-4">
      <FormError message={state?.error} />
      <label className="flex items-start gap-3">
        <input type="checkbox" name="privacy" required className="mt-1 size-4 accent-[var(--primary)]" />
        <span>
          He leído y acepto la <a href="/privacidad" target="_blank" className="font-semibold text-primary underline">política de privacidad</a>.
        </span>
      </label>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="guardian" required className="mt-1 size-4 accent-[var(--primary)]" />
        <span>Soy madre, padre o tutor legal de los peques que añada, o tengo su autorización.</span>
      </label>
      <SubmitButton className="self-start">Aceptar y continuar</SubmitButton>
    </form>
  );
}
