'use client';

import { updateLocationAction, type ActionState } from '@/app/actions/profile';
import { LocationPicker } from '@/components/profile/location-picker';
import { SubmitButton } from '@/components/profile/submit-button';
import { FormError } from '@/components/ui/field';
import { useActionState } from 'react';

export function LocationForm({ initial }: { initial: React.ComponentProps<typeof LocationPicker>['initial'] }) {
  const [state, action] = useActionState<ActionState, FormData>(updateLocationAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-6">
      <FormError message={state?.error} />
      <LocationPicker initial={initial} error={state?.fieldErrors?.id} />
      <SubmitButton className="self-start">Guardar ubicación</SubmitButton>
    </form>
  );
}
