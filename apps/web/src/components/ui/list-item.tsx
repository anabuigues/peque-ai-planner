import { cn } from '@/lib/cn';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { TONES, type Tone } from './tone';

/** Fila tipo "movimiento de cuenta": icono circular, título, subtítulo y valor a la derecha. */
export function ListItem({
  icon: Icon,
  tone = 'gray',
  title,
  subtitle,
  value,
  valueHint,
  href,
}: {
  icon: LucideIcon;
  tone?: Tone;
  title: string;
  subtitle?: string;
  value?: string;
  valueHint?: string;
  href?: string;
}) {
  const content = (
    <>
      <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-full', TONES[tone])}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 font-medium leading-snug">{title}</span>
        {subtitle && <span className="block truncate text-sm text-muted">{subtitle}</span>}
      </span>
      {(value || valueHint) && (
        <span className="text-right">
          {value && <span className="block font-semibold">{value}</span>}
          {valueHint && <span className="block text-xs text-muted">{valueHint}</span>}
        </span>
      )}
    </>
  );
  const classes = 'flex items-center gap-4 rounded-2xl px-2 py-2.5 transition hover:bg-surface-2';
  return href ? (
    <Link href={href} className={classes}>
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  );
}
