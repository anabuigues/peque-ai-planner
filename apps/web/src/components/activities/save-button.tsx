'use client';

import { toggleSavedAction } from '@/app/actions/activities';
import { cn } from '@/lib/cn';
import { Bookmark } from 'lucide-react';
import { useOptimistic, useTransition } from 'react';

export function SaveButton({ activityId, saved, withLabel = false }: { activityId: string; saved: boolean; withLabel?: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={optimistic}
      aria-label={optimistic ? 'Quitar de guardadas' : 'Guardar'}
      onClick={(e) => {
        e.preventDefault();
        start(async () => {
          setOptimistic(!optimistic);
          await toggleSavedAction(activityId, !optimistic);
        });
      }}
      className={cn(
        'inline-flex shrink-0 items-center gap-2 rounded-full transition',
        withLabel ? 'h-11 bg-surface-2 px-5 text-sm font-semibold hover:bg-border' : 'size-10 justify-center hover:bg-surface-2',
        optimistic && 'text-primary',
      )}
    >
      <Bookmark className={cn('size-5', optimistic && 'fill-current')} />
      {withLabel && (optimistic ? 'Guardada' : 'Guardar')}
    </button>
  );
}
