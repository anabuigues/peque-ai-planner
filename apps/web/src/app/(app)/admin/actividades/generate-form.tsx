'use client';

import { generateBatchAction, type AdminState } from '@/app/actions/admin-catalog';
import { SubmitButton } from '@/components/profile/submit-button';
import { Field, FormError, Input, Select } from '@/components/ui/field';
import { ACTIVITY_CATEGORIES, AGE_BANDS } from '@peque/shared';
import { useActionState } from 'react';

export function GenerateForm({ enabled }: { enabled: boolean }) {
  const [state, action] = useActionState<AdminState, FormData>(generateBatchAction, undefined);
  if (!enabled) return <p className="text-sm text-muted">Configura GEMINI_API_KEY en .env.local para generar con IA.</p>;
  return (
    <form action={action} className="grid gap-4 md:grid-cols-4 md:items-end">
      <Field label="Categoría" htmlFor="g-cat">
        <Select id="g-cat" name="category" defaultValue="all">
          <option value="all">Todas (un lote por categoría)</option>
          {ACTIVITY_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Edad (opcional)" htmlFor="g-age">
        <Select id="g-age" name="ageBand" defaultValue="">
          <option value="">Repartidas de 0 a 12 años</option>
          {AGE_BANDS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Cuántas por lote" htmlFor="g-count">
        <Input id="g-count" name="count" type="number" min={1} max={20} defaultValue={10} />
      </Field>
      <SubmitButton pendingText="Poniendo en cola…">Generar</SubmitButton>
      <div className="md:col-span-4">
        <FormError message={state?.error} />
        {state?.ok && <p className="text-sm text-emerald-600">{state.ok}</p>}
        <p className="text-xs text-muted">Se ejecuta en segundo plano y entra como pendiente de revisar. Consume cuota del día.</p>
      </div>
    </form>
  );
}
