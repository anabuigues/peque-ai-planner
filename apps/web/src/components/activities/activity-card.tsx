import { Badge } from '@/components/ui/chip';
import { TONES } from '@/components/ui/tone';
import { cn } from '@/lib/cn';
import type { Activity } from '@peque/shared';
import { Clock } from 'lucide-react';
import Link from 'next/link';
import { categoryStyle, formatAgeRange } from './category-style';
import { SaveButton } from './save-button';

export function ActivityCard({ activity: a, saved }: { activity: Activity; saved: boolean }) {
  const { icon: Icon, tone, label } = categoryStyle(a.categories[0]);
  const source = a.origin === 'web' ? a.attributions[0]?.sourceName : a.origin.startsWith('ai') ? 'IA' : null;
  return (
    <Link href={`/actividades/${a.id}`} className="group flex gap-4 rounded-[var(--radius-card)] bg-surface p-4 shadow-sm shadow-black/[0.03] transition hover:shadow-md">
      <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-full', TONES[tone])}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="font-semibold leading-snug group-hover:text-primary">{a.title}</span>
          <SaveButton activityId={a.id} saved={saved} />
        </span>
        <span className="mt-1 line-clamp-2 text-sm text-muted">{a.summary}</span>
        <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
          <Badge tone={tone}>{label}</Badge>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" /> {a.durationMinutes} min
          </span>
          <span>{formatAgeRange(a.age.minMonths, a.age.maxMonths)}</span>
          {a.specialMaterials && <Badge>Material especial</Badge>}
          {source && <span>· {source === 'IA' ? 'Sugerida por IA' : `De ${source}`}</span>}
        </span>
      </span>
    </Link>
  );
}
