'use client';

import { setActiveHouseholdAction } from '@/app/actions/profile';
import { cn } from '@/lib/cn';
import type { HouseholdSummary } from '@peque/shared';
import { Check, ChevronsUpDown, House, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

/** Selector del hogar activo (ADR-0015). */
export function HouseholdSwitcher({ households, activeId }: { households: HouseholdSummary[]; activeId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const active = households.find((h) => h.id === activeId);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn('flex w-full items-center gap-3 rounded-2xl bg-surface px-3 py-2.5 text-left shadow-sm', pending && 'opacity-60')}
      >
        <span className="hero-gradient flex size-9 shrink-0 items-center justify-center rounded-xl text-white">
          <House className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{active?.name}</span>
          <span className="block truncate text-xs text-muted">{active?.areaLabel}</span>
        </span>
        <ChevronsUpDown className="size-4 text-muted" />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 rounded-2xl bg-surface p-1.5 shadow-xl" role="listbox">
          {households.map((h) => (
            <button
              key={h.id}
              type="button"
              role="option"
              aria-selected={h.id === activeId}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-surface-2"
              onClick={() => {
                setOpen(false);
                if (h.id === activeId) return;
                startTransition(async () => {
                  await setActiveHouseholdAction(h.id);
                  router.refresh();
                });
              }}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{h.name}</span>
                <span className="block truncate text-xs text-muted">{h.role === 'owner' ? 'Titular' : 'Miembro'} · {h.areaLabel}</span>
              </span>
              {h.id === activeId && <Check className="size-4 text-primary" />}
            </button>
          ))}
          <Link
            href="/perfil/hogares/nuevo"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-primary hover:bg-surface-2"
          >
            <Plus className="size-4" /> Crear otro hogar
          </Link>
        </div>
      )}
    </div>
  );
}
