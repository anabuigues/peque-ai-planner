'use client';

import { Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';

// El tema vive en la clase .dark de <html>; nos suscribimos a sus cambios.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}
const isDark = () => document.documentElement.classList.contains('dark');

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  return (
    <button
      type="button"
      aria-label={dark ? 'Usar modo claro' : 'Usar modo oscuro'}
      title={dark ? 'Modo claro' : 'Modo oscuro'}
      className="flex size-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-foreground"
      onClick={() => {
        const next = !dark;
        document.documentElement.classList.toggle('dark', next);
        localStorage.setItem('theme', next ? 'dark' : 'light');
      }}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
