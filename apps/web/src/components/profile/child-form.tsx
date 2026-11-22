'use client';

import { saveChildAction, type ActionState } from '@/app/actions/profile';
import { Field, FormError, Input, PillOption, Select, Textarea } from '@/components/ui/field';
import { CHILD_INTEREST_LABELS, CHILD_INTERESTS, type Child } from '@peque/shared';
import { useActionState } from 'react';
import { SubmitButton } from './submit-button';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function ChildForm({ child, next = '/perfil', submitLabel = 'Guardar' }: { child?: Child; next?: string; submitLabel?: string }) {
  const [state, action] = useActionState<ActionState, FormData>(saveChildAction, undefined);
  const now = new Date();
  const years = Array.from({ length: 18 }, (_, i) => now.getFullYear() - i);
  const [y, m] = child?.birthYearMonth.split('-') ?? [];
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-5">
      {child && <input type="hidden" name="childId" value={child.id} />}
      <input type="hidden" name="next" value={next} />
      <FormError message={state?.error} />

      <Field label="Alias" htmlFor="alias" hint="Un apodo basta: no hace falta su nombre real." error={fe.alias}>
        <Input id="alias" name="alias" maxLength={30} required defaultValue={child?.alias} placeholder="p. ej. Peque, Leo…" />
      </Field>

      <Field label="Mes y año de nacimiento" hint="No pedimos el día: con el mes basta para calcular su edad." error={fe.birthYearMonth}>
        <div className="grid grid-cols-2 gap-3">
          <Select name="birthMonth" aria-label="Mes" required defaultValue={m ? String(Number(m)) : ''}>
            <option value="" disabled>
              Mes
            </option>
            {MONTHS.map((label, i) => (
              <option key={label} value={i + 1}>
                {label}
              </option>
            ))}
          </Select>
          <Select name="birthYear" aria-label="Año" required defaultValue={y ?? ''}>
            <option value="" disabled>
              Año
            </option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
        </div>
      </Field>

      <Field label="¿Qué le gusta?" hint="Hasta 6. Nos ayuda a recomendar planes." error={fe.interests}>
        <div className="flex flex-wrap gap-2">
          {CHILD_INTERESTS.map((i) => (
            <PillOption key={i} name="interests" value={i} defaultChecked={child?.interests.includes(i)}>
              {CHILD_INTEREST_LABELS[i]}
            </PillOption>
          ))}
        </div>
      </Field>

      <Field
        label="Notas (opcional)"
        htmlFor="notes"
        hint={<strong className="font-semibold">No incluyas datos de salud (alergias, diagnósticos…).</strong>}
        error={fe.notes}
      >
        <Textarea id="notes" name="notes" maxLength={280} defaultValue={child?.notes} placeholder="p. ej. prefiere planes tranquilos" />
      </Field>

      <SubmitButton className="self-start">{submitLabel}</SubmitButton>
    </form>
  );
}
