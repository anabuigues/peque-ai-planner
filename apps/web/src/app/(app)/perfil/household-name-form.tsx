'use client';

import { updateHouseholdNameAction, type ActionState } from '@/app/actions/profile';
import { Pencil } from 'lucide-react';
import { useActionState, useState } from 'react';

export function HouseholdNameForm({ name }: { name: string }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, form) => {
    const res = await updateHouseholdNameAction(prev, form);
    if (res?.ok) setEditing(false);
    return res;
  }, undefined);

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="group mt-2 flex items-center gap-3 text-left">
        <span className="text-4xl font-bold tracking-tight">{name}</span>
        <Pencil className="size-5 opacity-60 transition group-hover:opacity-100" aria-label="Cambiar nombre" />
      </button>
    );
  }
  return (
    <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
      <input
        name="name"
        defaultValue={name}
        maxLength={40}
        autoFocus
        aria-label="Nombre del hogar"
        className="h-12 min-w-0 flex-1 rounded-2xl bg-white/20 px-4 text-2xl font-bold text-white outline-none placeholder:text-white/60"
      />
      <button disabled={pending} className="h-10 rounded-full bg-white px-5 text-sm font-semibold text-foreground">
        Guardar
      </button>
      {state?.error && <p className="w-full text-sm text-white">{state.error}</p>}
    </form>
  );
}
