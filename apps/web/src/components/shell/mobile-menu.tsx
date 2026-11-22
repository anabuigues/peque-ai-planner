'use client';

import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { NavLinks } from './nav-links';

export function MobileMenu({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={open}
        className="flex size-10 items-center justify-center rounded-full bg-surface"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open && (
        <div className="absolute inset-x-4 top-16 z-20 rounded-[var(--radius-card)] bg-background p-3 shadow-xl">
          <NavLinks isAdmin={isAdmin} onNavigate={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
