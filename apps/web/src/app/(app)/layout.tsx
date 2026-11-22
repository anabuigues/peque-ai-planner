import { AppShell } from '@/components/shell/app-shell';
import { requireAppContext } from '@/server/context';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, households, household } = await requireAppContext();
  return (
    <AppShell user={user} households={households} activeHouseholdId={household.id}>
      {children}
    </AppShell>
  );
}
