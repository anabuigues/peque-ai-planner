'use client';

import { createHouseholdAction, type ActionState } from '@/app/actions/profile';
import { Field, FormError, Input, PillOption } from '@/components/ui/field';
import { useActionState } from 'react';
import { LocationPicker } from './location-picker';
import { SubmitButton } from './submit-button';

interface CopySource {
  id: string;
  name: string;
  children: { id: string; alias: string }[];
}

export function HouseholdForm({ copySources = [], next }: { copySources?: CopySource[]; next: string }) {
  const [state, action] = useActionState<ActionState, FormData>(createHouseholdAction, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="next" value={next} />
      <FormError message={state?.error} />
      <Field label="Nombre del hogar" htmlFor="household-name" error={fe.name} hint="Lo verán los adultos que invites.">
        <Input id="household-name" name="name" required maxLength={40} placeholder="p. ej. Casa, Casa del pueblo…" />
      </Field>
      <LocationPicker error={fe['location.id']} />
      {copySources.length > 0 && (
        <Field label="Copiar peques de tus otros hogares (opcional)" hint="Se crean como copias: si luego editas uno, el otro no cambia.">
          <div className="flex flex-col gap-3">
            {copySources.map((s) => (
              <div key={s.id}>
                <p className="mb-2 text-xs font-semibold text-muted">{s.name}</p>
                <div className="flex flex-wrap gap-2">
                  {s.children.map((c) => (
                    <PillOption key={c.id} name="copyChild" value={`${s.id}:${c.id}`}>
                      {c.alias}
                    </PillOption>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Field>
      )}
      <SubmitButton className="self-start" pendingText="Creando…">
        Crear hogar
      </SubmitButton>
    </form>
  );
}
