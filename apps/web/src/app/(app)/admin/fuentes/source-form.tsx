'use client';

import { createSourceAction, type AdminState } from '@/app/actions/admin-catalog';
import { SubmitButton } from '@/components/profile/submit-button';
import { Field, FormError, Input, Select, Textarea } from '@/components/ui/field';
import { useActionState, useState } from 'react';

export function SourceForm() {
  const [state, action] = useActionState<AdminState, FormData>(createSourceAction, undefined);
  const [kind, setKind] = useState('rss');
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <FormError message={state?.error} />
        {state?.ok && <p className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">{state.ok}</p>}
      </div>
      <Field label="Nombre" htmlFor="s-name" error={fe.name}>
        <Input id="s-name" name="name" required placeholder="p. ej. Blog Montessori en casa" />
      </Field>
      <Field label="Web" htmlFor="s-home" error={fe.homepage}>
        <Input id="s-home" name="homepage" type="url" required placeholder="https://…" />
      </Field>
      <Field label="Cómo descubrir sus páginas" htmlFor="s-kind">
        <Select id="s-kind" name="discoveryKind" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="rss">RSS (feed del blog)</option>
          <option value="sitemap">Sitemap (mapa del sitio)</option>
          <option value="urls">Lista de URLs</option>
        </Select>
      </Field>
      {kind === 'urls' ? (
        <Field label="URLs (una por línea)" htmlFor="s-urls" error={fe.urls}>
          <Textarea id="s-urls" name="urls" placeholder={'https://…/actividad-1\nhttps://…/actividad-2'} />
        </Field>
      ) : (
        <Field label={kind === 'rss' ? 'URL del RSS' : 'URL del sitemap'} htmlFor="s-durl" error={fe.discoveryUrl} hint={kind === 'rss' ? 'Suele ser /feed o /rss' : 'Suele ser /sitemap.xml'}>
          <Input id="s-durl" name="discoveryUrl" type="url" placeholder="https://…/feed" />
        </Field>
      )}
      <Field label="Filtro de ruta (opcional)" htmlFor="s-path" hint="Solo páginas cuya ruta empiece así, p. ej. /actividades/">
        <Input id="s-path" name="pathFilter" placeholder="/actividades/" />
      </Field>
      <Field label="Nota sobre condiciones de uso (opcional)" htmlFor="s-terms">
        <Input id="s-terms" name="termsNote" placeholder="p. ej. Permite citar con enlace" />
      </Field>
      <div className="md:col-span-2">
        <SubmitButton pendingText="Comprobando robots.txt…">Añadir fuente</SubmitButton>
      </div>
    </form>
  );
}
