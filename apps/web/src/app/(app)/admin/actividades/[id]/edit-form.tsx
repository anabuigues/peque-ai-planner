'use client';

import { updateActivityAction, type AdminState } from '@/app/actions/admin-catalog';
import { SubmitButton } from '@/components/profile/submit-button';
import { Button } from '@/components/ui/button';
import { Field, FormError, Input, PillOption, Textarea } from '@/components/ui/field';
import { ACTIVITY_CATEGORIES, type Activity } from '@peque/shared';
import { useActionState } from 'react';

export function EditActivityForm({ activity: a }: { activity: Activity }) {
  const [state, action] = useActionState<AdminState, FormData>(updateActivityAction, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={a.id} />
      <FormError message={state?.error} />
      {state?.ok && <p className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">{state.ok}</p>}
      <Field label="Título" htmlFor="e-title" error={fe.title}>
        <Input id="e-title" name="title" defaultValue={a.title} required />
      </Field>
      <Field label="Resumen" htmlFor="e-summary" error={fe.summary}>
        <Textarea id="e-summary" name="summary" defaultValue={a.summary} required />
      </Field>
      <Field label="Categorías (1 o 2)" error={fe.categories}>
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_CATEGORIES.map((c) => (
            <PillOption key={c.id} name="categories" value={c.id} defaultChecked={a.categories.includes(c.id)}>
              {c.label}
            </PillOption>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Edad mínima (meses)" htmlFor="e-min" error={fe['age.minMonths']}>
          <Input id="e-min" name="minMonths" type="number" min={0} max={216} defaultValue={a.age.minMonths} />
        </Field>
        <Field label="Edad máxima (meses)" htmlFor="e-max" error={fe['age.maxMonths'] ?? fe.age}>
          <Input id="e-max" name="maxMonths" type="number" min={0} max={216} defaultValue={a.age.maxMonths} />
        </Field>
        <Field label="Duración (min)" htmlFor="e-dur" error={fe.durationMinutes}>
          <Input id="e-dur" name="durationMinutes" type="number" min={5} max={240} defaultValue={a.durationMinutes} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="specialMaterials" defaultChecked={a.specialMaterials} className="size-4" /> Requiere material especial
      </label>
      <Field label="Materiales (uno por línea)" htmlFor="e-mat">
        <Textarea id="e-mat" name="materials" defaultValue={a.materials.join('\n')} />
      </Field>
      <Field label="Pasos (uno por línea, en orden)" htmlFor="e-steps" error={fe.steps}>
        <Textarea id="e-steps" name="steps" className="min-h-40" defaultValue={a.steps.map((s) => s.text).join('\n')} />
      </Field>
      <Field label="Consejos (uno por línea)" htmlFor="e-tips">
        <Textarea id="e-tips" name="tips" defaultValue={a.tips.join('\n')} />
      </Field>
      <Field label="Vídeos o páginas (una URL por línea)" htmlFor="e-res" hint="Se comprueba que existan al guardar.">
        <Textarea id="e-res" name="resources" defaultValue={a.resources.map((r) => r.url).join('\n')} />
      </Field>
      <Field label="Búsqueda de YouTube" htmlFor="e-yt">
        <Input id="e-yt" name="youtubeSearchQuery" defaultValue={a.youtubeSearchQuery} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <SubmitButton>Guardar</SubmitButton>
        {a.status !== 'published' && (
          <Button type="submit" variant="secondary" name="publish" value="published">
            Guardar y publicar
          </Button>
        )}
        {a.status !== 'archived' && (
          <Button type="submit" variant="ghost" className="text-red-600" name="publish" value="archived">
            Descartar
          </Button>
        )}
      </div>
    </form>
  );
}
