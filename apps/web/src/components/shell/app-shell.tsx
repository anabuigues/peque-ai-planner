import { Avatar } from '@/components/ui/avatar';
import type { SessionUser } from '@/server/session';
import { Logo } from './logo';
import { MobileMenu } from './mobile-menu';
import { NavLinks } from './nav-links';
import { SignOutButton } from './sign-out-button';
import { ThemeToggle } from './theme-toggle';

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:flex">
      {/* Escritorio: barra lateral fija */}
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col justify-between px-4 py-6 lg:flex">
        <div className="flex flex-col gap-8">
          <div className="px-2">
            <Logo />
          </div>
          <NavLinks isAdmin={user.isAdmin} />
        </div>
        <div className="flex items-center gap-2 rounded-full bg-surface p-1.5 pr-2">
          <Avatar name={user.name} src={user.picture} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.isAdmin ? 'Administradora' : user.email}</p>
          </div>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </aside>

      {/* Móvil: barra superior */}
      <header className="relative flex items-center justify-between px-4 py-3 lg:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <SignOutButton />
          <MobileMenu isAdmin={user.isAdmin} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1080px] flex-1 px-4 pb-16 pt-2 lg:px-8 lg:pt-6">{children}</main>
    </div>
  );
}
