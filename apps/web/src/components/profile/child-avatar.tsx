import { TONES, type Tone } from '@/components/ui/tone';
import { cn } from '@/lib/cn';

export function ChildAvatar({ alias, color, className }: { alias: string; color: string; className?: string }) {
  return (
    <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-full text-base font-bold', TONES[(color as Tone) ?? 'gray'] ?? TONES.gray, className)} aria-hidden>
      {alias.trim()[0]?.toUpperCase() ?? '·'}
    </span>
  );
}
