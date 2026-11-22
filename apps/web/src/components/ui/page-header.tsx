import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export function PageHeader({ title, back, description }: { title: string; back?: string; description?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-2">
      {back && (
        <Link href={back} className="flex w-fit items-center gap-1 text-sm font-semibold text-muted hover:text-foreground">
          <ChevronLeft className="size-4" /> Volver
        </Link>
      )}
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {description && <p className="max-w-xl text-muted">{description}</p>}
    </div>
  );
}
