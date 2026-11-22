import { cn } from '@/lib/cn';

export function Avatar({ name, src, className }: { name: string; src?: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={cn('size-9 rounded-full object-cover', className)} />
  ) : (
    <span
      className={cn(
        'flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground',
        className,
      )}
      aria-hidden
    >
      {initials || '·'}
    </span>
  );
}
