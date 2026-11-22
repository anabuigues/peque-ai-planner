'use client';

import { updatePreferencesAction, type ActionState } from '@/app/actions/profile';
import { Field, FormError, PillOption } from '@/components/ui/field';
import { PLAN_CATEGORIES, type Preferences } from '@peque/shared';
import { useActionState } from 'react';
import { SubmitButton } from './submit-button';

const DISTANCES = [
  { value: '2', label: '2 km' },
  { value: '5', label: '5 km' },
  { value: '10', label: '10 km' },
  { value: '25', label: '25 km' },
  { value: 'none', label: 'Sin límite' },
];
const BUDGETS = [
  { value: 'free', label: 'Solo gratis' },
  { value: 'upTo10', label: 'Hasta 10 €' },
  { value: 'upTo25', label: 'Hasta 25 €' },
  { value: 'any', label: 'Sin límite' },
];
const TRANSPORT = [
  { value: 'walk', label: 'A pie' },
  { value: 'public', label: 'Transporte público' },
  { value: 'car', label: 'Coche' },
];
const SETTINGS = [
  { value: 'any', label: 'Indiferente' },
  { value: 'indoor', label: 'Interior' },
  { value: 'outdoor', label: 'Exterior' },
];

export function PreferencesForm({ prefs, next = '/perfil', submitLabel = 'Guardar' }: { prefs: Preferences; next?: string; submitLabel?: string }) {
  const [state, action] = useActionState<ActionState, FormData>(updatePreferencesAction, undefined);
  const distance = prefs.maxDistanceKm === null ? 'none' : String(prefs.maxDistanceKm);
  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="next" value={next} />
      <FormError message={state?.error} />
      <Field label="¿Hasta qué distancia os movéis?">
        <div className="flex flex-wrap gap-2">
          {DISTANCES.map((d) => (
            <PillOption key={d.value} type="radio" name="maxDistanceKm" value={d.value} defaultChecked={distance === d.value}>
              {d.label}
            </PillOption>
          ))}
        </div>
      </Field>
      <Field label="Presupuesto por plan">
        <div className="flex flex-wrap gap-2">
          {BUDGETS.map((b) => (
            <PillOption key={b.value} type="radio" name="budget" value={b.value} defaultChecked={prefs.budget === b.value}>
              {b.label}
            </PillOption>
          ))}
        </div>
      </Field>
      <Field label="¿Cómo os movéis?">
        <div className="flex flex-wrap gap-2">
          {TRANSPORT.map((t) => (
            <PillOption key={t.value} name="transport" value={t.value} defaultChecked={prefs.transport.includes(t.value as never)}>
              {t.label}
            </PillOption>
          ))}
        </div>
      </Field>
      <Field label="Tipos de plan que os gustan">
        <div className="flex flex-wrap gap-2">
          {PLAN_CATEGORIES.map((c) => (
            <PillOption key={c.id} name="planCategories" value={c.id} defaultChecked={prefs.planCategories.includes(c.id)}>
              {c.label}
            </PillOption>
          ))}
        </div>
      </Field>
      <Field label="¿Interior o exterior?">
        <div className="flex flex-wrap gap-2">
          {SETTINGS.map((s) => (
            <PillOption key={s.value} type="radio" name="setting" value={s.value} defaultChecked={prefs.setting === s.value}>
              {s.label}
            </PillOption>
          ))}
        </div>
      </Field>
      <SubmitButton className="self-start">{submitLabel}</SubmitButton>
    </form>
  );
}
