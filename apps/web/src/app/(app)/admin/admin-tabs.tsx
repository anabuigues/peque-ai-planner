'use client';

import { cn } from '@/lib/cn';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/admin', label: 'Resumen' },
  { href: '/admin/fuentes', label: 'Fuentes' },
  { href: '/admin/actividades', label: 'Actividades' },
];

export function AdminTabs() {
  const path = usePathname();
  return (
    <nav className="inline-flex w-fit rounded-full bg-surface p-1 shadow-sm" aria-label="Administración">
      {TABS.map((t) => {
        const active = t.href === '/admin' ? path === '/admin' : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={cn('rounded-full px-4 py-1.5 text-sm font-medium', active ? 'bg-foreground text-background' : 'text-muted hover:text-foreground')}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
