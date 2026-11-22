'use client';

import { bulkStatusAction, type AdminState } from '@/app/actions/admin-catalog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { useActionState, useState } from 'react';

interface Item {
  id: string;
  title: string;
  summary: string;
  meta: string;
}

export function BulkReview({ tab, items }: { tab: string; items: Item[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [state, action, pending] = useActionState<AdminState, FormData>(async (prev, form) => {
    const r = await bulkStatusAction(prev, form);
    if (r?.ok) setSelected(new Set());
    return r;
  }, undefined);
  const all = items.length > 0 && selected.size === items.length;
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <form action={action} className="flex flex-col gap-3">
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="ids" value={id} />
      ))}
      <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-full bg-surface p-2 shadow-sm">
        <label className="flex items-center gap-2 px-3 text-sm">
          <input type="checkbox" checked={all} onChange={() => setSelected(all ? new Set() : new Set(items.map((i) => i.id)))} className="size-4" />
          {selected.size ? `${selected.size} seleccionadas` : `${items.length} actividades`}
        </label>
        <div className="flex-1" />
        {tab !== 'publicadas' && (
          <Button size="sm" name="status" value="published" disabled={!selected.size || pending}>
            Publicar
          </Button>
        )}
        {tab === 'publicadas' && (
          <Button size="sm" variant="secondary" name="status" value="draft" disabled={!selected.size || pending}>
            Despublicar
          </Button>
        )}
        {tab !== 'descartadas' && (
          <Button size="sm" variant="ghost" className="text-red-600" name="status" value="archived" disabled={!selected.size || pending}>
            Descartar
          </Button>
        )}
        {tab === 'descartadas' && (
          <Button size="sm" variant="secondary" name="status" value="draft" disabled={!selected.size || pending}>
            Recuperar
          </Button>
        )}
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-600">{state.ok}</p>}
      <Card className="flex flex-col divide-y divide-border p-2">
        {items.length === 0 && <p className="p-4 text-sm text-muted">No hay actividades aquí.</p>}
        {items.map((i) => (
          <div key={i.id} className="flex items-start gap-3 p-3">
            <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} className="mt-1 size-4" aria-label={`Seleccionar ${i.title}`} />
            <div className="min-w-0 flex-1">
              <Link href={`/admin/actividades/${i.id}`} className="font-semibold hover:text-primary">
                {i.title}
              </Link>
              <p className="line-clamp-2 text-sm text-muted">{i.summary}</p>
              <p className="mt-1 text-xs text-muted">{i.meta}</p>
            </div>
          </div>
        ))}
      </Card>
    </form>
  );
}
