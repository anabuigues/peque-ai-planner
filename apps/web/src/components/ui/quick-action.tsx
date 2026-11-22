import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

/** Botón circular con icono y etiqueta debajo (acciones rápidas de la cabecera). */
export function QuickAction({ icon: Icon, label, href }: { icon: LucideIcon; label: string; href: string }) {
  return (
    <Link href={href} className="group flex flex-col items-center gap-2 text-center sm:w-20">
      <span className="flex size-14 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition group-hover:bg-white/30">
        <Icon className="size-6" aria-hidden />
      </span>
      <span className="text-xs font-medium text-white/90">{label}</span>
    </Link>
  );
}
