import { cn } from '@/lib/cn';
import { TONES, type Tone } from './tone';

export function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition',
        active ? 'bg-foreground text-background' : 'bg-surface text-foreground hover:bg-surface-2',
      )}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone = 'gray' }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', TONES[tone])}>
      {children}
    </span>
  );
}
